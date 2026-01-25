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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.status !== 'UNDER_REVIEW') {
      return NextResponse.json(
        { error: 'Project must be under review to start voting' },
        { status: 400 }
      )
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status: 'VOTING',
        updatedAt: new Date(),
      }
    })

    // Get all users to notify
    const allUsers = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, email: true }
    })

    // Create notifications for all users
    const notifications = allUsers.map(user => ({
      userId: user.id,
      title: 'Voting Started',
      message: `Voting has started for project "${project.title}". Please cast your vote.`,
      type: 'VOTING_STARTED',
      read: false,
      data: {
        projectId: project.id,
        projectTitle: project.title,
      }
    }))

    await prisma.notification.createMany({
      data: notifications,
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'VOTING_STARTED',
        entity: 'PROJECT',
        entityId: project.id,
        userId: session.user.id,
        changes: {
          from: project.status,
          to: 'VOTING',
          notifiedUsers: allUsers.length,
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Voting started successfully',
      project: updatedProject,
      notifiedUsers: allUsers.length,
    })
  } catch (error: any) {
    console.error('Start voting error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}