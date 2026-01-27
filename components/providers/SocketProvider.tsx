'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import io from 'socket.io-client'
import { useSession } from 'next-auth/react'

type Socket = ReturnType<typeof io>

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { data: session } = useSession()
  const [retryCount, setRetryCount] = useState(0)
  const [connectionAttempted, setConnectionAttempted] = useState(false)
  const maxRetries = 5

  useEffect(() => {
    // Don't attempt to connect until session is loaded
    if (!session) {
      console.log('[Socket.IO] Waiting for session to load before connecting')
      return
    }

    // Only attempt connection once per session
    if (connectionAttempted && socket) {
      console.log('[Socket.IO] Already connected with active socket')
      return
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'
    
    console.log('[Socket.IO] Starting connection attempt', {
      url: socketUrl,
      attempt: retryCount + 1,
      maxRetries,
      userId: session.user?.id,
      email: session.user?.email,
      timestamp: new Date().toISOString()
    })

    try {
      const socketInstance = io(socketUrl, {
        path: '/api/socket',
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: maxRetries,
        transports: ['websocket', 'polling'],
        secure: socketUrl.startsWith('https'),
        rejectUnauthorized: false,
        query: {
          userId: session.user?.id || 'anonymous',
          email: session.user?.email || 'unknown'
        }
      })

      socketInstance.on('connect', () => {
        console.log('[Socket.IO] ✓ Connected successfully', { 
          socketId: socketInstance.id,
          userId: session.user?.id,
          timestamp: new Date().toISOString()
        })
        setIsConnected(true)
        setSocket(socketInstance)
        setRetryCount(0)
        setConnectionAttempted(true)
      })

      socketInstance.on('connect_error', (error: Error) => {
        console.error('[Socket.IO] ✗ Connection error', {
          error: error.message,
          code: (error as any).code,
          attempt: retryCount + 1,
          maxRetries,
          timestamp: new Date().toISOString()
        })
        setIsConnected(false)
        
        if (retryCount < maxRetries) {
          console.log(`[Socket.IO] Retrying connection... (${retryCount + 1}/${maxRetries})`)
          setRetryCount(retryCount + 1)
        } else {
          console.error('[Socket.IO] ✗ Max retries reached - giving up on real-time connection')
          console.log('[Socket.IO] ℹ App will continue to work with polling updates from database')
        }
      })

      socketInstance.on('disconnect', (reason: string) => {
        console.log('[Socket.IO] Disconnected', { 
          reason,
          userId: session.user?.id,
          timestamp: new Date().toISOString()
        })
        setIsConnected(false)
        
        // Only reconnect on non-client-side-close reasons
        if (reason !== 'io client disconnect') {
          console.log('[Socket.IO] Attempting to reconnect...')
        }
      })

      socketInstance.on('error', (error: Error) => {
        console.error('[Socket.IO] Socket error', {
          error: error.message,
          userId: session.user?.id,
          timestamp: new Date().toISOString()
        })
      })

      // Listen for notifications
      socketInstance.on('notification', (data: any) => {
        console.log('[Socket.IO] Notification received', { data, timestamp: new Date().toISOString() })
      })

      // Listen for real-time updates
      socketInstance.on('budget-updated', (data: any) => {
        console.log('[Socket.IO] Budget update received', { data })
      })

      socketInstance.on('expenditure-updated', (data: any) => {
        console.log('[Socket.IO] Expenditure update received', { data })
      })

      socketInstance.on('disbursement-changed', (data: any) => {
        console.log('[Socket.IO] Disbursement changed', { data })
      })

      return () => {
        console.log('[Socket.IO] Cleaning up socket connection')
        socketInstance.disconnect()
      }
    } catch (error) {
      console.error('[Socket.IO] Failed to create socket instance', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })
      setIsConnected(false)
    }
  }, [session, retryCount, connectionAttempted, socket])

  // Join rooms based on user role
  useEffect(() => {
    if (socket && session?.user) {
      console.log('[Socket.IO] Joining user room:', session.user.id)
      socket.emit('join-user', session.user.id)
      
      if (session.user.role === 'ADMIN') {
        console.log('[Socket.IO] Joining admin room')
        socket.emit('join-admin')
      }
    }
  }, [socket, session])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}