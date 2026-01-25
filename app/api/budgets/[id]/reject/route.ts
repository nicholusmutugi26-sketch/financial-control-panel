import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'

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
    const { reason } = body

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
        { error: 'Budget is not in pending status' },
        { status: 400 }
      )
    }

    const updatedBudget = await prisma.budget.update({
      where: { id },
      data: {
        status: 'REJECTED',
        updatedAt: new Date(),
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BUDGET_REJECTED',
        entity: 'BUDGET',
        entityId: budget.id,
        userId: session.user.id,
        changes: {
          from: budget.status,
          to: 'REJECTED',
          reason,
          rejectedBy: session.user.id,
        }
      }
    })

    // Send notification to user
    await sendNotification({
      userId: budget.createdBy,
      title: 'Budget Rejected',
      message: `Your budget "${budget.title}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'budget_rejected',
      data: {
        reason,
        rejectedBy: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Budget rejected successfully',
      budget: updatedBudget,
    })
  } catch (error: any) {
    console.error('Budget rejection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}