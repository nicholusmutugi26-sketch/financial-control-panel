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
import AdminProjectActions from '@/components/admin/AdminProjectActions'

export default async function AdminProjectDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
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
          allocatedAmount: true,
        }
      }
    }
  })

  if (!project) {
    redirect('/dashboard/admin/projects')
  }

  // Calculate vote statistics
  const inFavorVotes = project.votes.filter(v => v.vote === 1).length
  const againstVotes = project.votes.filter(v => v.vote === -1).length
  const abstainVotes = project.votes.filter(v => v.vote === 0).length
  const totalVotes = project.votes.length

  return (
    <div className="space-y-6 max-w-4xl">
      <Link 
        href="/dashboard/admin/projects"
        className="flex items-center gap-2 text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-3xl mb-2">{project.title}</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{project.status}</Badge>
                  {project.approvalType && (
                    <Badge variant="outline">{project.approvalType}</Badge>
                  )}
                  {project.adminDecision && (
                    <Badge variant={project.adminDecision === 'APPROVED' ? 'default' : 'destructive'}>
                      {project.adminDecision}
                    </Badge>
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
              <h3 className="font-semibold mb-2">Associated Budget</h3>
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <p className="font-medium">{project.budget.title}</p>
                    <p className="text-sm text-gray-600">Amount: KES {project.budget.amount?.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Allocated: KES {project.budget.allocatedAmount?.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Status: {project.budget.status}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {totalVotes > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Voting Summary</h3>
              
              {/* Recommendation banner */}
              {project.status === 'VOTING' && totalVotes > 0 && (
                <div className={`mb-4 p-4 rounded ${inFavorVotes > againstVotes ? 'bg-green-50 border border-green-200' : againstVotes > inFavorVotes ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className={`text-sm font-semibold ${inFavorVotes > againstVotes ? 'text-green-800' : againstVotes > inFavorVotes ? 'text-red-800' : 'text-yellow-800'}`}>
                    {inFavorVotes > againstVotes 
                      ? `✓ Recommendation: Approve (${inFavorVotes}/${totalVotes} in favor)`
                      : againstVotes > inFavorVotes
                      ? `✗ Recommendation: Reject (${againstVotes}/${totalVotes} against)`
                      : `⚠ Mixed Result (${inFavorVotes} favor, ${againstVotes} against)`
                    }
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    However, you have final decision authority. You can approve or reject regardless of voting results.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{inFavorVotes}</p>
                    <p className="text-sm text-gray-600">In Favor</p>
                    {totalVotes > 0 && <p className="text-xs text-gray-500">{((inFavorVotes / totalVotes) * 100).toFixed(0)}%</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-gray-600">{abstainVotes}</p>
                    <p className="text-sm text-gray-600">Abstain</p>
                    {totalVotes > 0 && <p className="text-xs text-gray-500">{((abstainVotes / totalVotes) * 100).toFixed(0)}%</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{againstVotes}</p>
                    <p className="text-sm text-gray-600">Against</p>
                    {totalVotes > 0 && <p className="text-xs text-gray-500">{((againstVotes / totalVotes) * 100).toFixed(0)}%</p>}
                  </CardContent>
                </Card>
              </div>

              {totalVotes > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3">Votes ({totalVotes})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {project.votes.map(vote => (
                      <div key={vote.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={vote.user?.profileImage || ''} />
                            <AvatarFallback>{vote.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <p className="truncate">{vote.user?.name}</p>
                        </div>
                        <Badge variant={vote.vote === 1 ? 'default' : vote.vote === -1 ? 'destructive' : 'secondary'} className="text-xs">
                          {vote.vote === 1 ? '👍' : vote.vote === -1 ? '👎' : '🤷'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Admin Actions</h3>
            <AdminProjectActions projectId={project.id} projectStatus={project.status || 'PROPOSED'} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
