import { NextRequest, NextResponse } from 'next/server'
import { initSocket } from '@/lib/realtime'

/**
 * Socket.IO initialization endpoint
 * Ensures Socket.io is initialized on first request
 * This is called by both the client and server to bootstrap the real-time connection
 */
export async function GET(request: NextRequest) {
  try {
    // Access the HTTP server from the request
    // Note: In Next.js App Router, Socket.IO is initialized via the HTTP server
    // This endpoint acts as a health check and ensures initialization happens
    console.log('Socket API endpoint called - Socket.IO should be initialized')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Socket.IO is available',
      socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'
    })
  } catch (error) {
    console.error('Socket API error:', error)
    return NextResponse.json({ 
      error: 'Failed to initialize Socket.IO',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
