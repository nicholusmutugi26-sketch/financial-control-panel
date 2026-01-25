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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
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

    // Check if this is the first user (make them admin)
    const userCount = await prisma.user.count()
    const role = userCount === 0 ? 'ADMIN' : 'USER'
    const isApproved = userCount === 0 // Only first user (admin) is auto-approved

    // Create user
    const user = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
        role,
        isApproved,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        isApproved: true,
        createdAt: true,
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_REGISTERED',
        entity: 'USER',
        entityId: user.id,
        userId: user.id,
        changes: {
          email: user.email,
          name: user.name,
          role: user.role,
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