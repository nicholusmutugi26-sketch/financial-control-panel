'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  DollarSign, 
  Calendar, 
  User, 
  FileText,
  MoreVertical,
  Eye,
  Edit,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'

interface BudgetCardProps {
  budget: {
    id: string
    title: string
    description?: string
    amount: number
    allocatedAmount: number
    status: string
    priority: string
    disbursementType: string
    createdAt: Date
    user?: {
      name: string
      email: string
    }
    _count?: {
      expenditures: number
      batches: number
    }
  }
  isAdmin?: boolean
  showActions?: boolean
}

export default function BudgetCard({ 
  budget, 
  isAdmin = false,
  showActions = true 
}: BudgetCardProps) {
  const allocatedPercentage = budget.amount > 0 
    ? (budget.allocatedAmount / budget.amount) * 100 
    : 0
  
  const availableAmount = budget.amount - budget.allocatedAmount

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="line-clamp-1">{budget.title}</CardTitle>
            <CardDescription className="mt-1">
              {budget.description || 'No description'}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor(budget.status)}>
              {budget.status}
            </Badge>
            <Badge className={getPriorityColor(budget.priority)}>
              {budget.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Amount Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total Amount</span>
            <span className="text-lg font-bold">{formatCurrency(budget.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Allocated</span>
            <span className="text-green-600 font-semibold">
              {formatCurrency(budget.allocatedAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Available</span>
            <span className="text-blue-600 font-semibold">
              {formatCurrency(availableAmount)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>Allocation Progress</span>
            <span>{allocatedPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={allocatedPercentage} className="h-2" />
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{budget.disbursementType}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{formatDate(budget.createdAt)}</span>
          </div>
          {budget._count && (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{budget._count.expenditures} expenses</span>
              </div>
              {budget.disbursementType === 'BATCHES' && budget._count.batches > 0 && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{budget._count.batches} batches</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* User Info (Admin only) */}
        {isAdmin && budget.user && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium">{budget.user.name}</p>
                <p className="text-xs text-gray-500">{budget.user.email}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="border-t pt-4">
          <div className="flex w-full justify-between">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/${isAdmin ? 'admin' : 'user'}/budgets/${budget.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Link>
            </Button>
            
            {(budget.status === 'DRAFT' || budget.status === 'PENDING') && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/${isAdmin ? 'admin' : 'user'}/budgets/${budget.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
            
            {isAdmin && (budget.status === 'APPROVED' || budget.status === 'PARTIALLY_DISBURSED') && (
              <Button size="sm" asChild>
                <Link href={`/dashboard/admin/budgets/${budget.id}#disburse`}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Disburse
                </Link>
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}