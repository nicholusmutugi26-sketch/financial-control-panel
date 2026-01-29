import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * DEBUG ENDPOINT - Check user exists and password status
 * Remove this after debugging
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase()
    console.log('🔍 [DEBUG] Checking user:', normalizedEmail)

    // Try findFirst with case-insensitive filter
    const userFirst = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
    })

    console.log('🔍 [DEBUG] findFirst result:', userFirst ? { id: userFirst.id, email: userFirst.email, hasPassword: !!userFirst.password, isApproved: userFirst.isApproved } : 'NOT FOUND')

    // Also try findUnique with exact match
    const userUnique = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    console.log('🔍 [DEBUG] findUnique result:', userUnique ? { id: userUnique.id, email: userUnique.email, hasPassword: !!userUnique.password, isApproved: userUnique.isApproved } : 'NOT FOUND')

    if (!userFirst) {
      return NextResponse.json({
        found: false,
        message: 'User not found with case-insensitive search',
        searched: normalizedEmail,
        allUsers: await prisma.user.findMany({ select: { id: true, email: true, isApproved: true } })
      })
    }

    return NextResponse.json({
      found: true,
      user: {
        id: userFirst.id,
        email: userFirst.email,
        name: userFirst.name,
        isApproved: userFirst.isApproved,
        role: userFirst.role,
        hasPassword: !!userFirst.password,
        passwordLength: userFirst.password?.length || 0,
        lastLogin: userFirst.lastLogin
      }
    })
  } catch (error) {
    console.error('🔍 [DEBUG] Error:', error)
    return NextResponse.json({ error: 'Internal error', details: error instanceof Error ? error.message : error }, { status: 500 })
  }
}
