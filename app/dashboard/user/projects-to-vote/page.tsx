import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import VoteForm from '@/components/forms/VoteForm'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default async function ProjectsToVotePage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  // Get all projects that are in VOTING status and not created by this user
  const votingProjects = await prisma.project.findMany({
    where: {
      status: 'VOTING',
      createdBy: {
        not: session.user.id
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
        }
      },
      votes: {
        where: {
          userId: session.user.id
        }
      },
      _count: {
        select: {
          votes: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Get vote statistics for each project
  const projectsWithStats = votingProjects.map(project => {
    const allVotes = project.votes
    const userVote = allVotes.find(v => v.userId === session.user.id)?.vote
    
    return {
      ...project,
      userVote,
      totalVotes: project._count.votes,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vote on Projects</h1>
        <p className="text-gray-600 mt-2">
          Review and vote on projects proposed by other users
        </p>
      </div>

      {projectsWithStats.length === 0 ? (
        <Card>
          <CardContent className="pt-12 text-center">
            <p className="text-gray-500 mb-4">No projects available for voting at this time</p>
            <Link href="/dashboard/user/projects" className="text-primary hover:underline flex items-center justify-center gap-2">
              View My Projects <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projectsWithStats.map(project => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                    <CardDescription className="mt-2">
                      Proposed by {project.user?.name} on {formatDate(project.createdAt)}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">VOTING</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-gray-600 line-clamp-3">{project.description}</p>
                
                <div className="text-xs text-gray-500">
                  Total Votes: {project.totalVotes}
                </div>

                {project.userVote !== undefined && project.userVote !== null && (
                  <div className="text-xs font-medium">
                    Your Vote: {
                      project.userVote === 1 ? '👍 In Favor' :
                      project.userVote === -1 ? '👎 Against' :
                      '🤷 Abstain'
                    }
                  </div>
                )}

                <VoteForm 
                  projectId={project.id}
                  userVote={project.userVote}
                />

                <Link 
                  href={`/dashboard/user/projects-to-vote/${project.id}`}
                  className="text-xs text-primary hover:underline block mt-4"
                >
                  View Full Details <ArrowRight className="inline h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
