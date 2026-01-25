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
  DollarSign,
  RefreshCw,
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
import {
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'

interface BudgetsTableProps {
  budgets: any[]
  isAdmin?: boolean
  currentPage?: number
  totalItems?: number
  itemsPerPage?: number
}

export default function BudgetsTable({ 
  budgets, 
  isAdmin = false,
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10
}: BudgetsTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleApprove = async (budgetId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/budgets/${budgetId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocatedAmount: 0 })
      })

      if (!response.ok) {
        throw new Error('Failed to approve budget')
      }

      toast.success('Budget approved successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (budgetId: string) => {
    if (!confirm('Are you sure you want to reject this budget?')) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/budgets/${budgetId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to reject budget')
      }

      toast.success('Budget rejected')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestRevision = async (budgetId: string) => {
    const reason = prompt('Please enter the reason for revision request:')
    if (!reason) return

    try {
      setLoading(true)
      const response = await fetch(`/api/budgets/${budgetId}/request-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        throw new Error('Failed to request revision')
      }

      toast.success('Revision requested')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (budgets.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold">No budgets found</h3>
        <p className="text-gray-500 mt-2">
          {isAdmin ? 'No budgets have been created yet.' : 'You haven\'t created any budgets yet.'}
        </p>
        {!isAdmin && (
          <Button className="mt-4" asChild>
            <Link href="/dashboard/user/budgets/new">
              Create Your First Budget
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
              <TableHead>Items</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Allocated</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((budget) => (
              <TableRow key={budget.id}>
                <TableCell className="font-medium">
                  <Link 
                    href={`/dashboard/${isAdmin ? 'admin' : 'user'}/budgets/${budget.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {budget.title}
                  </Link>
                  {budget.description && (
                    <p className="text-sm text-gray-500 truncate max-w-xs">
                      {budget.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {budget.items && budget.items.length > 0 ? (
                    <div className="text-sm">
                      {budget.items.map((it: any, i: number) => (
                        <div key={it.id} className="truncate">
                          {it.name} — {formatCurrency(it.unitPrice)}{it.quantity && it.quantity > 1 ? ` x${it.quantity}` : ''}
                        </div>
                      ))}
                      {budget._count?.items && budget._count.items > (budget.items?.length || 0) && (
                        <div className="text-xs text-gray-500">+{budget._count.items - (budget.items?.length || 0)} more</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">—</div>
                  )}
                </TableCell>
                <TableCell>
                  {isAdmin && budget.user && (
                    <div>
                      <p className="font-medium">{budget.user.name}</p>
                      <p className="text-sm text-gray-500">{budget.user.email}</p>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-semibold">{formatCurrency(budget.amount)}</div>
                  {budget.disbursementType === 'BATCHES' && (
                    <p className="text-xs text-gray-500">
                      {budget._count?.batches || 0} batches
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{formatCurrency(budget.allocatedAmount)}</div>
                  {budget.amount > 0 && (
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(budget.allocatedAmount / budget.amount) * 100}%` }}
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(budget.priority)}>
                    {budget.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(budget.status)}>
                    {budget.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{formatDate(budget.createdAt)}</div>
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
                          href={`/dashboard/${isAdmin ? 'admin' : 'user'}/budgets/${budget.id}`}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      
                      {isAdmin && budget.status === 'PENDING' && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => handleApprove(budget.id)}
                            className="cursor-pointer text-green-600"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleReject(budget.id)}
                            className="cursor-pointer text-red-600"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleRequestRevision(budget.id)}
                            className="cursor-pointer"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Request Revision
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {isAdmin && (budget.status === 'APPROVED' || budget.status === 'PARTIALLY_DISBURSED') && (
                        <DropdownMenuItem asChild>
                          <Link 
                            href={`/dashboard/admin/budgets/${budget.id}#disburse`}
                            className="cursor-pointer text-blue-600"
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Disburse Funds
                          </Link>
                        </DropdownMenuItem>
                      )}
                      
                      {!isAdmin && budget.status === 'PENDING' && (
                        <DropdownMenuItem asChild>
                          <Link 
                            href={`/dashboard/user/budgets/${budget.id}/edit`}
                            className="cursor-pointer"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Edit Budget
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} budgets
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