import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { validatePhoneNumber } from '@/lib/utils'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phoneNumber: z.string().refine(validatePhoneNumber, {
    message: 'Please enter a valid Kenyan phone number (254XXXXXXXXX)',
  }),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Normalize email to lowercase
    const normalizedEmail = validatedData.email.toLowerCase()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Check if phone number exists
    const existingPhone = await prisma.user.findFirst({
      where: { phoneNumber: validatedData.phoneNumber }
    })

    if (existingPhone) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Check if this is the first user (make them auto-approved since they'll be admin)
    const userCount = await prisma.user.count()
    const isApproved = userCount === 0 // Only first user is auto-approved

    // Create user - DO NOT store role, it will be derived from email
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: normalizedEmail,
        password: hashedPassword,
        phoneNumber: validatedData.phoneNumber,
        // NOTE: DO NOT set 'role' field - it will be determined from email in auth.ts
        // First user (email: admin@financialpanel.com) will automatically get ADMIN role
        // All others get USER role
        isApproved,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        isApproved: true,
        createdAt: true,
      }
    })

    // Create audit log
    const derivedRole = normalizedEmail === 'admin@financialpanel.com' ? 'ADMIN' : 'USER'
    await prisma.auditLog.create({
      data: {
        action: 'USER_REGISTERED',
        entity: 'USER',
        entityId: user.id,
        userId: user.id,
        changes: {
          email: user.email,
          name: user.name,
          derivedRole: derivedRole,
          isApproved: isApproved,
        }
      }
    })

    return NextResponse.json(
      { 
        success: true, 
        message: 'User registered successfully',
        user 
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}