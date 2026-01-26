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
    
    // Check role-based access - Principle of Least Privilege
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // 1. Check if user is approved (unless going to pending approval page or is admin)
    if (!path.includes('/pending-approval') && token?.role !== 'ADMIN' && token?.isApproved === false) {
      return NextResponse.redirect(new URL('/dashboard/pending-approval', req.url))
    }

    // 2. STRICT: Non-ADMIN users cannot access ANY /dashboard/admin/* routes (Principle of Least Privilege)
    if (path.startsWith('/dashboard/admin/')) {
      if (token?.role !== 'ADMIN') {
        console.warn(`[SECURITY] Unauthorized access attempt to admin route by ${token?.email} (role: ${token?.role})`)
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // 3. STRICT: Only USER role can access /dashboard/user/* routes
    // Admins cannot access user routes - they must use admin routes instead
    if (path.startsWith('/dashboard/user/')) {
      if (token?.role !== 'USER') {
        console.warn(`[SECURITY] Unauthorized access to user route by ${token?.email} (role: ${token?.role}) - path: ${path}`)
        
        // If they're admin, redirect them to admin dashboard
        if (token?.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/dashboard/admin/dashboard', req.url))
        }
        
        // Otherwise redirect to main dashboard
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // 4. Ensure admin-only API routes are protected
    if (path.startsWith('/api/admin/')) {
      if (token?.role !== 'ADMIN') {
        console.warn(`[SECURITY] Unauthorized API access attempt to ${path} by ${token?.email} (role: ${token?.role})`)
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
      }
    }

    // 5. Log role-specific route access for audit
    if (path.startsWith('/dashboard/')) {
      console.log(`[AUDIT] User ${token?.email} (role: ${token?.role}) accessing ${path}`)
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