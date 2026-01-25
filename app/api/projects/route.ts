import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createProjectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)

    // Create project
    const project = await prisma.project.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        createdBy: session.user.id,
        status: 'PROPOSED',
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PROJECT_CREATED',
        entity: 'PROJECT',
        entityId: project.id,
        userId: session.user.id,
        changes: {
          title: project.title,
          status: project.status,
        }
      }
    })

    // Create notification for admin
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (admin) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New Project Proposal',
          message: `User ${session.user.name} has proposed a new project: "${project.title}"`,
          type: 'PROJECT_PROPOSED',
          read: false,
          data: {
            projectId: project.id,
            userId: session.user.id,
            userName: session.user.name,
          }
        }
      })
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Project proposed successfully',
        project 
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Project creation error:', error)
    
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}

    // Role-based filtering
    if (session.user.role !== 'ADMIN') {
      where.createdBy = session.user.id
    }

    // Filters
    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
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
          _count: {
            select: {
              votes: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ])

    // Calculate vote statistics
    const projectsWithStats = projects.map(project => {
      const totalVotes = project.votes.length
      const approveVotes = project.votes.filter(v => v.vote).length
      const rejectVotes = totalVotes - approveVotes
      
      return {
        ...project,
        voteStats: {
          total: totalVotes,
          approve: approveVotes,
          reject: rejectVotes,
          approvalRate: totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0,
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: projectsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Project fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}