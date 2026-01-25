import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pending = await prisma.supplementaryBudget.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, name: true, email: true } }, budget: { select: { id: true, title: true } } }
    })

    // attach a best-effort related expenditure (created by same user for same budget around same time)
    const enriched = await Promise.all(pending.map(async (p) => {
      try {
        const start = new Date(p.createdAt)
        start.setMinutes(start.getMinutes() - 2)
        const end = new Date(p.createdAt)
        end.setMinutes(end.getMinutes() + 2)

        const related = await prisma.expenditure.findFirst({
          where: {
            createdBy: p.createdBy,
            budgetId: p.budgetId,
            createdAt: { gte: start, lte: end }
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true }
        })

        return { ...p, relatedExpenditure: related || null }
      } catch (e) {
        return { ...p, relatedExpenditure: null }
      }
    }))

    return NextResponse.json({ pending: enriched })
  } catch (err) {
    console.error('GET /api/supplementary/pending error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
