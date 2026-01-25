import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ProjectsTable from '@/components/tables/ProjectsTable'
import FilterBar from '@/components/dashboard/FilterBar'

export default async function UserProjectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  const status = searchParams.status as string || 'ALL'
  const search = searchParams.search as string
  const page = parseInt(searchParams.page as string || '1')
  const limit = parseInt(searchParams.limit as string || '10')

  // Show ALL projects (not just user's own)
  const where: any = {}

  if (status !== 'ALL') {
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
  ])

  // Calculate vote statistics for each project
  const projectsWithStats = projects.map(project => {
    const totalVotes = project.votes.length
    const inFavorVotes = project.votes.filter(v => v.vote === 1).length
    const againstVotes = project.votes.filter(v => v.vote === -1).length
    const abstainVotes = project.votes.filter(v => v.vote === 0).length
    const approvalRate = totalVotes > 0 ? (inFavorVotes / totalVotes) * 100 : 0
    
    return {
      ...project,
      voteStats: {
        total: totalVotes,
        inFavor: inFavorVotes,
        against: againstVotes,
        abstain: abstainVotes,
        approvalRate,
      }
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Projects</h1>
          <p className="text-gray-600">
            Review all project proposals, vote on projects in voting phase
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/user/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
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
            ]}
            defaultStatus={status}
            searchPlaceholder="Search projects..."
          />
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            Review all project proposals and participate in voting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectsTable 
            projects={projectsWithStats} 
            isAdmin={false}
            currentPage={page}
            totalItems={total}
            itemsPerPage={limit}
          />
        </CardContent>
      </Card>
    </div>
  )
}