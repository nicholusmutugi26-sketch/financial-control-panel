import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getIO } from '@/lib/realtime'
import { sendNotification } from '@/lib/notifications'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = params.id

    const supp = await prisma.supplementaryBudget.findUnique({ where: { id } })
    if (!supp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (supp.status !== 'PENDING') return NextResponse.json({ error: 'Not pending' }, { status: 400 })

    const updated = await prisma.supplementaryBudget.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: session.user.id, approvedAt: new Date() }
    })

    // Audit
    try {
      await prisma.auditLog.create({
        data: {
          action: 'SUPPLEMENTARY_APPROVED',
          entity: 'SUPPLEMENTARY_BUDGET',
          entityId: id,
          userId: session.user.id,
          changes: { amount: updated.amount, budgetId: updated.budgetId }
        }
      })
    } catch (e) {
      console.warn('Failed to create audit log for supplementary approve', e)
    }

    // Notify via socket
    try {
      getIO()?.to(`user-${supp.createdBy}`).emit('supplementary-updated', { id, status: updated.status })
      getIO()?.to('admin-room').emit('supplementary-updated', { id, status: updated.status })
    } catch (e) {}

    // Send notification
    try {
      const budget = await prisma.budget.findUnique({ where: { id: updated.budgetId } })
      await sendNotification({
        userId: supp.createdBy,
        title: 'Supplementary Budget Approved',
        message: `Your supplementary budget request for KES ${updated.amount} has been approved.`,
        type: 'supplementary_approved',
        data: {
          supplementaryId: id,
          amount: updated.amount,
          budgetId: updated.budgetId
        }
      })
    } catch (e) {
      console.warn('Failed to send notification for supplementary approval', e)
    }

    return NextResponse.json({ success: true, supplementary: updated })
  } catch (err) {
    console.error('POST /api/supplementary/[id]/approve error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
