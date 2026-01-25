import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Admins can view all; users see their own
    if (session.user.role === 'ADMIN') {
      const where: any = {}
      if (status) where.status = status
      const items = await prisma.remittance.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(items)
    }

    const items = await prisma.remittance.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(items)
  } catch (err: any) {
    console.error('Remittances GET error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { amount, note, proof } = body
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const rem = await prisma.remittance.create({
      data: {
        userId: session.user.id,
        amount,
        note: note || '',
        proof: proof || '',
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    })

    // create audit log
    await prisma.auditLog.create({
      data: {
        action: 'REMITTANCE_CREATED',
        entity: 'Remittance',
        entityId: rem.id,
        userId: session.user.id,
        changes: { amount, note }
      }
    })

    // Notify admins
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    })

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New Remittance Submitted',
          message: `${session.user.name} submitted a remittance of KES ${amount.toLocaleString()}`,
          type: 'REMITTANCE_CREATED',
          read: false,
          data: {
            remittanceId: rem.id,
            amount,
            userName: session.user.name,
          }
        }
      })
    }

    return NextResponse.json({ success: true, remittance: rem })
  } catch (err: any) {
    console.error('Remittances POST error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
