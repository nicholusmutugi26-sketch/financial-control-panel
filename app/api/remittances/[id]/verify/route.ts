import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { approve, note } = body

    const rem = await prisma.remittance.findUnique({ where: { id } })
    if (!rem) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (rem.status !== 'PENDING') return NextResponse.json({ error: 'Already processed' }, { status: 400 })

    if (approve) {
      // Update pool
      const poolSetting = await prisma.systemSetting.findUnique({ where: { key: 'fund_pool_balance' } })
      const current = poolSetting ? parseInt(poolSetting.value || '0', 10) : 0
      const newBalance = current + rem.amount

      await prisma.systemSetting.upsert({
        where: { key: 'fund_pool_balance' },
        create: {
          key: 'fund_pool_balance',
          value: String(newBalance),
          description: 'Common fund pool balance',
          category: 'finance',
          updatedBy: session.user.id,
        },
        update: { value: String(newBalance), updatedBy: session.user.id }
      })

      await prisma.auditLog.create({
        data: {
          action: 'REMITTANCE_VERIFIED',
          entity: 'REMITTANCE',
          entityId: rem.id,
          userId: session.user.id,
          changes: { from: rem.status, to: 'VERIFIED', amount: rem.amount, note }
        }
      })

      // mark remittance verified
      const updated = await prisma.remittance.update({
        where: { id },
        data: { status: 'VERIFIED', verifiedBy: session.user.id, verifiedAt: new Date(), updatedAt: new Date() }
      })

      // notify user
      await prisma.notification.create({
        data: {
          userId: rem.userId,
          title: 'Remittance Verified',
          message: `Your remittance of ${rem.amount} has been verified and added to the pool.`,
          type: 'REMITTANCE_VERIFIED',
          read: false,
        }
      })

      return NextResponse.json({ success: true, remittance: updated, newBalance })
    } else {
      // Reject
      const updated = await prisma.remittance.update({
        where: { id },
        data: { status: 'REJECTED', verifiedBy: session.user.id, verifiedAt: new Date(), updatedAt: new Date() }
      })

      await prisma.auditLog.create({
        data: {
          action: 'REMITTANCE_REJECTED',
          entity: 'REMITTANCE',
          entityId: rem.id,
          userId: session.user.id,
          changes: { from: rem.status, to: 'REJECTED', note }
        }
      })

      await prisma.notification.create({
        data: {
          userId: rem.userId,
          title: 'Remittance Rejected',
          message: `Your remittance of ${rem.amount} was rejected.`,
          type: 'REMITTANCE_REJECTED',
          read: false,
        }
      })

      return NextResponse.json({ success: true, remittance: updated })
    }
  } catch (err: any) {
    console.error('Remittance verify error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
