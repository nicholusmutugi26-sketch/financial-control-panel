import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import VoteForm from '@/components/forms/VoteForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ProjectVotePage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'USER') {
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
      budget: {
        select: {
          id: true,
          title: true,
          amount: true,
          status: true,
        }
      }
    }
  })

  if (!project) {
    redirect('/dashboard/user/projects-to-vote')
  }

  // Get user's vote if they've voted
  const userVote = project.votes.find(v => v.userId === session.user.id)

  // Calculate vote statistics
  const inFavorVotes = project.votes.filter(v => v.vote === 1).length
  const againstVotes = project.votes.filter(v => v.vote === -1).length
  const abstainVotes = project.votes.filter(v => v.vote === 0).length
  const totalVotes = project.votes.length

  return (
    <div className="space-y-6 max-w-4xl">
      <Link 
        href="/dashboard/user/projects-to-vote"
        className="flex items-center gap-2 text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Voting Projects
      </Link>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-3xl mb-2">{project.title}</CardTitle>
                <CardDescription>
                  Status: <Badge variant="secondary">{project.status}</Badge>
                </CardDescription>
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
              <h3 className="font-semibold mb-2">Associated Budget</h3>
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <p className="font-medium">{project.budget.title}</p>
                    <p className="text-sm text-gray-600">Amount: KES {project.budget.amount?.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Status: {project.budget.status}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Voting Summary</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{inFavorVotes}</p>
                  <p className="text-sm text-gray-600">In Favor</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-gray-600">{abstainVotes}</p>
                  <p className="text-sm text-gray-600">Abstain</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-red-600">{againstVotes}</p>
                  <p className="text-sm text-gray-600">Against</p>
                </CardContent>
              </Card>
            </div>

            {project.status === 'VOTING' && (
              <div>
                <h3 className="font-semibold mb-3">Your Vote</h3>
                <VoteForm 
                  projectId={project.id}
                  userVote={userVote?.vote}
                />
                {userVote && (
                  <p className="text-xs text-gray-500 mt-3">
                    You can change your vote at any time before voting closes
                  </p>
                )}
              </div>
            )}
          </div>

          {totalVotes > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Votes ({totalVotes})</h3>
              <div className="space-y-3">
                {project.votes.map(vote => (
                  <div key={vote.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={vote.user?.profileImage || ''} />
                        <AvatarFallback>{vote.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{vote.user?.name}</p>
                      </div>
                    </div>
                    <Badge variant={vote.vote === 1 ? 'default' : vote.vote === -1 ? 'destructive' : 'secondary'}>
                      {vote.vote === 1 ? '👍 In Favor' : vote.vote === -1 ? '👎 Against' : '🤷 Abstain'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
