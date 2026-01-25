import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// PATCH - mark all notifications as read
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false
      },
      data: { read: true }
    })

    return NextResponse.json({
      message: 'All notifications marked as read',
      updated: result.count
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
