'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet,
  BarChart3,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface StatsCardsProps {
  stats: {
    totalBudget: number
    totalExpenditures: number
    pendingBudgets: number
    pendingExpenditures: number
    activeProjects: number
    availableBalance: number
    totalUsers?: number
    totalDisbursed?: number
  }
  type?: 'admin' | 'user'
}

export default function StatsCards({ stats, type = 'user' }: StatsCardsProps) {
  const cards = [
    {
      title: type === 'admin' ? 'Total Budget' : 'My Total Budget',
      value: formatCurrency(stats.totalBudget),
      icon: Wallet,
      change: '+12.5%',
      trend: 'up',
      description: 'Total approved budget amount'
    },
    {
      title: type === 'admin' ? 'Available Balance' : 'My Available Balance',
      value: formatCurrency(stats.availableBalance),
      icon: DollarSign,
      change: '+5.2%',
      trend: 'up',
      description: 'Remaining balance'
    },
    {
      title: type === 'admin' ? 'Total Expenditures' : 'My Expenditures',
      value: formatCurrency(stats.totalExpenditures),
      icon: BarChart3,
      change: '-3.1%',
      trend: 'down',
      description: 'Total expenditure amount'
    },
    {
      title: 'Pending Approvals',
      value: `${stats.pendingBudgets + stats.pendingExpenditures}`,
      icon: Clock,
      change: '+2',
      trend: 'up',
      description: 'Awaiting review'
    },
  ]

  if (type === 'admin') {
    cards.splice(3, 0, {
      title: 'Total Users',
      value: `${stats.totalUsers || 0}`,
      icon: Users,
      change: '+3',
      trend: 'up',
      description: 'Registered users'
    })
  } else {
    cards.push({
      title: 'Active Projects',
      value: `${stats.activeProjects}`,
      icon: AlertCircle,
      change: '+1',
      trend: 'up',
      description: 'Projects in progress'
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              {card.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={card.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                {card.change}
              </span>
              <span className="ml-1">from last month</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}