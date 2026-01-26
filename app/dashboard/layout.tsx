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

  console.log('DashboardLayout - Current session:', {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    isApproved: (session.user as any).isApproved,
    timestamp: new Date().toISOString()
  })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profileImage: true,
    },
  })

  if (!user) {
    redirect('/auth/login')
  }

  console.log('DashboardLayout - User from DB:', {
    userId: user.id,
    email: user.email,
    role: user.role,
    timestamp: new Date().toISOString()
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={user} />
      <div className="pt-16">
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}