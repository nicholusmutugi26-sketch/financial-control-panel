import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/server'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get current session
    const session = await getServerSession(authOptions)
    
    // Get all users (excluding passwords for security)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isApproved: true,
        password: true,
      }
    })

    return NextResponse.json({
      status: 'ok',
      currentSession: session ? {
        userId: session.user?.id,
        email: session.user?.email,
        role: (session.user as any)?.role,
        isApproved: (session.user as any)?.isApproved,
      } : null,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isApproved: u.isApproved,
        hasPassword: !!u.password,
        passwordLength: u.password?.length || 0,
      })),
      authConfig: {
        callbackUrl: process.env.NEXTAUTH_URL || 'Not set',
        isProduction: process.env.NODE_ENV === 'production',
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
