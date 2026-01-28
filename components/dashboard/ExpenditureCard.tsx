'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Calendar, 
  User, 
  DollarSign,
  Eye,
  Edit,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'

interface ExpenditureCardProps {
  expenditure: {
    id: string
    title: string
    description?: string
    amount: number
    status: string
    priority: string
    createdAt: Date
    user?: {
      name: string
      email: string
    }
    budget?: {
      title: string
    }
    items?: Array<{
      id: string
      name: string
      amount: number
    }>
    _count?: {
      items: number
    }
  }
  isAdmin?: boolean
  showActions?: boolean
}

export default function ExpenditureCard({ 
  expenditure, 
  isAdmin = false,
  showActions = true 
}: ExpenditureCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="line-clamp-1">{expenditure.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {expenditure.description || 'No description'}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 ml-2">
            <Badge className={getPriorityColor(expenditure.priority)}>
              {expenditure.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Amount Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-400" />
            <span className="text-2xl font-bold">{formatCurrency(expenditure.amount)}</span>
          </div>
          {expenditure.budget && (
            <Badge variant="outline" className="text-sm">
              {expenditure.budget.title}
            </Badge>
          )}
        </div>

        {/* Items Preview */}
        {(expenditure.items && expenditure.items.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Items:</p>
            <div className="space-y-1">
              {expenditure.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate">{item.name}</span>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              {expenditure.items.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{expenditure.items.length - 3} more items
                </p>
              )}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {expenditure._count?.items || expenditure.items?.length || 0} items
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{formatDate(expenditure.createdAt)}</span>
          </div>
        </div>

        {/* User Info (Admin only) */}
        {isAdmin && expenditure.user && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium">{expenditure.user.name}</p>
                <p className="text-xs text-gray-500">{expenditure.user.email}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="border-t pt-4">
          <div className="flex w-full justify-between">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/${isAdmin ? 'admin' : 'user'}/expenditures/${expenditure.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </Button>
            
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/${isAdmin ? 'admin' : 'user'}/expenditures/${expenditure.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
