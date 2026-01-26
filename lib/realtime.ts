import { Server as SocketServer } from 'socket.io'
import { Server as HttpServer } from 'http'

let io: SocketServer | null = null

export function initSocket(server: HttpServer) {
  console.log('[Socket.IO] Initializing Socket.io server')
  
  io = new SocketServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket) => {
    console.log('[Socket.IO] New client connected:', socket.id)

    // Join user room
    socket.on('join-user', (userId: string) => {
      socket.join(`user-${userId}`)
      console.log(`[Socket.IO] User ${userId} joined their room`)
    })

    // Join admin room
    socket.on('join-admin', () => {
      socket.join('admin-room')
      console.log('[Socket.IO] Admin joined admin room')
    })

    // Handle budget updates
    socket.on('budget-updated', (data: any) => {
      console.log('[Socket.IO] Budget update received:', { data, socketId: socket.id })
      // Notify admin
      io?.to('admin-room').emit('budget-changed', data)
      
      // Notify specific user
      if (data.userId) {
        io?.to(`user-${data.userId}`).emit('budget-updated', data)
      }
    })

    // Handle expenditure updates
    socket.on('expenditure-updated', (data: any) => {
      console.log('[Socket.IO] Expenditure update received:', { data, socketId: socket.id })
      io?.to('admin-room').emit('expenditure-changed', data)
      if (data.userId) {
        io?.to(`user-${data.userId}`).emit('expenditure-updated', data)
      }
    })

    // Handle disbursement updates
    socket.on('disbursement-updated', (data: any) => {
      console.log('[Socket.IO] Disbursement update received:', { data, socketId: socket.id })
      io?.emit('disbursement-changed', data)
    })

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Client disconnected:', socket.id)
    })

    socket.on('error', (error) => {
      console.error('[Socket.IO] Socket error:', { error, socketId: socket.id })
    })
  })

  io.on('error', (error) => {
    console.error('[Socket.IO] Server error:', error)
  })

  console.log('[Socket.IO] Initialization complete')
  return io
}

export function getIO() {
  if (!io) {
    console.warn('[Socket.IO] Not initialized - returning null. This is safe for server-side operations.')
    return null
  }
  return io
}

/**
 * Safely emit to socket with fallback if not initialized
 */
export function safeEmitToSocket(room: string, event: string, data: any) {
  try {
    const socket = getIO()
    if (!socket) {
      console.log(`[Socket.IO] Not initialized, skipping emit to ${room}:${event}`)
      return false
    }
    socket.to(room).emit(event, data)
    console.log(`[Socket.IO] Emitted ${event} to room ${room}`, { data })
    return true
  } catch (error) {
    console.error(`[Socket.IO] Error emitting ${event} to ${room}:`, error)
    return false
  }
}