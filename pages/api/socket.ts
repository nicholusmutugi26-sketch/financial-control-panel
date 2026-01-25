import { NextApiRequest, NextApiResponse } from 'next'
import { initSocket } from '@/lib/realtime'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // `res.socket.server` is the native Node HTTP server — initialize Socket.io once
  const server = (res.socket as any).server

  if (!server.io) {
    initSocket(server)
    server.io = true
    console.log('Socket.io initialized on /api/socket')
  }

  res.end()
}
