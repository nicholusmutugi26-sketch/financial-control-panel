import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { 
  BarChart3, 
  Wallet, 
  TrendingUp, 
  Clock,
  FileText,
  AlertCircle
} from 'lucide-react'
import RemitForm from '@/components/forms/RemitForm'

export default async function UserDashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  // Guard: if Prisma models aren't present in this environment, show a fallback
  if (!prisma || typeof (prisma as any).budget === 'undefined') {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Dashboard unavailable</h1>
        <p className="mt-2 text-gray-600">Required database models are not present. Contact the administrator.</p>
      </div>
    )
  }

  const [
    budgets,
    expenditures,
    projects,
    supplementaryBudgets,
    recentTransactions,
    stats
  ] = await Promise.all([
    prisma.budget.findMany({
      where: { createdBy: session.user.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        batches: {
          where: { status: 'DISBURSED' },
          select: { amount: true }
        }
      }
    }),
    prisma.expenditure.findMany({
      where: { createdBy: session.user.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        budget: { select: { title: true } }
      }
    }),
    prisma.project.findMany({
      where: { createdBy: session.user.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        votes: true,
        budget: { select: { title: true } }
      }
    }),
    prisma.supplementaryBudget.findMany({
      where: { createdBy: session.user.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        budget: { select: { title: true } }
      }
    }),
    prisma.$transaction([
      prisma.budget.aggregate({
        where: { createdBy: session.user.id },
        _sum: { amount: true, allocatedAmount: true }
      }),
      prisma.expenditure.aggregate({
        where: { createdBy: session.user.id },
        _sum: { amount: true }
      }),
      prisma.budget.count({
        where: { 
          createdBy: session.user.id,
          status: 'PENDING'
        }
      }),
      prisma.expenditure.count({
        where: { 
          createdBy: session.user.id,
          status: 'PENDING'
        }
      }),
      prisma.project.count({
        where: { 
          createdBy: session.user.id,
          status: { in: ['STARTED', 'PROGRESSING'] }
        }
      }),
      // include approved supplementary sums for this user
      prisma.supplementaryBudget.aggregate({
        where: { createdBy: session.user.id, status: 'APPROVED' },
        _sum: { amount: true }
      })
    ])
  ])

  const userStats = {
    totalBudget: stats[0]._sum.amount || 0,
    allocatedAmount: stats[0]._sum.allocatedAmount || 0,
    totalExpenditures: stats[1]._sum.amount || 0,
    pendingBudgets: stats[2],
    pendingExpenditures: stats[3],
    activeProjects: stats[4],
    // total budgets + approved supplementary - total expenditures
    availableBalance: (stats[0]._sum.amount || 0) + (stats[5]?._sum?.amount || 0) - (stats[1]._sum.amount || 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here&apos;s what&apos;s happening with your finances.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/user/budgets/new">
              New Budget
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/user/expenditures/new">
              New Expenditure
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4-cols">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Total Budget</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(userStats.totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(userStats.allocatedAmount)} allocated
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
            <div className="text-2xl font-bold text-accent">{formatCurrency(userStats.availableBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {userStats.pendingBudgets} budgets pending
            </p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Expenditures</CardTitle>
            <div className="p-2 rounded-lg bg-secondary/10">
              <BarChart3 className="h-5 w-5 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{formatCurrency(userStats.totalExpenditures)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {userStats.pendingExpenditures} pending approval
            </p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Active Projects</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{userStats.activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In progress
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid-3-cols">
        {/* Recent Budgets */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Recent Budgets</CardTitle>
            <CardDescription className="text-xs">
              Your latest budget requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-compact">
              {budgets.slice(0, 4).map((budget) => (
                <div key={budget.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{budget.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(budget.amount)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(budget.status || 'PENDING')}`}>
                    {budget.status || 'PENDING'}
                  </span>
                </div>
              ))}
              {budgets.length === 0 && (
                <p className="text-muted-foreground text-center py-3 text-sm">No budgets yet</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" asChild>
              <Link href="/dashboard/user/budgets">
                View all →
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Expenditures */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Recent Expenditures</CardTitle>
            <CardDescription className="text-xs">
              Your latest expenditures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-compact">
              {expenditures.slice(0, 4).map((expenditure) => (
                <div key={expenditure.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{expenditure.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(expenditure.amount)}
                    </p>
                  </div>
                </div>
              ))}
              {expenditures.length === 0 && (
                <p className="text-muted-foreground text-center py-3 text-sm">No expenditures yet</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" asChild>
              <Link href="/dashboard/user/expenditures">
                View all →
              </Link>
            </Button>
          </CardContent>
        </Card>
        {/* Recent Supplementary Requests */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Supplementary Requests</CardTitle>
            <CardDescription className="text-xs">Your recent requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-compact">
              {supplementaryBudgets.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{formatCurrency(s.amount)}</p>
                    <p className="text-xs text-muted-foreground">{s.reason || 'Request'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(s.status || 'PENDING')}`}>
                    {s.status || 'PENDING'}
                  </span>
                </div>
              ))}
              {supplementaryBudgets.length === 0 && (
                <p className="text-muted-foreground text-center py-3 text-sm">No requests yet</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" asChild>
              <Link href="/dashboard/user/supplementary">
                View all →
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Recent Projects</CardTitle>
            <CardDescription className="text-xs">
              Latest project proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-compact">
              {projects.slice(0, 4).map((project) => (
                <div key={project.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{project.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.votes.length} votes
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(project.status || 'PENDING')}`}>
                    {project.status || 'PENDING'}
                  </span>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-muted-foreground text-center py-3 text-sm">No projects yet</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" asChild>
              <Link href="/dashboard/user/projects">
                View all →
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Remit Funds */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Remit Funds</CardTitle>
          <CardDescription>Submit remittances for admin verification</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Client component for submitting remittances */}
          <RemitForm />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common actions you might need
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/dashboard/user/budgets/new" className="flex flex-col items-center gap-2">
                <FileText className="h-6 w-6" />
                <span>New Budget</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/dashboard/user/expenditures/new" className="flex flex-col items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                <span>New Expense</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/dashboard/user/projects/new" className="flex flex-col items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                <span>New Project</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/dashboard/user/statistics" className="flex flex-col items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                <span>View Stats</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}