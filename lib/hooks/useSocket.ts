import { useContext } from 'react'
import { SocketContext } from '@/components/providers/SocketProvider'

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    return { socket: null }
  }
  return context
}

