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

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socket',
    })

    socketInstance.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
      setSocket(socketInstance)
    })

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  // Join rooms based on user role
  useEffect(() => {
    if (socket && session?.user) {
      socket.emit('join-user', session.user.id)
      
      if (session.user.role === 'ADMIN') {
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