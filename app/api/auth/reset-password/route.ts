import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * Password Reset API
 * Demo endpoint for testing - resets password to demo123456
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase()

    // Demo password for testing
    const demoPassword = 'demo123456'
    const hashedPassword = await bcrypt.hash(demoPassword, 12)

    // Update user password
    const result = await prisma.user.updateMany({
      where: { email: normalizedEmail },
      data: { password: hashedPassword }
    })

    if (result.count === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      newPassword: demoPassword,
      email: normalizedEmail
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
