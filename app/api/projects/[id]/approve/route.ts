import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getIO } from '@/lib/realtime'

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

    const { decision, approvalType } = await req.json()

    // Validate decision
    if (!['APPROVED', 'REJECTED', 'SEND_TO_VOTING'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision' },
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

    // Only allow decision on PROPOSED or VOTING projects
    if (project.status !== 'PROPOSED' && project.status !== 'VOTING') {
      return NextResponse.json(
        { error: `Cannot modify project in ${project.status} status` },
        { status: 400 }
      )
    }

    let updatedProject

    if (decision === 'SEND_TO_VOTING') {
      // Send to voting
      updatedProject = await prisma.project.update({
        where: { id: params.id },
        data: {
          status: 'VOTING',
          approvalType: 'VOTING',
        },
        include: { user: true }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PROJECT_SENT_TO_VOTING',
          entity: 'Project',
          entityId: project.id,
          userId: session.user.id,
        }
      })

      // Notify creator (wrapped in try-catch for socket.io)
      try {
        getIO().to(`user-${project.createdBy}`).emit('project-updated', {
          projectId: project.id,
          status: 'VOTING',
          message: 'Your project has been sent to voting'
        })
      } catch (socketError) {
        console.warn('[APPROVE_SOCKET_WARN]', socketError)
      }
    } else if (decision === 'APPROVED') {
      // Approve the project
      updatedProject = await prisma.project.update({
        where: { id: params.id },
        data: {
          status: 'APPROVED',
          adminDecision: 'APPROVED',
          approvalType: approvalType || 'DIRECT',
        },
        include: { user: true }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PROJECT_APPROVED',
          entity: 'Project',
          entityId: project.id,
          userId: session.user.id,
        }
      })

      // Notify creator (wrapped in try-catch for socket.io)
      try {
        getIO().to(`user-${project.createdBy}`).emit('project-updated', {
          projectId: project.id,
          status: 'APPROVED',
          message: 'Your project has been approved'
        })
      } catch (socketError) {
        console.warn('[APPROVE_SOCKET_WARN]', socketError)
      }
    } else if (decision === 'REJECTED') {
      // Reject the project
      updatedProject = await prisma.project.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
          adminDecision: 'REJECTED',
        },
        include: { user: true }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'PROJECT_REJECTED',
          entity: 'Project',
          entityId: project.id,
          userId: session.user.id,
        }
      })

      // Notify creator (wrapped in try-catch for socket.io)
      try {
        getIO().to(`user-${project.createdBy}`).emit('project-updated', {
          projectId: project.id,
          status: 'REJECTED',
          message: 'Your project has been rejected'
        })
      } catch (socketError) {
        console.warn('[APPROVE_SOCKET_WARN]', socketError)
      }
    }

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('[PROJECT_APPROVE_ERROR]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
