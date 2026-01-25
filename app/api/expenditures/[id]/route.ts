import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateExpenditureSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  priority: z.enum(['EMERGENCY', 'URGENT', 'NORMAL', 'LONG_TERM']).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    const expenditure = await prisma.expenditure.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          }
        },
        budget: {
          select: {
            id: true,
            title: true,
            amount: true,
            allocatedAmount: true,
          }
        },
        items: {
          orderBy: { amount: 'desc' }
        },
      }
    })

    if (!expenditure) {
      return NextResponse.json(
        { error: 'Expenditure not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    if (session.user.role !== 'ADMIN' && expenditure.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: expenditure,
    })
  } catch (error: any) {
    console.error('Expenditure fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()
    const validatedData = updateExpenditureSchema.parse(body)

    const expenditure = await prisma.expenditure.findUnique({
      where: { id }
    })

    if (!expenditure) {
      return NextResponse.json(
        { error: 'Expenditure not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (session.user.role !== 'ADMIN' && expenditure.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Only users can update their own expenditures, admins can update status
    const updateData: any = { updatedAt: new Date() }
    
    if (session.user.role === 'ADMIN' && validatedData.status) {
      updateData.status = validatedData.status
      if (validatedData.status === 'PAID') {
        updateData.paidAt = new Date()
      }
    } else if (session.user.role === 'USER') {
      // Users can only update certain fields
      if (validatedData.title) updateData.title = validatedData.title
      if (validatedData.description) updateData.description = validatedData.description
      if (validatedData.priority) updateData.priority = validatedData.priority
      
      // Users can only change status to PENDING from DRAFT
      if (validatedData.status === 'PENDING' && expenditure.status === 'DRAFT') {
        updateData.status = 'PENDING'
      }
    }

    const updatedExpenditure = await prisma.expenditure.update({
      where: { id },
      data: updateData,
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EXPENDITURE_UPDATED',
        entity: 'EXPENDITURE',
        entityId: expenditure.id,
        userId: session.user.id,
        changes: validatedData,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Expenditure updated successfully',
      data: updatedExpenditure,
    })
  } catch (error: any) {
    console.error('Expenditure update error:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    const expenditure = await prisma.expenditure.findUnique({
      where: { id }
    })

    if (!expenditure) {
      return NextResponse.json(
        { error: 'Expenditure not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (session.user.role !== 'ADMIN' && expenditure.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Only allow deletion for certain statuses
    if (!['DRAFT'].includes(expenditure.status ?? '')) {
      return NextResponse.json(
        { error: 'Cannot delete expenditure in current status' },
        { status: 400 }
      )
    }

    // Delete related items first
    await prisma.expenditureItem.deleteMany({
      where: { expenditureId: id }
    })

    // Delete expenditure
    await prisma.expenditure.delete({
      where: { id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EXPENDITURE_DELETED',
        entity: 'EXPENDITURE',
        entityId: id,
        userId: session.user.id,
        changes: {
          title: expenditure.title,
          amount: expenditure.amount,
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Expenditure deleted successfully',
    })
  } catch (error: any) {
    console.error('Expenditure deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}