import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'fund_pool_balance' },
      include: { user: { select: { id: true, name: true, email: true } } }
    })

    const balance = setting ? parseInt(setting.value || '0', 10) : 0

    return NextResponse.json({ balance, updatedAt: setting?.updatedAt ?? null, updatedBy: setting?.user ?? null })
  } catch (err: any) {
    console.error('Fund pool GET error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { delta, note } = body
    if (typeof delta !== 'number') {
      return NextResponse.json({ error: 'Invalid delta' }, { status: 400 })
    }

    const setting = await prisma.systemSetting.findUnique({ where: { key: 'fund_pool_balance' } })
    const current = setting ? parseInt(setting.value || '0', 10) : 0
    const newBalance = current + delta

    // Prevent negative balance
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient funds in pool' }, { status: 400 })
    }

    await prisma.systemSetting.upsert({
      where: { key: 'fund_pool_balance' },
      create: {
        key: 'fund_pool_balance',
        value: String(newBalance),
        description: 'Common fund pool balance',
        category: 'finance',
        updatedBy: session.user.id,
      },
      update: {
        value: String(newBalance),
        updatedBy: session.user.id,
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'FUND_POOL_UPDATED',
        entity: 'FUND_POOL',
        entityId: 'fund_pool',
        userId: session.user.id,
        changes: { from: current, delta, to: newBalance, note },
      }
    })

    return NextResponse.json({ success: true, balance: newBalance })
  } catch (err: any) {
    console.error('Fund pool POST error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
