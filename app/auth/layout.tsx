import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // If a session exists, verify the corresponding user still exists in the DB.
  // Avoid redirecting to `/dashboard` when the session is stale (user deleted),
  // which causes a redirect loop between `/dashboard` and `/auth/login`.
  if (session) {
    try {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } })
      if (user) {
        redirect('/dashboard')
      }
    } catch (error) {
      // If DB is unreachable or an error occurs, do not redirect — show login page.
      console.error('AuthLayout user check error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-white">
                Financial Control Panel
              </h1>
              <p className="text-gray-400 mt-2">
                Manage finances with ease
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
