import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createItemSchema = z.object({
  expenditureId: z.string(),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
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
    const validatedData = createItemSchema.parse(body)

    // Check if expenditure exists and belongs to user
    const expenditure = await prisma.expenditure.findUnique({
      where: { id: validatedData.expenditureId }
    })

    if (!expenditure) {
      return NextResponse.json(
        { error: 'Expenditure not found' },
        { status: 404 }
      )
    }

    if (session.user.role !== 'ADMIN' && expenditure.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Only allow adding items to certain statuses
    if (!['DRAFT', 'PENDING'].includes(expenditure.status ?? '')) {
      return NextResponse.json(
        { error: 'Cannot add items to expenditure in current status' },
        { status: 400 }
      )
    }

    // Create item
    const item = await prisma.expenditureItem.create({
      data: {
        expenditureId: validatedData.expenditureId,
        name: validatedData.name,
        description: validatedData.description,
        amount: validatedData.amount,
      }
    })

    // Update expenditure total amount
    const totalAmount = await prisma.expenditureItem.aggregate({
      where: { expenditureId: validatedData.expenditureId },
      _sum: { amount: true }
    })

    await prisma.expenditure.update({
      where: { id: validatedData.expenditureId },
      data: {
        amount: totalAmount._sum.amount || 0,
        updatedAt: new Date(),
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EXPENDITURE_ITEM_ADDED',
        entity: 'EXPENDITURE_ITEM',
        entityId: item.id,
        userId: session.user.id,
        changes: {
          name: item.name,
          amount: item.amount,
          expenditureId: item.expenditureId,
        }
      }
    })

    return NextResponse.json(
      { 
        success: true, 
        message: 'Item added successfully',
        item 
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Item creation error:', error)
    
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