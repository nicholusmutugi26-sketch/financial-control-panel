import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

/**
 * Root dashboard page - handles role-based redirection
 * CRITICAL: This is a security checkpoint - validate role and redirect
 */
export default async function DashboardRootPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    console.warn('[DASHBOARD] No session found, redirecting to login')
    redirect('/auth/login')
  }

  // Normalize and validate role
  const userRole = String(session.user?.role || '').toUpperCase().trim()
  const isAdmin = userRole === 'ADMIN'
  const isUser = userRole === 'USER'

  console.log('[DASHBOARD] Root page - Role check:', {
    userId: session.user?.id,
    email: session.user?.email,
    tokenRole: session.user?.role,
    normalizedRole: userRole,
    isAdmin,
    isUser,
    isApproved: (session.user as any)?.isApproved,
    timestamp: new Date().toISOString()
  })

  // SAFETY: If role is unrecognized, redirect to login
  if (!isAdmin && !isUser) {
    console.error('[DASHBOARD] SECURITY: Unrecognized role detected!', {
      role: session.user?.role,
      email: session.user?.email
    })
    redirect('/auth/login')
  }

  // Check approval status first - redirect if not approved (unless admin)
  if (!isAdmin && !(session.user as any)?.isApproved) {
    console.log('[DASHBOARD] User not approved, redirecting to pending-approval')
    redirect('/dashboard/pending-approval')
  }

  // CRITICAL ENFORCEMENT: Redirect based on role
  if (isAdmin) {
    console.log('[DASHBOARD] Admin role detected, redirecting to /dashboard/admin/dashboard')
    redirect('/dashboard/admin/dashboard')
  }

  if (isUser) {
    console.log('[DASHBOARD] User role detected, redirecting to /dashboard/user/dashboard')
    redirect('/dashboard/user/dashboard')
  }

  // Fallback - should never reach here
  console.error('[DASHBOARD] CRITICAL: Reached fallback redirect (should not happen)')
  redirect('/auth/login')
}
