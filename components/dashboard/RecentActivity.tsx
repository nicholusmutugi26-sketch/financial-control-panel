'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Activity, ArrowUpRight, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: 'budget' | 'expenditure' | 'transaction' | 'project'
  action: string
  title: string
  amount?: number
  status: string
  timestamp: Date
  user?: {
    name: string
  }
}

interface RecentActivityProps {
  activities: ActivityItem[]
  title?: string
  description?: string
  showViewAll?: boolean
  viewAllLink?: string
}

export default function RecentActivity({
  activities,
  title = 'Recent Activity',
  description = 'Latest activities in the system',
  showViewAll = true,
  viewAllLink = '/dashboard/activity'
}: RecentActivityProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'budget':
        return DollarSign
      case 'expenditure':
        return Activity
      case 'transaction':
        return DollarSign
      case 'project':
        return Activity
      default:
        return Activity
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'SUCCESS':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'SUCCESS':
        return CheckCircle
      case 'REJECTED':
      case 'FAILED':
        return XCircle
      case 'PENDING':
        return Clock
      default:
        return Clock
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {showViewAll && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={viewAllLink}>
                View all
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const Icon = getIcon(activity.type)
              const StatusIcon = getStatusIcon(activity.status)
              
              return (
                <div key={activity.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500 capitalize">
                          {activity.type} • {formatDate(activity.timestamp)}
                        </p>
                        {activity.user && (
                          <p className="text-sm text-gray-500">
                            • {activity.user.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {activity.amount && (
                      <span className="font-semibold">
                        {formatCurrency(activity.amount)}
                      </span>
                    )}
                    <Badge className={getStatusColor(activity.status)}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {activity.status}
                    </Badge>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold">No activity yet</h3>
              <p className="text-gray-500 mt-2">
                Activities will appear here as they happen
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}