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

  // Check approval status first - redirect if not approved (unless admin)
  if (session.user.role !== 'ADMIN' && !(session.user as any).isApproved) {
    redirect('/dashboard/pending-approval')
  }

  // Redirect based on role
  // This is a fallback - auth redirect callback should handle this on initial login
  if (session.user.role === 'ADMIN') {
    redirect('/dashboard/admin/dashboard')
  }

  redirect('/dashboard/user/dashboard')
}
