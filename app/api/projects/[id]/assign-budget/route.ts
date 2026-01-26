import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getIO } from '@/lib/realtime'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { budgetAmount, budgetTitle } = await req.json()

    if (!budgetAmount || budgetAmount <= 0) {
      return NextResponse.json(
        { error: 'Budget amount must be greater than 0' },
        { status: 400 }
      )
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { user: true, budget: true }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if project is approved
    if (project.status !== 'APPROVED' && project.adminDecision !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Project must be approved before assigning budget' },
        { status: 400 }
      )
    }

    // Get current fund pool balance
    const fundPoolSetting = await prisma.systemSetting.findFirst({
      where: { key: 'fund_pool_balance' }
    })

    const currentBalance = fundPoolSetting ? parseFloat(fundPoolSetting.value) : 0

    if (currentBalance < budgetAmount) {
      return NextResponse.json(
        { error: `Insufficient fund pool balance. Available: KES ${currentBalance.toLocaleString()}` },
        { status: 400 }
      )
    }

    let budget = project.budget

    if (budget) {
      // Update existing budget
      budget = await prisma.budget.update({
        where: { id: budget.id },
        data: {
          amount: budgetAmount,
          title: budgetTitle || budget.title,
          status: 'ALLOCATED',
        }
      })
    } else {
      // Create new budget for the project
      budget = await prisma.budget.create({
        data: {
          title: budgetTitle || `${project.title} Budget`,
          description: `Budget allocated for project: ${project.title}`,
          amount: budgetAmount,
          allocatedAmount: 0,
          status: 'ALLOCATED',
          createdBy: project.createdBy,
          Project: {
            connect: { id: project.id }
          }
        },
        include: { user: true }
      })
    }

    // Deduct from fund pool
    const newBalance = currentBalance - budgetAmount
    await prisma.systemSetting.upsert({
      where: { key: 'fund_pool_balance' },
      create: {
        key: 'fund_pool_balance',
        value: newBalance.toString(),
        category: 'FUND_POOL',
        updatedBy: session.user.id,
      },
      update: {
        value: newBalance.toString(),
        updatedBy: session.user.id,
      }
    })

    // Update project status to STARTED if not already
    if (project.status !== 'STARTED' && project.status !== 'PROGRESSING' && project.status !== 'COMPLETED') {
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'STARTED' }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BUDGET_ASSIGNED',
        entity: 'Project',
        entityId: project.id,
        userId: session.user.id,
      }
    })

    // Notify project creator and admins (wrapped in try-catch to handle socket.io issues gracefully)
    try {
      const io = getIO()
      if (io) {
        io.to(`user-${project.createdBy}`).emit('budget-assigned', {
          projectId: project.id,
          budgetId: budget.id,
          amount: budgetAmount,
          message: `Budget of KES ${budgetAmount.toLocaleString()} has been allocated to your project`
        })

        // Notify all admins
        io.to('admin-room').emit('fund-pool-updated', {
          newBalance,
          deductedAmount: budgetAmount,
          projectId: project.id,
        })
      }
    } catch (socketError) {
      // Socket.io not initialized or other socket error - log but don't fail the request
      console.warn('[ASSIGN_BUDGET_SOCKET_WARN]', socketError)
    }

    return NextResponse.json({
      project: { id: project.id, status: 'STARTED' },
      budget,
      fundPoolBalance: newBalance,
    })
  } catch (error) {
    console.error('[ASSIGN_BUDGET_ERROR]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
