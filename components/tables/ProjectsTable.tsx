// components/tables/ProjectsTable.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  MoreVertical, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Users,
  Vote,
  TrendingUp,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'

interface ProjectsTableProps {
  projects: any[]
  isAdmin?: boolean
  currentPage?: number
  totalItems?: number
  itemsPerPage?: number
}

export default function ProjectsTable({ 
  projects, 
  isAdmin = false,
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10
}: ProjectsTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Calculate vote statistics for each project
  const projectsWithStats = projects.map(project => {
    const totalVotes = project.votes.length
    const inFavorVotes = project.votes.filter((v: any) => v.vote === 1).length
    const againstVotes = project.votes.filter((v: any) => v.vote === -1).length
    const abstainVotes = project.votes.filter((v: any) => v.vote === 0).length
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

  const handleStartVoting = async (projectId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/start-voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to start voting')
      }

      toast.success('Voting started successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (projectId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' })
      })

      if (!response.ok) {
        throw new Error('Failed to approve project')
      }

      toast.success('Project approved successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (projectId: string) => {
    if (!confirm('Are you sure you want to reject this project?')) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' })
      })

      if (!response.ok) {
        throw new Error('Failed to reject project')
      }

      toast.success('Project rejected')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
        <p className="text-gray-500 mt-2">
          {isAdmin ? 'No projects have been proposed yet.' : 'You haven\'t proposed any projects yet.'}
        </p>
        {!isAdmin && (
          <Button className="mt-4" asChild>
            <Link href="/dashboard/user/projects/new">
              Propose Your First Project
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              {isAdmin && <TableHead>Proposed By</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Voting Progress</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <Link 
                    href={`/dashboard/${isAdmin ? 'admin' : 'user'}/projects/${project.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {project.title}
                  </Link>
                  <p className="text-sm text-gray-500 truncate max-w-xs">
                    {project.description}
                  </p>
                </TableCell>
                {isAdmin && project.user && (
                  <TableCell>
                    <div>
                      <p className="font-medium">{project.user.name}</p>
                      <p className="text-sm text-gray-500">{project.user.email}</p>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {projectsWithStats.find(p => p.id === project.id)?.voteStats?.total || 0} votes
                  </p>
                </TableCell>
                <TableCell>
                  {project.status === 'VOTING' && (
                    <div className="space-y-2">
                      <Progress value={projectsWithStats.find(p => p.id === project.id)?.voteStats?.approvalRate || 0} className="h-2" />
                      <div className="flex justify-between text-xs gap-2">
                        <span className="text-green-600 text-nowrap">
                          {projectsWithStats.find(p => p.id === project.id)?.voteStats?.inFavor || 0} favor
                        </span>
                        <span className="text-red-600 text-nowrap">
                          {projectsWithStats.find(p => p.id === project.id)?.voteStats?.against || 0} against
                        </span>
                        <span className="text-gray-600 text-nowrap">
                          {projectsWithStats.find(p => p.id === project.id)?.voteStats?.approvalRate?.toFixed(1) || 0}%
                        </span>
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {project.budget ? (
                    <div>
                      <p className="font-medium">{project.budget.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(project.budget.amount)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">No budget</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{formatDate(project.createdAt)}</div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link 
                          href={`/dashboard/${isAdmin ? 'admin' : 'user'}/projects/${project.id}`}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      
                      {isAdmin && project.status === 'UNDER_REVIEW' && (
                        <DropdownMenuItem 
                          onClick={() => handleStartVoting(project.id)}
                          className="cursor-pointer text-blue-600"
                        >
                          <Vote className="mr-2 h-4 w-4" />
                          Start Voting
                        </DropdownMenuItem>
                      )}
                      
                      {isAdmin && project.status === 'VOTING' && project.voteStats?.approvalRate === 100 && (
                        <DropdownMenuItem 
                          onClick={() => handleApprove(project.id)}
                          className="cursor-pointer text-green-600"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve Project
                        </DropdownMenuItem>
                      )}
                      
                      {isAdmin && (project.status === 'PROPOSED' || project.status === 'UNDER_REVIEW') && (
                        <DropdownMenuItem 
                          onClick={() => handleReject(project.id)}
                          className="cursor-pointer text-red-600"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Project
                        </DropdownMenuItem>
                      )}
                      
                      {!isAdmin && project.status === 'VOTING' && (
                        <DropdownMenuItem asChild>
                          <Link 
                            href={`/dashboard/user/projects-to-vote/${project.id}`}
                            className="cursor-pointer"
                          >
                            <Vote className="mr-2 h-4 w-4" />
                            Cast Vote
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalItems > itemsPerPage && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} projects
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => router.push(`?page=${currentPage - 1}`)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * itemsPerPage >= totalItems}
              onClick={() => router.push(`?page=${currentPage + 1}`)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  )
}