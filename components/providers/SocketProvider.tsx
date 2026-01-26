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
  const maxRetries = 3

  useEffect(() => {
    // Don't attempt to connect until session is loaded
    if (!session) {
      console.log('Waiting for session to load before connecting to Socket.IO')
      return
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'
    
    console.log(`[Socket.IO] Attempting connection to ${socketUrl}`, {
      attempt: retryCount + 1,
      maxRetries,
      sessionUserId: session.user?.id
    })

    const socketInstance = io(socketUrl, {
      path: '/api/socket',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxRetries,
      transports: ['websocket', 'polling'],
      query: {
        userId: session.user?.id || 'anonymous'
      }
    })

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected successfully', { socketId: socketInstance.id })
      setIsConnected(true)
      setSocket(socketInstance)
      setRetryCount(0) // Reset retry count on successful connection
    })

    socketInstance.on('connect_error', (error: Error) => {
      console.error('[Socket.IO] Connection error:', error)
      setIsConnected(false)
      
      // Attempt retry
      if (retryCount < maxRetries) {
        console.log(`[Socket.IO] Retrying... (${retryCount + 1}/${maxRetries})`)
        setRetryCount(retryCount + 1)
      }
    })

    socketInstance.on('disconnect', (reason: string) => {
      console.log('[Socket.IO] Disconnected:', reason)
      setIsConnected(false)
    })

    socketInstance.on('error', (error: Error) => {
      console.error('[Socket.IO] Socket error:', error)
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [session, retryCount])

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