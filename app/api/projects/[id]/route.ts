import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateProjectSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  status: z.enum([
    'PROPOSED', 'UNDER_REVIEW', 'VOTING', 'APPROVED', 'REJECTED',
    'STARTED', 'PROGRESSING', 'NEARING_COMPLETION', 'COMPLETED',
    'TERMINATED', 'REVOKED'
  ]).optional(),
  budgetId: z.string().optional(),
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

    const project = await prisma.project.findUnique({
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
        // no approvedBy relation on Project model
        budget: {
          select: {
            id: true,
            title: true,
            amount: true,
            allocatedAmount: true,
          }
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              }
            }
          }
        },
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    if (session.user.role !== 'ADMIN' && project.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Calculate vote statistics
    const totalVotes = project.votes.length
    const approveVotes = project.votes.filter(v => v.vote).length
    const rejectVotes = totalVotes - approveVotes
    const approvalRate = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0

    const projectWithStats = {
      ...project,
      voteStats: {
        total: totalVotes,
        approve: approveVotes,
        reject: rejectVotes,
        approvalRate,
      }
    }

    return NextResponse.json({
      success: true,
      data: projectWithStats,
    })
  } catch (error: any) {
    console.error('Project fetch error:', error)
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
    const validatedData = updateProjectSchema.parse(body)

    const project = await prisma.project.findUnique({
      where: { id }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (session.user.role !== 'ADMIN' && project.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const updateData: any = { updatedAt: new Date() }
    
    // Different update permissions based on role
    if (session.user.role === 'ADMIN') {
      // Admin can update everything
      if (validatedData.title) updateData.title = validatedData.title
      if (validatedData.description) updateData.description = validatedData.description
      if (validatedData.status) {
        updateData.status = validatedData.status
      }
      if (validatedData.budgetId !== undefined) updateData.budgetId = validatedData.budgetId
    } else if (session.user.role === 'USER') {
      // Users can only update certain fields
      if (validatedData.title) updateData.title = validatedData.title
      if (validatedData.description) updateData.description = validatedData.description
      // Users can only change status to certain values
      if (validatedData.status === 'PROPOSED' && project.status === 'DRAFT') {
        updateData.status = 'PROPOSED'
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PROJECT_UPDATED',
        entity: 'PROJECT',
        entityId: project.id,
        userId: session.user.id,
        changes: validatedData,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject,
    })
  } catch (error: any) {
    console.error('Project update error:', error)
    
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

    const project = await prisma.project.findUnique({
      where: { id }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (session.user.role !== 'ADMIN' && project.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Only allow deletion for certain statuses
    if (!['PROPOSED', 'DRAFT'].includes(project.status ?? '')) {
      return NextResponse.json(
        { error: 'Cannot delete project in current status' },
        { status: 400 }
      )
    }

    // Delete related votes first
    await prisma.vote.deleteMany({
      where: { projectId: id }
    })

    // Delete project
    await prisma.project.delete({
      where: { id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PROJECT_DELETED',
        entity: 'PROJECT',
        entityId: id,
        userId: session.user.id,
        changes: {
          title: project.title,
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (error: any) {
    console.error('Project deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}