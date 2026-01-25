import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardRootPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  console.log('Dashboard redirect - Session user:', {
    id: session.user?.id,
    email: session.user?.email,
    role: session.user?.role,
    isApproved: (session.user as any)?.isApproved,
  })

  // Route users to role-specific dashboards
  if (session.user.role === 'ADMIN') {
    console.log('Redirecting to ADMIN dashboard')
    redirect('/dashboard/admin/dashboard')
  }

  console.log('Redirecting to USER dashboard')
  // Default to user dashboard
  redirect('/dashboard/user/dashboard')
}
