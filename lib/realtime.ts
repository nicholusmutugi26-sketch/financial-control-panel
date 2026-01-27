import { Server as SocketServer } from 'socket.io'
import { Server as HttpServer } from 'http'

let io: SocketServer | null = null
let initializationAttempted = false
const initializationTimestamp = new Date().toISOString()

export function initSocket(server: HttpServer) {
  console.log('[Socket.IO] Initializing Socket.io server', {
    timestamp: new Date().toISOString(),
    previousAttempt: initializationAttempted
  })
  
  if (initializationAttempted && io) {
    console.log('[Socket.IO] Socket.IO already initialized, reusing instance')
    return io
  }

  try {
    initializationAttempted = true

    io = new SocketServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 20000,
    })

    console.log('[Socket.IO] SocketServer instance created', {
      corsOrigin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      transports: ['websocket', 'polling'],
      timestamp: new Date().toISOString()
    })

    io.on('connection', (socket) => {
      console.log('[Socket.IO] ✓ New client connected', {
        socketId: socket.id,
        clientIp: socket.handshake.address,
        timestamp: new Date().toISOString()
      })

      // Join user room
      socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`)
        console.log('[Socket.IO] User joined their room', {
          userId,
          socketId: socket.id,
          room: `user-${userId}`,
          timestamp: new Date().toISOString()
        })
      })

      // Join admin room
      socket.on('join-admin', () => {
        socket.join('admin-room')
        console.log('[Socket.IO] Admin joined admin room', {
          socketId: socket.id,
          room: 'admin-room',
          timestamp: new Date().toISOString()
        })
      })

      // Handle budget updates
      socket.on('budget-updated', (data: any) => {
        console.log('[Socket.IO] Budget update event received', {
          socketId: socket.id,
          budgetId: data?.id,
          userId: data?.userId,
          timestamp: new Date().toISOString()
        })
        
        // Notify admins
        if (io) {
          io.to('admin-room').emit('budget-changed', data)
          console.log('[Socket.IO] Emitted budget-changed to admin-room')
        }
        
        // Notify specific user
        if (data?.userId && io) {
          io.to(`user-${data.userId}`).emit('budget-updated', data)
          console.log('[Socket.IO] Emitted budget-updated to user room', {
            room: `user-${data.userId}`
          })
        }
      })

      // Handle expenditure updates
      socket.on('expenditure-updated', (data: any) => {
        console.log('[Socket.IO] Expenditure update event received', {
          socketId: socket.id,
          expenditureId: data?.id,
          userId: data?.userId,
          timestamp: new Date().toISOString()
        })
        
        if (io) {
          io.to('admin-room').emit('expenditure-changed', data)
          console.log('[Socket.IO] Emitted expenditure-changed to admin-room')
          
          if (data?.userId) {
            io.to(`user-${data.userId}`).emit('expenditure-updated', data)
            console.log('[Socket.IO] Emitted expenditure-updated to user room', {
              room: `user-${data.userId}`
            })
          }
        }
      })

      // Handle disbursement updates
      socket.on('disbursement-updated', (data: any) => {
        console.log('[Socket.IO] Disbursement update event received', {
          socketId: socket.id,
          disbursementId: data?.id,
          timestamp: new Date().toISOString()
        })
        
        if (io) {
          io.emit('disbursement-changed', data)
          console.log('[Socket.IO] Emitted disbursement-changed to all clients')
        }
      })

      socket.on('disconnect', () => {
        console.log('[Socket.IO] ✗ Client disconnected', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        })
      })

      socket.on('error', (error: any) => {
        console.error('[Socket.IO] Socket error on client connection', {
          socketId: socket.id,
          error: error.message || error,
          timestamp: new Date().toISOString()
        })
      })
    })

    io.on('error', (error: any) => {
      console.error('[Socket.IO] Server error', {
        error: error.message || error,
        timestamp: new Date().toISOString()
      })
    })

    console.log('[Socket.IO] ✓ Initialization complete', {
      timestamp: new Date().toISOString()
    })
    
    return io
  } catch (error: any) {
    console.error('[Socket.IO] ✗ Failed to initialize', {
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    initializationAttempted = false
    return null
  }
}

export function getIO() {
  if (!io) {
    console.warn('[Socket.IO] Not initialized yet', {
      attemptedInit: initializationAttempted,
      initTime: initializationTimestamp,
      currentTime: new Date().toISOString(),
      info: 'Socket.IO will be initialized on first HTTP server request. For database-only operations, this is safe.'
    })
    return null
  }
  return io
}

/**
 * Safely emit to socket with detailed logging
 */
export function safeEmitToSocket(room: string, event: string, data: any) {
  try {
    const socket = getIO()
    if (!socket) {
      console.warn('[Socket.IO] Cannot emit - Socket.IO not initialized', {
        room,
        event,
        timestamp: new Date().toISOString(),
        info: 'Event will not be delivered real-time. Users will receive update from database on next poll.'
      })
      return false
    }

    socket.to(room).emit(event, data)
    console.log('[Socket.IO] ✓ Event emitted successfully', {
      room,
      event,
      timestamp: new Date().toISOString()
    })
    return true
  } catch (error: any) {
    console.error('[Socket.IO] ✗ Error emitting event', {
      room,
      event,
      error: error.message || error,
      timestamp: new Date().toISOString()
    })
    return false
  }
}