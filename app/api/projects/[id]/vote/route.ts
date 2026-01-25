import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const voteSchema = z.object({
  vote: z.number().int().refine(v => [-1, 0, 1].includes(v), 'Vote must be -1 (against), 0 (abstain), or 1 (in favor)'),
})

export async function POST(
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
    const validatedData = voteSchema.parse(body)

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        votes: {
          include: {
            user: {
              select: { id: true, name: true }
            }
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

    // Check if project is in voting status
    if (project.status !== 'VOTING') {
      return NextResponse.json(
        { error: 'Project is not currently open for voting' },
        { status: 400 }
      )
    }

    // Check if user can vote (must be a USER, not the project creator)
    if (session.user.role !== 'USER') {
      return NextResponse.json(
        { error: 'Only regular users can vote' },
        { status: 403 }
      )
    }

    if (session.user.id === project.createdBy) {
      return NextResponse.json(
        { error: 'You cannot vote on your own project' },
        { status: 403 }
      )
    }

    // Upsert vote (allow users to change their vote)
    const vote = await prisma.vote.upsert({
      where: {
        projectId_userId: {
          projectId: id,
          userId: session.user.id,
        }
      },
      update: {
        vote: validatedData.vote,
        updatedAt: new Date(),
      },
      create: {
        projectId: id,
        userId: session.user.id,
        vote: validatedData.vote,
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PROJECT_VOTED',
        entity: 'Project',
        entityId: id,
        userId: session.user.id,
        changes: {
          projectId: id,
          vote: validatedData.vote === 1 ? 'in_favor' : validatedData.vote === -1 ? 'against' : 'abstain',
        }
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Vote submitted successfully',
        vote
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Vote error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    )
  }
}
