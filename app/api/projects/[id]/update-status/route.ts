import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getIO } from '@/lib/realtime'

// Valid status transitions
const VALID_TRANSITIONS: { [key: string]: string[] } = {
  'PROPOSED': ['VOTING', 'APPROVED', 'REJECTED'],
  'VOTING': ['APPROVED', 'REJECTED'],
  'APPROVED': ['STARTED'],
  'STARTED': ['PROGRESSING', 'NEARING_COMPLETION', 'COMPLETED', 'TERMINATED'],
  'PROGRESSING': ['COMPLETED', 'TERMINATED'],
  'NEARING_COMPLETION': ['COMPLETED', 'TERMINATED'],
  'COMPLETED': [],
  'REJECTED': [],
  'TERMINATED': [],
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { newStatus, progressPercentage } = await req.json()

    if (!newStatus) {
      return NextResponse.json(
        { error: 'New status is required' },
        { status: 400 }
      )
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Validate the transition
    const currentStatus = project.status as keyof typeof VALID_TRANSITIONS
    if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${project.status} to ${newStatus}` },
        { status: 400 }
      )
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        progressPercentage: progressPercentage ?? project.progressPercentage,
      },
      include: { user: true }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PROJECT_STATUS_UPDATED',
        entity: 'Project',
        entityId: project.id,
        userId: session.user.id,
        changes: {
          from: project.status,
          to: newStatus,
          progressPercentage: updatedProject.progressPercentage,
        }
      }
    })

    // Notify project creator and admins (wrapped in try-catch to handle socket.io issues gracefully)
    try {
      const io = getIO()
      if (io) {
        io.to(`user-${project.createdBy}`).emit('project-updated', {
          projectId: project.id,
          status: newStatus,
          progressPercentage: updatedProject.progressPercentage,
          message: `Your project status has been updated to ${newStatus}`
        })

        // Notify all admins
        io.to('admin-room').emit('project-updated', {
          projectId: project.id,
          status: newStatus,
          progressPercentage: updatedProject.progressPercentage,
        })
      }
    } catch (socketError) {
      // Socket.io not initialized or other socket error - log but don't fail the request
      console.warn('[UPDATE_STATUS_SOCKET_WARN]', socketError)
    }

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('[UPDATE_PROJECT_STATUS_ERROR]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
