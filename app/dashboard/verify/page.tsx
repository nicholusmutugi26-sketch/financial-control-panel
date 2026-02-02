'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function VerifyPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    console.log('[VERIFY] Session status:', status)
    console.log('[VERIFY] Session data:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      role: session?.user?.role,
      isApproved: (session?.user as any)?.isApproved,
    })

    // Wait for session to load
    if (status === 'loading') {
      console.log('[VERIFY] Still loading...')
      return
    }

    // Not authenticated - redirect to login
    if (status === 'unauthenticated') {
      console.log('[VERIFY] Not authenticated, redirecting to login')
      router.push('/auth/login')
      return
    }

    // Session loaded - route based on role
    if (status === 'authenticated' && session?.user) {
      const role = (session.user.role || 'USER').toUpperCase()
      const isApproved = !!(session.user as any)?.isApproved

      console.log('[VERIFY] Authenticated, routing based on role:', { role, isApproved })

      if (!isApproved) {
        console.log('[VERIFY] User not approved, redirecting to pending-approval')
        router.push('/dashboard/pending-approval')
        return
      }

      if (role === 'ADMIN') {
        console.log('[VERIFY] Admin user, redirecting to admin dashboard')
        router.push('/dashboard/admin/dashboard')
        return
      }

      console.log('[VERIFY] Regular user, redirecting to user dashboard')
      router.push('/dashboard/user/dashboard')
    }
  }, [session, status, router])

  // Show loading state
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-slate-50">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Completing login...</h2>
        <p className="text-sm text-gray-600 mt-2">Redirecting to your dashboard</p>
      </div>
    </div>
  )
}
