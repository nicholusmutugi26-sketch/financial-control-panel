import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import NotificationCenterClient from './client'

export const metadata = {
  title: 'Notifications',
  description: 'View all your notifications'
}

async function getNotifications(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.notification.count({ where: { userId } })
  ])

  return {
    notifications,
    total,
    pages: Math.ceil(total / limit)
  }
}

export default async function NotificationCenterPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const { notifications, total } = await getNotifications(session.user.id)

  return <NotificationCenterClient initialNotifications={notifications as any} total={total} />
}
