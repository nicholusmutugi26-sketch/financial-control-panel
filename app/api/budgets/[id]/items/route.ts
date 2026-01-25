import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const budgetId = params.id

    const budget = await prisma.budget.findUnique({ where: { id: budgetId } })
    if (!budget) return NextResponse.json({ error: 'Budget not found' }, { status: 404 })

    // Only allow owner or admins to view full list
    if (session.user.role !== 'ADMIN' && session.user.id !== budget.createdBy) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const items = await prisma.budgetItem.findMany({ where: { budgetId }, orderBy: { createdAt: 'asc' } })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET /api/budgets/[id]/items error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const budgetId = params.id
    const budget = await prisma.budget.findUnique({ where: { id: budgetId } })
    if (!budget) return NextResponse.json({ error: 'Budget not found' }, { status: 404 })

    // Only allow owner or admins to modify items
    if (session.user.role !== 'ADMIN' && session.user.id !== budget.createdBy) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { items, deletedIds } = body as { items?: Array<any>, deletedIds?: string[] }

    // Delete requested items
    if (deletedIds && deletedIds.length > 0) {
      await prisma.budgetItem.deleteMany({ where: { id: { in: deletedIds }, budgetId } })
    }

    // Upsert items: if id present update, else create
    if (items && items.length > 0) {
      for (const it of items) {
        if (it.id) {
          await prisma.budgetItem.updateMany({
            where: { id: it.id, budgetId },
            data: {
              name: it.name,
              unitPrice: Math.round(it.unitPrice || 0),
              quantity: it.quantity || 1,
            }
          })
        } else {
          await prisma.budgetItem.create({
            data: {
              budgetId,
              name: it.name,
              unitPrice: Math.round(it.unitPrice || 0),
              quantity: it.quantity || 1,
              createdBy: session.user.id,
            }
          })
        }
      }
    }

    // Recalculate budget amount as sum of items and update
    const currentItems = await prisma.budgetItem.findMany({ where: { budgetId } })
    const total = currentItems.reduce((s, i) => s + (i.unitPrice * (i.quantity || 1)), 0)

    await prisma.budget.update({ where: { id: budgetId }, data: { amount: total } })

    return NextResponse.json({ success: true, total })
  } catch (err) {
    console.error('POST /api/budgets/[id]/items error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
