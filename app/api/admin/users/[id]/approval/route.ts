import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotification } from '@/lib/notifications'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action } = await req.json()

  if (action === 'approve') {
    try {
      // Combine user check and approval in a single transaction to save connections
      const user = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { id: params.id }
        })

        if (!existingUser) {
          throw new Error('User not found')
        }

        return await tx.user.update({
          where: { id: params.id },
          data: { isApproved: true }
        })
      })
      
      // Send approval notification to the user (outside transaction)
      try {
        await sendNotification({
          userId: params.id,
          title: 'Registration Approved',
          message: 'Your registration has been approved! You can now access the system.',
          type: 'user_approved',
          data: { userId: params.id }
        })
      } catch (error) {
        console.error('Failed to send approval notification:', error)
        // Don't fail the approval if notification fails
      }
      
      return NextResponse.json({ success: true, message: 'User approved', user })
    } catch (error: any) {
      console.error('Approval error:', error)
      const statusCode = error.message === 'User not found' ? 404 : 500
      return NextResponse.json({ error: error.message || 'Failed to approve user' }, { status: statusCode })
    }
  } else if (action === 'reject') {
    try {
      const userId = params.id
      
      // First check if user exists
      const userExists = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!userExists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Delete in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete all related records in the correct order to avoid foreign key conflicts
        await tx.auditLog.deleteMany({ where: { userId } })
        await tx.notification.deleteMany({ where: { userId } })
        await tx.userPreference.deleteMany({ where: { userId } })
        
        // Delete system settings updated by this user
        await tx.systemSetting.deleteMany({ where: { updatedBy: userId } })
        
        // Delete expenditure items and expenditures
        const expenditures = await tx.expenditure.findMany({ where: { createdBy: userId } })
        for (const exp of expenditures) {
          await tx.expenditureItem.deleteMany({ where: { expenditureId: exp.id } })
        }
        await tx.expenditure.deleteMany({ where: { createdBy: userId } })
        
        // Delete budget revisions
        await tx.budgetRevision.deleteMany({ where: { userId } })
        
        // Delete budget items and supplementary budgets
        const budgets = await tx.budget.findMany({ where: { createdBy: userId } })
        for (const budget of budgets) {
          await tx.budgetItem.deleteMany({ where: { budgetId: budget.id } })
          await tx.supplementaryBudget.deleteMany({ where: { budgetId: budget.id } })
          await tx.batch.deleteMany({ where: { budgetId: budget.id } })
        }
        
        // Delete budgets and transactions
        await tx.budget.deleteMany({ where: { createdBy: userId } })
        await tx.transaction.deleteMany({ where: { userId } })
        
        // Delete projects and votes
        const projects = await tx.project.findMany({ where: { createdBy: userId } })
        for (const project of projects) {
          await tx.vote.deleteMany({ where: { projectId: project.id } })
        }
        await tx.project.deleteMany({ where: { createdBy: userId } })
        await tx.vote.deleteMany({ where: { userId } })
        
        // Delete reports and remittances
        await tx.report.deleteMany({ where: { createdBy: userId } })
        await tx.remittance.deleteMany({ where: { userId } })
        
        // Finally delete the user (this will cascade some deletes)
        await tx.user.delete({ where: { id: userId } })
      })

      return NextResponse.json({ success: true, message: 'User rejected and deleted' })
    } catch (error: any) {
      console.error('Rejection error:', error)
      return NextResponse.json({ error: error.message || 'Failed to reject user', details: error }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
