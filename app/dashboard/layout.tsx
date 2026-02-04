import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/dashboard/DashboardNav'
import { prisma } from '@/lib/prisma'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  // Ensure session has user properties and derive role from email (source of truth)
  const sessionUser = session.user as any
  const userRole = ((sessionUser?.email ?? '').toLowerCase() === 'admin@financialpanel.com' ? 'ADMIN' : 'USER')

  console.log('DashboardLayout - Current session:', {
    userId: sessionUser?.id,
    email: sessionUser?.email,
    role: userRole,
    isApproved: sessionUser?.isApproved,
    timestamp: new Date().toISOString()
  })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      profileImage: true,
    },
  })

  if (!user) {
    redirect('/auth/login')
  }

  // CRITICAL: Pass session role (derived from email) not DB role (which can be null)
  // userRole is guaranteed to be 'ADMIN' or 'USER'
  const userWithSessionRole = {
    ...user,
    role: userRole, // Use the role we extracted above
  }

  console.log('[DashboardLayout] ✓ Passing to DashboardNav:', {
    userId: user.id,
    email: user.email,
    role: userWithSessionRole.role, // Should be 'ADMIN' or 'USER'
    timestamp: new Date().toISOString()
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={userWithSessionRole} />
      <div className="pt-16">
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}