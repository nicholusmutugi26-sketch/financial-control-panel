'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Check, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: Date | string
  updatedAt?: Date | string
  data?: Record<string, any> | null
}

interface NotificationCenterClientProps {
  initialNotifications: Notification[]
  total: number
}

export default function NotificationCenterClient({
  initialNotifications,
  total
}: NotificationCenterClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const filteredNotifications = filterType
    ? notifications.filter(n => n.type === filterType)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH'
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        )
        toast.success('Marked as read')
      } else {
        toast.error('Failed to mark as read')
      }
    } catch (error) {
      toast.error('Something went wrong')
    }
  }, [])

  const handleDelete = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        toast.success('Notification deleted')
      } else {
        toast.error('Failed to delete notification')
      }
    } catch (error) {
      toast.error('Something went wrong')
    }
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH'
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        toast.success('All notifications marked as read')
      } else {
        toast.error('Failed to mark all as read')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'budget_approved':
      case 'expenditure_approved':
      case 'supplementary_approved':
      case 'remittance_verified':
        return 'bg-emerald-50 border-l-4 border-emerald-500'
      case 'budget_rejected':
      case 'remittance_rejected':
        return 'bg-red-50 border-l-4 border-red-500'
      case 'expenditure_submitted':
      case 'supplementary_requested':
        return 'bg-amber-50 border-l-4 border-amber-500'
      case 'user_approved':
        return 'bg-purple-50 border-l-4 border-purple-500'
      default:
        return 'bg-sky-50 border-l-4 border-sky-500'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'budget_approved':
        return 'Budget Approved'
      case 'budget_rejected':
        return 'Budget Rejected'
      case 'expenditure_submitted':
        return 'Expenditure Submitted'
      case 'expenditure_approved':
        return 'Expenditure Approved'
      case 'supplementary_requested':
        return 'Supplementary Requested'
      case 'supplementary_approved':
        return 'Supplementary Approved'
      case 'user_approved':
        return 'User Approved'
      case 'remittance_verified':
        return 'Remittance Verified'
      case 'remittance_rejected':
        return 'Remittance Rejected'
      default:
        return 'Notification'
    }
  }

  const formatTime = (dateInput: string | Date) => {
    const date = new Date(dateInput)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  const notificationTypes = Array.from(
    new Set(notifications.map(n => n.type))
  )

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            You have {total} notification{total !== 1 ? 's' : ''} ({unreadCount} unread)
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filterType === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(null)}
            >
              All ({notifications.length})
            </Button>
            {notificationTypes.map(type => {
              const count = notifications.filter(n => n.type === type).length
              return (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                >
                  {getTypeLabel(type)} ({count})
                </Button>
              )
            })}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isLoading}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {filterType ? 'No notifications of this type' : 'No notifications yet'}
              </p>
              <Link href="/dashboard/user/dashboard" className="text-accent hover:underline mt-4 inline-block">
                Go back to dashboard
              </Link>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg ${getNotificationColor(notification.type)} ${
                  !notification.read ? 'ring-1 ring-offset-1 ring-foreground/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {notification.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(notification.type)}
                      </Badge>
                      {!notification.read && (
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          Unread
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="hover:bg-foreground/10"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(notification.id)}
                      className="hover:bg-red-500/10 text-red-600"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
