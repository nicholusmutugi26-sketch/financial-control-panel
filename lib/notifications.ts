import { prisma } from '@/lib/prisma'
import { getIO } from '@/lib/realtime'

export type NotificationType = 'budget_approved' | 'budget_rejected' | 'expenditure_submitted' | 'expenditure_approved' | 'supplementary_requested' | 'supplementary_approved' | 'supplementary_rejected' | 'user_approved' | 'remittance_verified' | 'remittance_rejected' | 'project_started' | 'info'

interface NotificationPayload {
  userId: string
  title: string
  message: string
  type: NotificationType
  data?: Record<string, any>
}

/**
 * Send a notification to a user via database and real-time socket
 */
export async function sendNotification({
  userId,
  title,
  message,
  type,
  data
}: NotificationPayload) {
  try {
    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        data: data ?? undefined
      }
    })

    // Emit real-time notification via socket
    getIO().to(`user-${userId}`).emit('notification', {
      id: notification.id,
      title,
      message,
      type,
      data,
      createdAt: notification.createdAt
    })

    return notification
  } catch (error) {
    console.error('Failed to send notification:', error)
    throw error
  }
}

/**
 * Send notifications to multiple users
 */
export async function sendBulkNotifications(
  userIds: string[],
  payload: Omit<NotificationPayload, 'userId'>
) {
  const promises = userIds.map(userId =>
    sendNotification({ ...payload, userId })
  )
  return Promise.all(promises)
}

/**
 * Notify admins about an action
 */
export async function notifyAdmins(
  title: string,
  message: string,
  type: NotificationType,
  data?: Record<string, any>
) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true }
  })

  return sendBulkNotifications(
    admins.map(a => a.id),
    { title, message, type, data }
  )
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  })
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true }
  })
}
