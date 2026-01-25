import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET - fetch notifications for the current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const unread = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        read: false
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const total = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false
      }
    })

    return NextResponse.json({ notifications: unread, unreadCount: total })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - create a notification (for internal use)
export async function POST(req: NextRequest) {
  const { userId, title, message, type, data } = await req.json()

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        data: data || null
      }
    })

    return NextResponse.json(notification)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
