import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNotification, notifyAdmins } from '@/lib/notifications'

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
    const { allocatedAmount, notes, disbursementType, batchCount } = body

    // Get budget
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

    // Update budget
    const updatedBudget = await prisma.budget.update({
      where: { id },
      data: {
        status: 'APPROVED',
        allocatedAmount: allocatedAmount || budget.amount,
        approvedById: session.user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
        disbursementType: disbursementType || budget.disbursementType || 'FULL',
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BUDGET_APPROVED',
        entity: 'BUDGET',
        entityId: budget.id,
        userId: session.user.id,
        changes: {
          from: budget.status,
          to: 'APPROVED',
          allocatedAmount,
          approvedBy: session.user.id,
          notes,
        }
      }
    })

    // Send notification to user
    await sendNotification({
      userId: budget.createdBy,
      title: 'Budget Approved',
      message: `Your budget "${budget.title}" has been approved.`,
      type: 'budget_approved',
      data: {
        budgetId: id,
        allocatedAmount,
        approvedBy: session.user.id
      }
    })

    // Deduct from fund pool (require sufficient funds)
    const poolSetting = await prisma.systemSetting.findUnique({ where: { key: 'fund_pool_balance' } })
    const poolCurrent = poolSetting ? parseInt(poolSetting.value || '0', 10) : 0
    const deduction = updatedBudget.allocatedAmount || updatedBudget.amount || 0

    if (poolCurrent < deduction) {
      return NextResponse.json({ error: 'Insufficient funds in pool' }, { status: 400 })
    }

    const newPool = poolCurrent - deduction
    await prisma.systemSetting.upsert({
      where: { key: 'fund_pool_balance' },
      create: {
        key: 'fund_pool_balance',
        value: String(newPool),
        description: 'Common fund pool balance',
        category: 'finance',
        updatedBy: session.user.id,
      },
      update: {
        value: String(newPool),
        updatedBy: session.user.id,
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'FUND_POOL_DEDUCT',
        entity: 'FUND_POOL',
        entityId: 'fund_pool',
        userId: session.user.id,
        changes: { from: poolCurrent, deduction, to: newPool, budgetId: id },
      }
    })

    // If admin selected BATCHES during approval, create batches
    if ((disbursementType === 'BATCHES' || updatedBudget.disbursementType === 'BATCHES') && batchCount) {
      // Remove any existing batches for this budget
      await prisma.batch.deleteMany({ where: { budgetId: id } })

      const batchAmount = Math.floor((updatedBudget.amount) / batchCount)
      const batches = Array.from({ length: batchCount }, (_, i) => ({
        budgetId: id,
        amount: i === batchCount - 1 ? updatedBudget.amount - (batchAmount * (batchCount - 1)) : batchAmount,
        status: 'PENDING',
      }))

      await prisma.batch.createMany({ data: batches })
    }

    return NextResponse.json({
      success: true,
      message: 'Budget approved successfully',
      budget: updatedBudget,
    })
  } catch (error: any) {
    console.error('Budget approval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}