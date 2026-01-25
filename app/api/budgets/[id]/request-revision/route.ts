import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const revisionRequestSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()
    const validatedData = revisionRequestSchema.parse(body)

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      )
    }

    if (budget.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Cannot request revision for budget in current status' },
        { status: 400 }
      )
    }

    // Persist revision record
    const revision = await prisma.budgetRevision.create({
      data: {
        budgetId: id,
        userId: session.user.id,
        notes: validatedData.reason,
        changes: { reason: validatedData.reason },
        status: 'PENDING',
      }
    })

    // Update budget status to indicate revision requested
    await prisma.budget.update({
      where: { id },
      data: {
        status: 'REVISION_REQUESTED',
        updatedAt: new Date(),
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BUDGET_REVISION_REQUESTED',
        entity: 'BUDGET',
        entityId: budget.id,
        userId: session.user.id,
        changes: {
          reason: validatedData.reason,
        }
      }
    })

    // Send notification to user
    await prisma.notification.create({
      data: {
        userId: budget.createdBy,
        title: 'Revision Requested',
        message: `Revision requested for your budget "${budget.title}". Reason: ${validatedData.reason}`,
        type: 'BUDGET_REVISION_REQUESTED',
        read: false,
        data: {
          reason: validatedData.reason,
          requestedBy: session.user.name,
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Revision requested successfully',
      revision,
    })
  } catch (error: any) {
    console.error('Revision request error:', error)
    
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