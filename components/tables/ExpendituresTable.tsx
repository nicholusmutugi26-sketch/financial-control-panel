// components/tables/ExpendituresTable.tsx
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
  AlertCircle,
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'

interface ExpendituresTableProps {
  expenditures: any[]
  isAdmin?: boolean
  currentPage?: number
  totalItems?: number
  itemsPerPage?: number
}

export default function ExpendituresTable({ 
  expenditures, 
  isAdmin = false,
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10
}: ExpendituresTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Expenditures are view-only for admins now; approval flows removed.

  if (expenditures.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold">No expenditures found</h3>
        <p className="text-gray-500 mt-2">
          {isAdmin ? 'No expenditures have been created yet.' : 'You haven\'t created any expenditures yet.'}
        </p>
        {!isAdmin && (
          <Button className="mt-4" asChild>
            <Link href="/dashboard/user/expenditures/new">
              Create Your First Expenditure
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
              {isAdmin && <TableHead>User</TableHead>}
              <TableHead>Amount</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Priority</TableHead>
              {/* Status column removed — expenditures are view-only */}
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenditures.map((expenditure) => (
              <TableRow key={expenditure.id}>
                <TableCell className="font-medium">
                  <Link 
                    href={`/dashboard/${isAdmin ? 'admin' : 'user'}/expenditures/${expenditure.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {expenditure.title}
                  </Link>
                  {expenditure.description && (
                    <p className="text-sm text-gray-500 truncate max-w-xs">
                      {expenditure.description}
                    </p>
                  )}
                  {expenditure.budget && (
                    <p className="text-xs text-gray-500">
                      Budget: {expenditure.budget.title}
                    </p>
                  )}
                </TableCell>
                {isAdmin && expenditure.user && (
                  <TableCell>
                    <div>
                      <p className="font-medium">{expenditure.user.name}</p>
                      <p className="text-sm text-gray-500">{expenditure.user.email}</p>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="font-semibold">{formatCurrency(expenditure.amount)}</div>
                  <p className="text-xs text-gray-500">
                    {expenditure._count?.items || 0} items
                  </p>
                </TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(expenditure.priority)}>
                    {expenditure.priority}
                  </Badge>
                </TableCell>
                {/* Status display removed — view-only table */}
                <TableCell>
                  <div className="text-sm">{formatDate(expenditure.createdAt)}</div>
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
                          href={`/dashboard/${isAdmin ? 'admin' : 'user'}/expenditures/${expenditure.id}`}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      
                      {/* No admin actions — admins can only view expenditures */}
                      
                      {/* Non-admin users can only view expenditures; no edit actions */}
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} expenditures
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