'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, X, Check } from 'lucide-react'
import { useSocket } from '@/components/providers/SocketProvider'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
  data?: Record<string, any>
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { socket } = useSocket()

  // Fetch initial notifications
  useEffect(() => {
    if (!session?.user?.id) return

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const { notifications, unreadCount } = await response.json()
          setNotifications(notifications)
          setUnreadCount(unreadCount)
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    fetchNotifications()

    // Set up polling every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [session?.user?.id])

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev])
      setUnreadCount(prev => prev + 1)
    }

    socket.on('notification', handleNewNotification)
    return () => {
      socket.off('notification', handleNewNotification)
    }
  }, [socket])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAsRead = async (notificationId: string) => {
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
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const wasUnread = notifications.find(n => n.id === notificationId)?.read === false
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'budget_approved':
      case 'expenditure_approved':
      case 'supplementary_approved':
      case 'remittance_verified':
        return 'border-l-emerald-500'
      case 'budget_rejected':
      case 'remittance_rejected':
        return 'border-l-red-500'
      case 'expenditure_submitted':
      case 'supplementary_requested':
        return 'border-l-amber-500'
      case 'user_approved':
        return 'border-l-purple-500'
      default:
        return 'border-l-sky-500'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
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

  if (!session?.user?.id) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-background border border-border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Notifications</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                      !notification.read ? 'bg-muted/50' : 'bg-background'
                    } hover:bg-muted/30 transition-colors`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-sm">
                          {notification.title}
                        </h4>
                        <p className="text-muted-foreground text-xs mt-1">
                          {notification.message}
                        </p>
                        <p className="text-muted-foreground text-xs mt-2">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 hover:bg-foreground/10 rounded transition-colors"
                            aria-label="Mark as read"
                          >
                            <Check className="h-4 w-4 text-foreground" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1 hover:bg-red-500/10 rounded transition-colors"
                          aria-label="Delete notification"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-border text-center">
              <a
                href="/dashboard/notifications"
                className="text-sm text-accent hover:underline font-medium"
              >
                View all notifications →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
