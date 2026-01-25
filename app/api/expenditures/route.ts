import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendNotification, notifyAdmins } from '@/lib/notifications'

const createExpenditureSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  amount: z.number().optional(),
  priority: z.enum(['EMERGENCY', 'URGENT', 'NORMAL', 'LONG_TERM']).optional(),
  budgetId: z.string().min(1, 'Budget is required'),
  items: z.array(
    z.object({
      budgetItemId: z.string().min(1),
      spentAmount: z.number().min(0, 'Amount must be >= 0'),
    })
  ).min(1, 'At least one item is required'),
  requestSupplementary: z.boolean().optional(),
  supplementaryReason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createExpenditureSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      const budget = await tx.budget.findUnique({ where: { id: validatedData.budgetId }, include: { items: true } })
      if (!budget) throw new Error('Budget not found')

      if (budget.createdBy !== session.user.id) throw new Error('You can only link expenditures to your own budgets')

      // ensure items belong to budget
      const budgetItemIds = new Set(budget.items.map(i => i.id))
      for (const it of validatedData.items) {
        if (!budgetItemIds.has(it.budgetItemId)) throw new Error('Invalid budget item')
      }

      const totalAmount = Math.round(validatedData.amount ?? validatedData.items.reduce((s, it) => s + it.spentAmount, 0))

      const expenditure = await tx.expenditure.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          amount: totalAmount,
          priority: validatedData.priority ?? 'NORMAL',
          budgetId: validatedData.budgetId,
          createdBy: session.user.id,
          status: 'PENDING',
        }
      })

      // create expenditure items linking to budget items
      for (const it of validatedData.items) {
        const b = budget.items.find(bi => bi.id === it.budgetItemId)
        await tx.expenditureItem.create({
          data: {
            expenditureId: expenditure.id,
            name: b?.name ?? 'Item',
            amount: Math.round(it.spentAmount),
          }
        })
      }

      // create supplementary request if asked and there are overages
      if (validatedData.requestSupplementary) {
        const overages = validatedData.items.map(it => {
          const b = budget.items.find(bi => bi.id === it.budgetItemId)
          if (!b) return 0
          return Math.max(0, it.spentAmount - b.unitPrice)
        }).reduce((s, v) => s + v, 0)

        if (overages > 0) {
          await tx.supplementaryBudget.create({
            data: {
              budgetId: validatedData.budgetId,
              reason: validatedData.supplementaryReason || 'Supplementary request',
              createdBy: session.user.id,
              amount: overages,
              status: 'PENDING',
            }
          })
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'EXPENDITURE_CREATED',
          entity: 'EXPENDITURE',
          entityId: expenditure.id,
          userId: session.user.id,
          changes: {
            title: expenditure.title,
            amount: expenditure.amount,
            priority: expenditure.priority,
            budgetId: expenditure.budgetId,
          }
        }
      })

      return expenditure
    })

    // Send notification to admins about new expenditure
    await notifyAdmins(
      'New Expenditure Submitted',
      `A new expenditure "${result.title}" has been submitted for review.`,
      'expenditure_submitted',
      {
        expenditureId: result.id,
        amount: result.amount,
        createdBy: session.user.id
      }
    )

    return NextResponse.json({ success: true, message: 'Expenditure created successfully', expenditure: result }, { status: 201 })
  } catch (error: any) {
    console.error('Expenditure creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const budgetId = searchParams.get('budgetId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}

    // Role-based filtering
    if (session.user.role !== 'ADMIN') {
      where.createdBy = session.user.id
    }

    // Filters
    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (budgetId) {
      where.budgetId = budgetId
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [expenditures, total] = await Promise.all([
      prisma.expenditure.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
            }
          },
          budget: {
            select: {
              id: true,
              title: true,
              amount: true,
            }
          },
          items: {
            orderBy: { amount: 'desc' }
          },
          _count: {
            select: {
              items: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expenditure.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: expenditures,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Expenditure fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}