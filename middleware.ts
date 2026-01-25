import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Add security headers
    const response = NextResponse.next()
    
    // Security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Check role-based access
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Check if user is approved (unless going to pending approval page or is admin)
    if (!path.includes('/pending-approval') && token?.role !== 'ADMIN' && token?.isApproved === false) {
      return NextResponse.redirect(new URL('/dashboard/pending-approval', req.url))
    }

    if (path.startsWith('/dashboard/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if (path.startsWith('/dashboard/user') && token?.role !== 'USER') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/login',
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
  ]
}