import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  BarChart3, 
  Users, 
  CheckCircle,
  Clock,
  TrendingUp,
  Vote
} from 'lucide-react'
import ProjectsTable from '@/components/tables/ProjectsTable'
import FilterBar from '@/components/dashboard/FilterBar'

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  const status = searchParams.status as string || 'ALL'
  const search = searchParams.search as string
  const page = parseInt(searchParams.page as string || '1')
  const limit = parseInt(searchParams.limit as string || '10')

  const where: any = {}

  if (status !== 'ALL') {
    where.status = status
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [projects, total, statistics] = await Promise.all([
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
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.project.count({ where }),
    prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PROPOSED' THEN 1 END) as proposed_count,
        COUNT(CASE WHEN status = 'UNDER_REVIEW' THEN 1 END) as under_review_count,
        COUNT(CASE WHEN status = 'VOTING' THEN 1 END) as voting_count,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status IN ('STARTED', 'PROGRESSING') THEN 1 END) as active_count
      FROM "Project"
    ` as any,
  ])

  // Calculate vote statistics for each project
  const projectsWithStats = projects.map(project => {
    const totalVotes = project.votes.length
    const approveVotes = project.votes.filter(v => v.vote).length
    const rejectVotes = totalVotes - approveVotes
    const approvalRate = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0
    
    return {
      ...project,
      voteStats: {
        total: totalVotes,
        approve: approveVotes,
        reject: rejectVotes,
        approvalRate,
      }
    }
  })

  const stats = statistics[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
          <p className="text-gray-600">
            Review and manage all project proposals
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">
              All project proposals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proposed</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.proposed_count}</div>
            <p className="text-xs text-gray-500">
              Awaiting review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voting</CardTitle>
            <Vote className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.voting_count}</div>
            <p className="text-xs text-gray-500">
              Currently voting
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_count}</div>
            <p className="text-xs text-gray-500">
              In progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <FilterBar
            filters={[
              { label: 'All', value: 'ALL' },
              { label: 'Proposed', value: 'PROPOSED' },
              { label: 'Under Review', value: 'UNDER_REVIEW' },
              { label: 'Voting', value: 'VOTING' },
              { label: 'Approved', value: 'APPROVED' },
              { label: 'Rejected', value: 'REJECTED' },
              { label: 'Started', value: 'STARTED' },
              { label: 'Progressing', value: 'PROGRESSING' },
              { label: 'Nearing Completion', value: 'NEARING_COMPLETION' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Terminated', value: 'TERMINATED' },
              { label: 'Revoked', value: 'REVOKED' },
            ]}
            defaultStatus={status}
            searchPlaceholder="Search projects by title, description, or user..."
          />
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            Review and manage project proposals from all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectsTable 
            projects={projectsWithStats} 
            isAdmin={true}
            currentPage={page}
            totalItems={total}
            itemsPerPage={limit}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Review Projects</h3>
                <p className="text-sm text-gray-500">Review pending project proposals</p>
              </div>
            </div>
            <Button className="w-full" asChild>
              <Link href="/dashboard/admin/projects?status=PROPOSED">
                Review Proposed
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Vote className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Start Voting</h3>
                <p className="text-sm text-gray-500">Start voting for reviewed projects</p>
              </div>
            </div>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/dashboard/admin/projects?status=UNDER_REVIEW">
                View Under Review
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Active Projects</h3>
                <p className="text-sm text-gray-500">Monitor ongoing projects</p>
              </div>
            </div>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/dashboard/admin/projects?status=STARTED,PROGRESSING">
                View Active
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}