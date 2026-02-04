import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Derive role from email (source of truth) to avoid token mismatches
  const sessionEmail = String((session.user as any)?.email || '').toLowerCase().trim()
  const sessionRole = sessionEmail === 'admin@financialpanel.com' ? 'ADMIN' : 'USER'
  if (sessionRole !== 'USER') {
    redirect('/dashboard')
  }

  return <>{children}</>
}