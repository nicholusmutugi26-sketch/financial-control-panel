import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getIO } from '@/lib/realtime'

const createSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const budgetId = params.id

    const body = await request.json()
    const data = createSchema.parse(body)

    const budget = await prisma.budget.findUnique({ where: { id: budgetId } })
    if (!budget) return NextResponse.json({ error: 'Budget not found' }, { status: 404 })

    // Only allow owner or admins to request supplementary for this budget
    if (session.user.role !== 'ADMIN' && session.user.id !== budget.createdBy) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supp = await prisma.supplementaryBudget.create({
      data: {
        budgetId,
        amount: data.amount,
        reason: data.reason || null,
        createdBy: session.user.id,
      }
    })

    // Audit
    try {
      await prisma.auditLog.create({
        data: {
          action: 'SUPPLEMENTARY_REQUESTED',
          entity: 'SUPPLEMENTARY_BUDGET',
          entityId: supp.id,
          userId: session.user.id,
          changes: { amount: data.amount, budgetId }
        }
      })
    } catch (e) {
      console.warn('Failed to create audit log for supplementary request', e)
    }

    // Notify admins via socket if available
    try {
      getIO()?.to('admin-room').emit('supplementary-requested', { id: supp.id, budgetId, amount: supp.amount })
    } catch (e) {
      // ignore if socket not initialized
    }

    return NextResponse.json({ success: true, supplementary: supp })
  } catch (err: any) {
    console.error('POST /api/budgets/[id]/supplementary error', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
