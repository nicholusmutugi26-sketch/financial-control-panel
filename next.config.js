/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['uploadthing.com', 'lh3.googleusercontent.com'],
  },
  // Socket.IO and real-time support configuration
  serverRuntimeConfig: {
    // Socket.IO initialization happens in the HTTP server runtime
  },
  publicRuntimeConfig: {
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
  },
  // Enable WebSocket support for Socket.IO
  experimental: {
    // Ensure Node.js compatibility for Socket.IO
  },
}

module.exports = nextConfig