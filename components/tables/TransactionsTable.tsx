// components/tables/TransactionsTable.tsx
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'

interface TransactionsTableProps {
  transactions: any[]
  isAdmin?: boolean
  currentPage?: number
  totalItems?: number
  itemsPerPage?: number
}

export default function TransactionsTable({ 
  transactions, 
  isAdmin = false,
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10
}: TransactionsTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRetry = async (transactionId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/transactions/${transactionId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to retry transaction')
      }

      toast.success('Transaction retry initiated')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (transactionId: string) => {
    if (!confirm('Are you sure you want to cancel this transaction?')) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel transaction')
      }

      toast.success('Transaction cancelled')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold">No transactions found</h3>
        <p className="text-gray-500 mt-2">
          {isAdmin ? 'No transactions have been processed yet.' : 'You haven\'t made any transactions yet.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              {isAdmin && <TableHead>User</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>M-Pesa Code</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {transaction.reference || 'N/A'}
                  {transaction.budget && (
                    <p className="text-xs text-gray-500">
                      Budget: {transaction.budget.title}
                    </p>
                  )}
                  {transaction.expenditure && (
                    <p className="text-xs text-gray-500">
                      Expenditure: {transaction.expenditure.title}
                    </p>
                  )}
                </TableCell>
                {isAdmin && transaction.user && (
                  <TableCell>
                    <div>
                      <p className="font-medium">{transaction.user.name}</p>
                      <p className="text-sm text-gray-500">{transaction.user.email}</p>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Badge className={
                    transaction.type === 'DISBURSEMENT' ? 'bg-green-100 text-green-800' :
                    transaction.type === 'REVERSAL' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {transaction.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-semibold">{formatCurrency(transaction.amount)}</div>
                  <p className="text-xs text-gray-500">
                    {transaction.phoneNumber}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {transaction.mpesaCode ? (
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {transaction.mpesaCode}
                    </code>
                  ) : (
                    <span className="text-gray-500 text-sm">Pending</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{formatDate(transaction.createdAt)}</div>
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
                          href={`/dashboard/${isAdmin ? 'admin' : 'user'}/transactions/${transaction.id}`}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      
                      {isAdmin && transaction.status === 'FAILED' && (
                        <DropdownMenuItem 
                          onClick={() => handleRetry(transaction.id)}
                          className="cursor-pointer text-blue-600"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry Transaction
                        </DropdownMenuItem>
                      )}
                      
                      {isAdmin && transaction.status === 'PENDING' && (
                        <DropdownMenuItem 
                          onClick={() => handleCancel(transaction.id)}
                          className="cursor-pointer text-red-600"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel Transaction
                        </DropdownMenuItem>
                      )}
                      
                      {transaction.mpesaCode && (
                        <DropdownMenuItem 
                          onClick={() => navigator.clipboard.writeText(transaction.mpesaCode)}
                          className="cursor-pointer"
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Copy M-Pesa Code
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} transactions
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