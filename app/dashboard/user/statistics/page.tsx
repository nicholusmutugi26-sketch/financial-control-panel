import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, BarChart3, PieChart, Calendar } from 'lucide-react'
import BudgetChart from '@/components/charts/BudgetChart'
import ExpenseChart from '@/components/charts/ExpenseChart'
import MonthlyComparisonChart from '@/components/charts/MonthlyComparisonChart'
import { formatCurrency } from '@/lib/utils'

export default async function UserStatisticsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  const userId = session.user.id

  // Get statistics for the last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [
    monthlyStats,
    categoryStats,
    budgetStats,
    recentActivity,
    comparisonData
  ] = await Promise.all([
    // Monthly statistics
    prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM "Expenditure"
      WHERE "createdBy" = ${userId} 
        AND "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    ` as any,
    
    // Category statistics
    prisma.$queryRaw`
      SELECT 
        priority,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM "Expenditure"
      WHERE "createdBy" = ${userId}
      GROUP BY priority
      ORDER BY total_amount DESC
    ` as any,
    
    // Budget statistics
    prisma.budget.aggregate({
      where: { createdBy: userId },
      _sum: { amount: true, allocatedAmount: true },
      _count: true,
    }),
    
    // Recent activity
    prisma.expenditure.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        budget: { select: { title: true } }
      }
    }),
    
    // Month-over-month comparison
    prisma.$queryRaw`
      WITH monthly_data AS (
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          SUM(amount) as monthly_total
        FROM "Expenditure"
        WHERE "createdBy" = ${userId}
          AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
      )
      SELECT 
        month,
        monthly_total,
        LAG(monthly_total) OVER (ORDER BY month) as previous_month_total,
        monthly_total - LAG(monthly_total) OVER (ORDER BY month) as change_amount,
        ROUND(
          ((monthly_total - LAG(monthly_total) OVER (ORDER BY month)) / 
          LAG(monthly_total) OVER (ORDER BY month)) * 100, 2
        ) as change_percentage
      FROM monthly_data
      ORDER BY month DESC
    ` as any,
  ])

  const totalExpenditures = monthlyStats.reduce((sum: number, stat: any) => sum + parseFloat(stat.total_amount || 0), 0)
  const averageMonthly = totalExpenditures / Math.max(monthlyStats.length, 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistics & Analytics</h1>
          <p className="text-gray-600">
            Detailed insights into your financial activities
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenditures</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenditures)}</div>
            <p className="text-xs text-gray-500">
              Across all categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Monthly</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageMonthly)}</div>
            <p className="text-xs text-gray-500">
              Last 6 months average
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgets</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgetStats._count}</div>
            <p className="text-xs text-gray-500">
              {formatCurrency(budgetStats._sum.amount || 0)} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allocated Amount</CardTitle>
            <PieChart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budgetStats._sum.allocatedAmount || 0)}</div>
            <p className="text-xs text-gray-500">
              {Math.round(((budgetStats._sum.allocatedAmount || 0) / (budgetStats._sum.amount || 1)) * 100)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">
            <TrendingUp className="mr-2 h-4 w-4" />
            Expense Trends
          </TabsTrigger>
          <TabsTrigger value="budgets">
            <BarChart3 className="mr-2 h-4 w-4" />
            Budget Analysis
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <PieChart className="mr-2 h-4 w-4" />
            Monthly Comparison
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Calendar className="mr-2 h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expenditure Trends</CardTitle>
              <CardDescription>
                Monthly expenditure overview for the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ExpenseChart data={monthlyStats} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Allocation</CardTitle>
              <CardDescription>
                Overview of your budget requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <BudgetChart 
                data={monthlyStats}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Comparison</CardTitle>
              <CardDescription>
                Month-over-month expenditure changes
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <MonthlyComparisonChart data={comparisonData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expenditure by Priority</CardTitle>
              <CardDescription>
                Breakdown of expenditures by priority level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryStats.map((stat: any) => (
                  <div key={stat.priority} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${
                        stat.priority === 'EMERGENCY' ? 'bg-red-500' :
                        stat.priority === 'URGENT' ? 'bg-orange-500' :
                        stat.priority === 'NORMAL' ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <span className="font-medium">{stat.priority}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(stat.total_amount || 0)}</p>
                      <p className="text-sm text-gray-500">{stat.count} items</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenditures</CardTitle>
          <CardDescription>
            Your latest expenditure activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((expenditure) => (
              <div key={expenditure.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{expenditure.title}</p>
                  <p className="text-sm text-gray-500">
                    {expenditure.budget?.title || 'No budget'} • {formatCurrency(expenditure.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    expenditure.priority === 'EMERGENCY' ? 'bg-red-100 text-red-800' :
                    expenditure.priority === 'URGENT' ? 'bg-orange-100 text-orange-800' :
                    expenditure.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {expenditure.priority}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    expenditure.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    expenditure.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    expenditure.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {expenditure.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}