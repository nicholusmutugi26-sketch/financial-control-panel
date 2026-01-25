import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import VoteForm from '@/components/forms/VoteForm'

export default async function UserProjectDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
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
        where: { userId: session.user.id },
        select: { vote: true }
      },
      budget: {
        select: {
          id: true,
          title: true,
          amount: true,
          status: true,
          allocatedAmount: true,
        }
      },
      _count: {
        select: { votes: true }
      }
    }
  })

  if (!project) {
    redirect('/dashboard/user/projects')
  }

  // Check if user is the creator
  const isCreator = project.createdBy === session.user.id

  const userVote = project.votes[0]?.vote || null

  return (
    <div className="space-y-6 max-w-4xl">
      <Link 
        href="/dashboard/user/projects"
        className="flex items-center gap-2 text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Projects
      </Link>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-3xl mb-2">{project.title}</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{project.status}</Badge>
                  {project.adminDecision && (
                    <Badge variant={project.adminDecision === 'APPROVED' ? 'default' : 'destructive'}>
                      {project.adminDecision}
                    </Badge>
                  )}
                  {project.progressPercentage !== null && (
                    <Badge variant="outline">{project.progressPercentage}% Progress</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={project.user?.profileImage || ''} />
                <AvatarFallback>{project.user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{project.user?.name}</p>
                <p className="text-sm text-gray-500">{project.user?.email}</p>
                <p className="text-xs text-gray-400 mt-1">Proposed on {formatDate(project.createdAt)}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Project Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{project.description}</p>
          </div>

          {project.budget && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Project Budget</h3>
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <p className="font-medium">{project.budget.title}</p>
                    <p className="text-sm text-gray-600">Allocated: KES {project.budget.amount?.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Spent: KES {project.budget.allocatedAmount?.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Status: {project.budget.status}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Show voting information if project is in VOTING status */}
          {project.status === 'VOTING' && !isCreator && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Vote on This Project</h3>
              <VoteForm 
                projectId={project.id}
                userVote={userVote}
              />
            </div>
          )}

          {/* Show voting summary if votes exist */}
          {project._count.votes > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Project Status</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Total Votes: {project._count.votes}</p>
                <p>Your Vote: {userVote === 1 ? '👍 In Favor' : userVote === -1 ? '👎 Against' : userVote === 0 ? '🤷 Abstain' : 'Not yet voted'}</p>
              </div>
            </div>
          )}

          {isCreator && project.status === 'VOTING' && (
            <div className="border-t pt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm text-blue-700">
                ℹ️ This project is currently under voting. You cannot vote on your own project.
              </p>
            </div>
          )}

          {project.status === 'REJECTED' && (
            <div className="border-t pt-4 p-4 bg-red-50 rounded">
              <p className="text-sm text-red-700">
                ❌ This project has been rejected by the administrator.
              </p>
            </div>
          )}

          {project.status === 'APPROVED' && (
            <div className="border-t pt-4 p-4 bg-green-50 rounded">
              <p className="text-sm text-green-700">
                ✓ This project has been approved and is awaiting budget assignment.
              </p>
            </div>
          )}

          {(project.status === 'STARTED' || project.status === 'PROGRESSING') && (
            <div className="border-t pt-4 p-4 bg-purple-50 rounded">
              <p className="text-sm text-purple-700">
                🚀 This project is currently in progress.
                {project.progressPercentage !== null && (
                  <span> Progress: {project.progressPercentage}%</span>
                )}
              </p>
            </div>
          )}

          {project.status === 'COMPLETED' && (
            <div className="border-t pt-4 p-4 bg-green-50 rounded">
              <p className="text-sm text-green-700">
                ✅ This project has been completed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
