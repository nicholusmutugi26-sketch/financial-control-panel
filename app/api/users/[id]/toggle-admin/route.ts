import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Cannot toggle your own admin status
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'Cannot change your own admin status' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: newRole,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_ROLE_CHANGED',
        entity: 'USER',
        entityId: user.id,
        userId: session.user.id,
        changes: {
          from: user.role,
          to: newRole,
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `User role changed to ${newRole}`,
      data: updatedUser,
    })
  } catch (error: any) {
    console.error('Role toggle error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}