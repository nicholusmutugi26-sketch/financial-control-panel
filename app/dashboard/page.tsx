import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardRootPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Route users to role-specific dashboards
  if (session.user.role === 'ADMIN') {
    redirect('/dashboard/admin/dashboard')
  }

  // Default to user dashboard
  redirect('/dashboard/user/dashboard')
}
