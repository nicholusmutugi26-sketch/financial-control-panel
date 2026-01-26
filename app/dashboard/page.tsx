import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

/**
 * Root dashboard page - handles role-based redirection
 * NOTE: Auth redirect callback now handles most of the redirection,
 * but we keep this as a fallback for direct /dashboard access
 */
export default async function DashboardRootPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  console.log('DashboardRootPage - Handling redirect:', {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    isApproved: (session.user as any).isApproved,
    timestamp: new Date().toISOString()
  })

  // Check approval status first - redirect if not approved (unless admin)
  if (session.user.role !== 'ADMIN' && !(session.user as any).isApproved) {
    console.log('DashboardRootPage - User not approved, redirecting to pending-approval')
    redirect('/dashboard/pending-approval')
  }

  // Redirect based on role
  // This is a fallback - auth redirect callback should handle this on initial login
  if (session.user.role === 'ADMIN') {
    console.log('DashboardRootPage - Admin detected, redirecting to /dashboard/admin/dashboard')
    redirect('/dashboard/admin/dashboard')
  }

  console.log('DashboardRootPage - User detected, redirecting to /dashboard/user/dashboard')
  redirect('/dashboard/user/dashboard')
}
