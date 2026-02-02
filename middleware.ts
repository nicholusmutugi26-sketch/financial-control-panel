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

    // Allow the server-side verification route to run without token check
    // This route performs its own server-side session check after NextAuth sets the cookie
    if (path === '/dashboard/verify') {
      return response
    }

    // Safety check: ensure token has role
    if (!token) {
      console.warn('[MIDDLEWARE] No token found for path:', path, '- redirecting to login')
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // CRITICAL: Normalize role to prevent injection attacks
    const userRole = String(token?.role || '').toUpperCase().trim()
    const isAdmin = userRole === 'ADMIN'
    const isUser = userRole === 'USER'

    console.log(`[MIDDLEWARE] Route check - Path: ${path}, Role: ${userRole}, IsAdmin: ${isAdmin}, IsUser: ${isUser}, Email: ${token?.email}`)

    // 1. Check if user is approved (unless going to pending approval page or is admin)
    // Note: isApproved defaults to false, so only admins skip this check
    if (!path.includes('/pending-approval') && !isAdmin && !token?.isApproved) {
      console.log(`[MIDDLEWARE] User ${token?.email} not approved (isApproved=${token?.isApproved}), redirecting to pending-approval`)
      return NextResponse.redirect(new URL('/dashboard/pending-approval', req.url))
    }

    // 2. STRICT ENFORCEMENT: Non-ADMIN users CANNOT access ANY /dashboard/admin/* routes
    if (path.startsWith('/dashboard/admin/')) {
      if (!isAdmin) {
        console.error(`[SECURITY VIOLATION] Unauthorized admin access attempt!`)
        console.error(`  - Email: ${token?.email}`)
        console.error(`  - Token Role: ${token?.role} (normalized: ${userRole})`)
        console.error(`  - Path: ${path}`)
        console.error(`  - Timestamp: ${new Date().toISOString()}`)
        
        // IMMEDIATELY redirect to login - suspicious activity
        return NextResponse.redirect(new URL('/auth/login', req.url))
      }
    }

    // 3. STRICT ENFORCEMENT: Only USER role can access /dashboard/user/* routes
    if (path.startsWith('/dashboard/user/')) {
      if (!isUser) {
        console.warn(`[SECURITY] Unauthorized user route access!`)
        console.warn(`  - Email: ${token?.email}`)
        console.warn(`  - Role: ${userRole}`)
        console.warn(`  - Path: ${path}`)
        
        // If admin, redirect to admin dashboard
        if (isAdmin) {
          console.log(`[REDIRECT] Admin attempting user route, redirecting to admin dashboard`)
          return NextResponse.redirect(new URL('/dashboard/admin/dashboard', req.url))
        }
        
        // Otherwise redirect to main dashboard for re-routing
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // 4. Ensure admin-only API routes are protected
    if (path.startsWith('/api/admin/')) {
      if (!isAdmin) {
        console.warn(`[SECURITY] Unauthorized API access attempt to ${path}`)
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
      }
    }

    // 5. Log role-specific route access for audit
    if (path.startsWith('/dashboard/')) {
      console.log(`[AUDIT] User ${token?.email} (role: ${userRole}) accessing ${path}`)
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        // CRITICAL: Allow /dashboard/verify to proceed - it has its own session check
        if (path === '/dashboard/verify') {
          console.log('[MIDDLEWARE] Authorization callback: Allowing /dashboard/verify to proceed')
          return true
        }

        // Ensure token exists and has a valid role for all other routes
        if (!token) {
          console.warn('[MIDDLEWARE] Authorization check: No token')
          return false
        }
        const role = String(token?.role || '').toUpperCase().trim()
        const authorized = role === 'ADMIN' || role === 'USER'
        console.log(`[MIDDLEWARE] Authorization check: role=${role}, authorized=${authorized}, email=${token?.email}`)
        return authorized
      },
    },
    pages: {
      signIn: '/auth/login',
    },
  }
)

export const config = {
  matcher: [
    '/dashboard',        // Protect root dashboard
    '/dashboard/:path*', // Protect all dashboard subroutes
  ],
}