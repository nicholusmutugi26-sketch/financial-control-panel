import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  BarChart3, 
  TrendingUp, 
  Users,
  DollarSign,
  Clock
} from 'lucide-react'
import AdminStatsChart from '@/components/charts/AdminStatsChart'

export default async function AdminStatisticsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  const [stats, monthlyStats] = await Promise.all([
    prisma.$transaction([
      prisma.budget.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expenditure.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
      prisma.user.count(),
      prisma.project.count(),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
      prisma.supplementaryBudget.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
      }),
    ]),
    prisma.$queryRaw`
      WITH budget_stats AS (
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as total_budgets,
          SUM(amount) as total_amount,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count
        FROM "Budget"
        GROUP BY DATE_TRUNC('month', "createdAt")
      ),
      expenditure_stats AS (
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          SUM(amount) as total_expenditures
        FROM "Expenditure"
        GROUP BY DATE_TRUNC('month', "createdAt")
      ),
      supplementary_stats AS (
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          SUM(amount) as total_supplementary
        FROM "SupplementaryBudget"
        WHERE status = 'APPROVED'
        GROUP BY DATE_TRUNC('month', "createdAt")
      )
      SELECT 
        b.month,
        b.total_budgets,
        b.total_amount,
        b.approved_count,
        COALESCE(e.total_expenditures, 0) as total_expenditures,
        COALESCE(s.total_supplementary, 0) as total_supplementary
      FROM budget_stats b
      LEFT JOIN expenditure_stats e ON b.month = e.month
      LEFT JOIN supplementary_stats s ON b.month = s.month
      ORDER BY b.month DESC
      LIMIT 12
    `,
  ])

  const totalBudgets = stats[0]._sum.amount || 0
  const totalExpenditures = stats[1]._sum.amount || 0
  const totalUsers = stats[2]
  const totalProjects = stats[3]
  const totalTransactions = stats[4]._sum.amount || 0
  const totalSupplementary = stats[5]._sum.amount || 0
  const availableBalance = totalBudgets + totalSupplementary - totalExpenditures

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistics & Analytics</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive system statistics and financial overview
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgets</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudgets + totalSupplementary)}</div>
            <p className="text-xs text-gray-500">
              {stats[0]._count} budgets ({stats[5]._sum?.amount ? `+${formatCurrency(stats[5]._sum.amount)} supplementary` : 'no supplementary'})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenditures</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenditures)}</div>
            <p className="text-xs text-gray-500">
              {stats[1]._count} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(availableBalance)}</div>
            <p className="text-xs text-gray-500">
              Remaining budget capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-gray-500">
              Active users in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-gray-500">
              Project proposals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
          <CardDescription>
            Budget vs Expenditures over time
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <AdminStatsChart data={monthlyStats} />
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Allocated</span>
              <span className="font-semibold">{formatCurrency(totalBudgets)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Supplementary (Approved)</span>
              <span className="font-semibold">{formatCurrency(totalSupplementary)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Spent</span>
              <span className="font-semibold">{formatCurrency(totalExpenditures)}</span>
            </div>
            <div className="border-t pt-4 flex justify-between items-center font-bold">
              <span>Available Balance</span>
              <span className="text-green-600">{formatCurrency(availableBalance)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Transactions</span>
              <span className="font-semibold">{stats[4]._count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Amount</span>
              <span className="font-semibold">{formatCurrency(totalTransactions)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Transaction</span>
              <span className="font-semibold">
                {formatCurrency(stats[4]._count > 0 ? Math.round(totalTransactions / stats[4]._count) : 0)}
              </span>
            </div>
            <div className="border-t pt-4 flex justify-between items-center font-bold">
              <span>Users Count</span>
              <span className="text-blue-600">{totalUsers}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
