import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createBudgetSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  priority: z.enum(['EMERGENCY', 'URGENT', 'NORMAL', 'LONG_TERM']),
  disbursementType: z.enum(['FULL', 'BATCHES']),
  batchCount: z.number().min(1).max(12).optional(),
  expenditureIds: z.array(z.string()).optional(),
  items: z.array(z.object({
    name: z.string().min(1),
    unitPrice: z.number().nonnegative(),
    quantity: z.number().min(1).optional().default(1),
  })).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createBudgetSchema.parse(body)

    // Check if user has pending budgets limit
    const pendingBudgetsCount = await prisma.budget.count({
      where: {
        createdBy: session.user.id,
        status: 'PENDING'
      }
    })

    if (pendingBudgetsCount >= 5) {
      return NextResponse.json(
        { error: 'You have reached the limit of 5 pending budgets' },
        { status: 400 }
      )
    }

    // Create budget
    const budget = await prisma.budget.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        amount: validatedData.amount,
        priority: validatedData.priority,
        disbursementType: validatedData.disbursementType,
        createdBy: session.user.id,
        status: 'PENDING',
      }
    })

    // Create budget items if provided
    if (validatedData.items && validatedData.items.length > 0) {
      const itemsToCreate = validatedData.items.map(it => ({
        budgetId: budget.id,
        name: it.name,
        unitPrice: Math.round(it.unitPrice),
        quantity: it.quantity || 1,
        createdBy: session.user.id,
      }))

      await prisma.budgetItem.createMany({
        data: itemsToCreate,
      })
    }

    // Create batches if disbursement is in batches
    if (validatedData.disbursementType === 'BATCHES' && validatedData.batchCount) {
      const batchAmount = validatedData.amount / validatedData.batchCount

      const batches = Array.from({ length: validatedData.batchCount! }, (_, i) => ({
        budgetId: budget.id,
        amount: i === validatedData.batchCount! - 1 
          ? validatedData.amount - (batchAmount * (validatedData.batchCount! - 1))
          : batchAmount,
        status: 'PENDING',
      }))

      await prisma.batch.createMany({
        data: batches,
      })
    }

    // Link expenditures if provided
    if (validatedData.expenditureIds && validatedData.expenditureIds.length > 0) {
      await prisma.expenditure.updateMany({
        where: {
          id: { in: validatedData.expenditureIds },
          createdBy: session.user.id,
        },
        data: {
          budgetId: budget.id,
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BUDGET_CREATED',
        entity: 'BUDGET',
        entityId: budget.id,
        userId: session.user.id,
        changes: {
          title: budget.title,
          amount: budget.amount,
          priority: budget.priority,
          status: budget.status,
        }
      }
    })

    return NextResponse.json(
      { 
        success: true, 
        message: 'Budget created successfully',
        budget 
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Budget creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
    const search = searchParams.get('search')
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}

    // Role-based filtering
    if (session.user.role !== 'ADMIN') {
      where.createdBy = session.user.id
    } else if (userId) {
      where.createdBy = userId
    }

    // Filters
    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [budgets, total] = await Promise.all([
      prisma.budget.findMany({
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
          batches: {
            orderBy: { createdAt: 'asc' }
          },
          items: {
            orderBy: { createdAt: 'asc' },
            take: 3,
          },
          expenditures: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              expenditures: true,
              batches: true,
              items: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.budget.count({ where }),
    ])

    // Calculate statistics for admin
    let statistics = null
    if (session.user.role === 'ADMIN') {
      const [totalAmount, allocatedAmount, pendingCount] = await Promise.all([
        prisma.budget.aggregate({
          _sum: { amount: true }
        }),
        prisma.budget.aggregate({
          _sum: { allocatedAmount: true }
        }),
        prisma.budget.count({
          where: { status: 'PENDING' }
        })
      ])

      statistics = {
        totalAmount: totalAmount._sum.amount || 0,
        allocatedAmount: allocatedAmount._sum.allocatedAmount || 0,
        pendingCount,
      }
    }

    return NextResponse.json({
      success: true,
      data: budgets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      statistics,
    })
  } catch (error: any) {
    console.error('Budget fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}