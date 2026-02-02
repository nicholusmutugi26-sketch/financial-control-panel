import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    // If no session, send user to login
    if (!session || !session.user) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    const role = ((session.user as any).role || 'USER').toUpperCase()
    const isApproved = !!(session.user as any).isApproved

    if (!isApproved) {
      return NextResponse.redirect(new URL('/dashboard/pending-approval', req.url))
    }

    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard/admin/dashboard', req.url))
    }

    return NextResponse.redirect(new URL('/dashboard/user/dashboard', req.url))
  } catch (error) {
    console.error('[VERIFY ROUTE] Error verifying session', error)
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
}
