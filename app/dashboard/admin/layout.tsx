import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
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
  if (sessionRole !== 'ADMIN') {
    redirect('/dashboard')
  }

  return <>{children}</>

}

// Note: The role is derived from email in lib/auth.ts JWT callback
// admin@financialpanel.com = 'ADMIN', all others = 'USER'
// The role check above validates only ADMIN role can access /dashboard/admin/*
