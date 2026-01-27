import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const GenerateReportButton = dynamic(() => import('@/components/admin/GenerateReportButton'), { ssr: false })
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import PoolAmount from '@/components/admin/PoolAmount'
import { 
  Users,
  Wallet,
  TrendingUp,
  Clock,
  AlertCircle,
  FileText,
  BarChart3,
  DollarSign
} from 'lucide-react'
import AdminStatsChart from '@/components/charts/AdminStatsChart'
import SupplementaryPending from '@/components/admin/SupplementaryPending'
import FundPoolAdjust from '@/components/admin/FundPoolAdjust'
import RemittancesList from '@/components/admin/RemittancesList'

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  // Guard: if Prisma models aren't present in this environment, show a fallback
  if (!prisma || typeof (prisma as any).budget === 'undefined') {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Admin dashboard unavailable</h1>
        <p className="mt-2 text-gray-600">Required database models are not present. Contact the administrator.</p>
      </div>
    )
  }

  const [
    totalUsers,
    pendingBudgets,
    pendingExpenditures,
    activeProjects,
    recentTransactions,
    monthlyStats,
    stats
  ] = await Promise.all([
    prisma.user.count(),
    prisma.budget.findMany({
      where: { status: 'PENDING' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } }
      }
    }),
    prisma.expenditure.findMany({
      where: { status: 'PENDING' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        budget: { select: { title: true } }
      }
    }),
    prisma.project.findMany({
      where: { status: { in: ['STARTED', 'PROGRESSING'] } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        budget: { select: { title: true } }
      }
    }),
    prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        budget: { select: { title: true } }
      }
    }),
    prisma.$queryRaw`
      SELECT b.month, b.budget_count, b.total_amount, b.allocated_amount, COALESCE(e.total_expenditures, 0) as total_expenditures, COALESCE(s.total_supplementary, 0) as total_supplementary
      FROM (
        SELECT DATE_TRUNC('month', "createdAt") as month,
               COUNT(*) as budget_count,
               SUM(amount) as total_amount,
               SUM("allocatedAmount") as allocated_amount
        FROM "Budget"
        WHERE "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
      ) b
      LEFT JOIN (
        SELECT DATE_TRUNC('month', "createdAt") as month,
               SUM(amount) as total_expenditures
        FROM "Expenditure"
        WHERE "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
      ) e USING (month)
      LEFT JOIN (
        SELECT DATE_TRUNC('month', "createdAt") as month,
               SUM(amount) as total_supplementary
        FROM "SupplementaryBudget"
        WHERE "createdAt" >= NOW() - INTERVAL '6 months' AND status = 'APPROVED'
        GROUP BY DATE_TRUNC('month', "createdAt")
      ) s USING (month)
      ORDER BY b.month DESC
    ` as any,
    prisma.$transaction([
      prisma.budget.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true, allocatedAmount: true }
      }),
      prisma.expenditure.aggregate({
        _sum: { amount: true }
      }),
      prisma.budget.count({ where: { status: 'PENDING' } }),
      prisma.expenditure.count({ where: { status: 'PENDING' } }),
      prisma.project.count({ where: { status: { in: ['STARTED', 'PROGRESSING'] } } }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCESS' }
      })
      , prisma.supplementaryBudget.aggregate({ where: { status: 'APPROVED' }, _sum: { amount: true } })
    ])
  ])

  const adminStats = {
    totalUsers,
    // include approved supplementary budgets in the total budget figure
    totalBudget: (stats[0]._sum.amount || 0) + (stats[6]?._sum?.amount || 0),
    allocatedAmount: stats[0]._sum.allocatedAmount || 0,
    totalExpenditures: stats[1]._sum.amount || 0,
    pendingBudgets: stats[2],
    pendingExpenditures: stats[3],
    activeProjects: stats[4],
    totalDisbursed: stats[5]._sum.amount || 0,
    // Available balance will be computed from poolBalance below
    availableBalance: 0
  }

  // Fund pool
  const poolSetting = await prisma.systemSetting.findUnique({ where: { key: 'fund_pool_balance' }, include: { user: { select: { id: true, name: true } } } })
  const poolBalance = poolSetting ? parseInt(poolSetting.value || '0', 10) : 0

  // compute available balance as poolBalance - total approved budgets
  const computedAvailable = poolBalance - (adminStats.totalBudget || 0)

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-gray-600">Overview of the finance flow control panel</p>
          </div>
        </div>

      {/* Fund Pool + Remittances: same row on md+ */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="card-elevated overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent pt-4 xs:pt-5 sm:pt-6 pb-3 xs:pb-4 px-4 xs:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg xs:text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-100 font-poppins break-words">Common Fund Pool</CardTitle>
                <CardDescription className="text-xs xs:text-sm text-emerald-700 dark:text-emerald-300 mt-1">Shared wallet for all allocations</CardDescription>
              </div>
              <div className="p-2 xs:p-3 rounded-lg bg-emerald-500/20 dark:bg-emerald-500/30 flex-shrink-0">
                <Wallet className="h-5 xs:h-6 w-5 xs:w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-6 xs:py-8 px-4 xs:px-6">
            <div className="text-center space-y-4">
              <PoolAmount amount={poolBalance} />
              <p className="text-xs xs:text-sm text-muted-foreground font-medium">Total contributions since inception</p>
            </div>
            <div className="mt-6 flex justify-center">
              <FundPoolAdjust balance={poolBalance} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent pt-6 pb-4 px-6">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-sky-900 dark:text-sky-100">Remittances</CardTitle>
                <CardDescription className="text-sm text-sky-700 dark:text-sky-300 mt-1">Latest contributions received</CardDescription>
              </div>
              <div className="p-3 rounded-lg bg-sky-500/20 dark:bg-sky-500/30">
                <DollarSign className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-6 px-6">
            <RemittancesList limit={2} />
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid-4-cols">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Total Users</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered accounts
            </p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Total Budget</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(adminStats.totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(adminStats.allocatedAmount)} allocated
            </p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Available Balance</CardTitle>
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(computedAvailable)}</div>
            <p className="text-xs text-muted-foreground mt-1">For allocations</p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Total Disbursed</CardTitle>
            <div className="p-2 rounded-lg bg-secondary/10">
              <DollarSign className="h-5 w-5 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{formatCurrency(adminStats.totalDisbursed)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully disbursed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Overview */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="card-elevated lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Budget Overview</CardTitle>
            <CardDescription className="text-xs">Monthly budget statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminStatsChart data={monthlyStats} />
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">Pending Approvals</CardTitle>
            <CardDescription className="text-xs">Items requiring action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-compact">
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm">Pending Budgets</span>
                </div>
                <span className="font-bold text-primary text-lg">{adminStats.pendingBudgets}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-secondary" />
                  <span className="text-sm">Pending Expenditures</span>
                </div>
                <span className="font-bold text-secondary text-lg">{adminStats.pendingExpenditures}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  <span className="text-sm">Projects to Review</span>
                </div>
                <span className="font-bold text-accent text-lg">{activeProjects.length}</span>
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-3" asChild>
              <Link href="/dashboard/admin/budgets?status=PENDING">
                Review All
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid-2-cols">
        {/* Pending Budgets */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Pending Budgets</CardTitle>
            <CardDescription className="text-xs">Awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-compact">
              {pendingBudgets.slice(0, 4).map((budget) => (
                <div key={budget.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{budget.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {budget.user?.name} • {formatCurrency(budget.amount)}
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/admin/budgets/${budget.id}`}>
                      Review
                    </Link>
                  </Button>
                </div>
              ))}
              {pendingBudgets.length === 0 && (
                <p className="text-gray-500 text-center py-4">No pending budgets</p>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/dashboard/admin/budgets?status=PENDING">
                View all pending
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pending Expenditures */}
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-700 font-semibold">Pending Expenditures</CardTitle>
            <CardDescription className="text-yellow-600">
              Expenses (view-only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingExpenditures.map((expenditure) => (
                <div key={expenditure.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{expenditure.title}</p>
                    <p className="text-sm text-gray-500">
                      {expenditure.user?.name} • {formatCurrency(expenditure.amount)}
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/admin/expenditures/${expenditure.id}`}>
                      View
                    </Link>
                  </Button>
                </div>
              ))}
              {pendingExpenditures.length === 0 && (
                <p className="text-gray-500 text-center py-4">No pending expenditures</p>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/dashboard/admin/expenditures">
                View all
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-indigo-700 font-semibold">Recent Transactions</CardTitle>
            <CardDescription className="text-indigo-600">Latest disbursements and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {transaction.budget?.title || 'Direct Payment'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {transaction.user?.name} • {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status || 'PENDING')}`}>
                    {transaction.status || 'PENDING'}
                  </span>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <p className="text-gray-500 text-center py-4">No transactions yet</p>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/dashboard/admin/transactions">
                View all transactions
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Supplementary Requests */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="text-center">
              <CardTitle className="text-amber-700 font-semibold">Supplementary Requests</CardTitle>
              <CardDescription className="text-amber-600">Pending supplementary budgets</CardDescription>
            </div>
            <div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/admin/supplementary">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <SupplementaryPending limit={3} />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <GenerateReportButton className="h-auto py-4 flex flex-col items-center gap-2">
                <FileText className="h-6 w-6" />
                <span>Generate Report</span>
              </GenerateReportButton>
            </div>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/dashboard/admin/users" className="flex flex-col items-center gap-2">
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/dashboard/admin/settings" className="flex flex-col items-center gap-2">
                <Clock className="h-6 w-6" />
                <span>System Settings</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/dashboard/admin/statistics" className="flex flex-col items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                <span>View Analytics</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
