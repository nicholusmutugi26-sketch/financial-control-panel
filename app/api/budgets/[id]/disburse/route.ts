import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getIO } from '@/lib/realtime'
import { z } from 'zod'

const disburseSchema = z.object({
  type: z.enum(['FULL', 'PARTIAL']),
  amount: z.number().positive('Amount must be positive'),
  disbursementMethod: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER']),
  notes: z.string().optional(),
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
    const validatedData = disburseSchema.parse(body)

    // Get budget with all disbursement info
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        transactions: {
          where: { status: 'COMPLETED' },
          select: { amount: true }
        }
      }
    })

    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      )
    }

    // Check budget is approved
    if (budget.status !== 'APPROVED' && budget.status !== 'PARTIALLY_DISBURSED') {
      return NextResponse.json(
        { error: 'Budget must be approved before disbursement' },
        { status: 400 }
      )
    }

    // Calculate totals
    const allocatedAmount = budget.allocatedAmount ?? 0
    const completedTransactions = budget.transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const remainingToDisburst = allocatedAmount - completedTransactions

    // Validate amount against remaining allocated balance
    if (validatedData.amount > remainingToDisburst) {
      return NextResponse.json(
        { error: `Amount exceeds remaining allocated balance. Available: ${remainingToDisburst}` },
        { status: 400 }
      )
    }

    // Create transaction record for this disbursement
    const transaction = await prisma.transaction.create({
      data: {
        userId: budget.createdBy,
        budgetId: id,
        amount: validatedData.amount,
        type: 'DISBURSEMENT',
        status: 'COMPLETED',
        paymentMethod: validatedData.disbursementMethod,
        reference: `DISB-${Date.now()}`,
        metadata: {
          disbursementType: validatedData.type,
          notes: validatedData.notes || '',
          disbursedBy: session.user.id,
        },
      }
    })

    // Calculate new budget status
    const newCompletedTransactions = completedTransactions + validatedData.amount
    const newStatus = newCompletedTransactions >= allocatedAmount ? 'DISBURSED' : 'PARTIALLY_DISBURSED'

    // Update budget status
    const updatedBudget = await prisma.budget.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BUDGET_DISBURSED',
        entity: 'Budget',
        entityId: budget.id,
        userId: session.user.id,
        changes: {
          amount: validatedData.amount,
          type: validatedData.type,
          method: validatedData.disbursementMethod,
          notes: validatedData.notes,
          newStatus: newStatus,
          completedTransactions: newCompletedTransactions,
          allocatedAmount: allocatedAmount,
        }
      }
    })

    // Send notification to budget creator
    await prisma.notification.create({
      data: {
        userId: budget.createdBy,
        title: `Budget Disbursement - ${validatedData.type === 'FULL' ? 'Full' : 'Partial'}`,
        message: `KES ${validatedData.amount.toLocaleString()} has been ${newStatus === 'DISBURSED' ? 'fully' : 'partially'} disbursed for budget "${budget.title}"`,
        type: 'BUDGET_DISBURSED',
        read: false,
        data: {
          budgetId: id,
          transactionId: transaction.id,
          amount: validatedData.amount,
          method: validatedData.disbursementMethod,
        }
      }
    })

    // Emit real-time notification (optional - socket may not be initialized)
    try {
      getIO().to(`user-${budget.createdBy}`).emit('budget-disbursed', {
        budgetId: id,
        budgetTitle: budget.title,
        amount: validatedData.amount,
        method: validatedData.disbursementMethod,
        newStatus: newStatus,
        timestamp: new Date(),
      })
    } catch (socketError) {
      console.log('Socket notification not sent (Socket.io not initialized)')
    }

    return NextResponse.json({
      success: true,
      message: `Budget ${validatedData.type === 'FULL' ? 'fully' : 'partially'} disbursed successfully`,
      transaction,
      budget: updatedBudget,
    })
  } catch (error: any) {
    console.error('Disbursement error:', error)
    
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
