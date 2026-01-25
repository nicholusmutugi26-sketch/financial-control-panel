import { Server as SocketServer } from 'socket.io'
import { Server as HttpServer } from 'http'

let io: SocketServer | null = null

export function initSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id)

    // Join user room
    socket.on('join-user', (userId: string) => {
      socket.join(`user-${userId}`)
      console.log(`User ${userId} joined their room`)
    })

    // Join admin room
    socket.on('join-admin', () => {
      socket.join('admin-room')
      console.log('Admin joined admin room')
    })

    // Handle budget updates
    socket.on('budget-updated', (data: any) => {
      // Notify admin
      io?.to('admin-room').emit('budget-changed', data)
      
      // Notify specific user
      if (data.userId) {
        io?.to(`user-${data.userId}`).emit('budget-updated', data)
      }
    })

    // Handle expenditure updates
    socket.on('expenditure-updated', (data: any) => {
      io?.to('admin-room').emit('expenditure-changed', data)
      if (data.userId) {
        io?.to(`user-${data.userId}`).emit('expenditure-updated', data)
      }
    })

    // Handle disbursement updates
    socket.on('disbursement-updated', (data: any) => {
      io?.emit('disbursement-changed', data)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized')
  }
  return io
}