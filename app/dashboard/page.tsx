import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

/**
 * Root dashboard page - handles role-based redirection
 * CRITICAL: This is a security checkpoint - validate role and redirect
 */
export default async function DashboardRootPage() {
  console.log('[DASHBOARD-ROOT] Starting page load...')
  
  // Get session from server
  const session = await getServerSession(authOptions)

  console.log('[DASHBOARD-ROOT] getServerSession result:', {
    hasSession: !!session,
    sessionUser: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      isApproved: (session.user as any).isApproved
    } : null,
    timestamp: new Date().toISOString()
  })

  // If no session, user is not logged in
  if (!session || !session.user) {
    console.warn('[DASHBOARD-ROOT] ❌ No session or user found, redirecting to login')
    redirect('/auth/login')
  }

  // Extract and normalize role
  const rawRole = session.user?.role
  const userRole = typeof rawRole === 'string' ? rawRole.toUpperCase().trim() : ''
  const isAdmin = userRole === 'ADMIN'
  const isUser = userRole === 'USER'

  console.log('[DASHBOARD-ROOT] ✓ Session exists, checking role:', {
    userId: session.user.id,
    email: session.user.email,
    rawRole: rawRole,
    normalizedRole: userRole,
    isAdmin,
    isUser,
    isApproved: (session.user as any)?.isApproved,
  })

  // SAFETY: If role is unrecognized, something is wrong
  if (!isAdmin && !isUser) {
    console.error('[DASHBOARD-ROOT] ❌ SECURITY: Unrecognized role!', {
      role: rawRole,
      normalizedRole: userRole,
      email: session.user.email
    })
    redirect('/auth/login')
  }

  // Check if user is approved (only for non-admins)
  const isApproved = (session.user as any)?.isApproved === true
  if (!isAdmin && !isApproved) {
    console.log('[DASHBOARD-ROOT] ✓ User is not approved, showing pending-approval page')
    redirect('/dashboard/pending-approval')
  }

  // Redirect based on role
  if (isAdmin) {
    console.log('[DASHBOARD-ROOT] ✓ Admin detected, redirecting to admin dashboard')
    redirect('/dashboard/admin/dashboard')
  }

  if (isUser) {
    console.log('[DASHBOARD-ROOT] ✓ User detected, redirecting to user dashboard')
    redirect('/dashboard/user/dashboard')
  }

  // Should never reach here
  console.error('[DASHBOARD-ROOT] ❌ CRITICAL: Reached fallback (should never happen!)')
  redirect('/auth/login')
}
