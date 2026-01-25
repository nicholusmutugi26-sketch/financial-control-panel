import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Download,
  Calendar,
  BarChart3,
  TrendingUp,
  Users
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const GenerateReportButton = dynamic(() => import('@/components/admin/GenerateReportButton'), { ssr: false })
import { formatDate } from '@/lib/utils'

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        }
      }
    }
  })

  // Get statistics for quick insights
  const [budgetStats, expenditureStats, projectStats, userStats] = await Promise.all([
    prisma.budget.aggregate({
      _sum: { amount: true, allocatedAmount: true },
      _count: true,
    }),
    prisma.expenditure.aggregate({
      _sum: { amount: true },
      _count: true,
    }),
    prisma.project.aggregate({
      _count: true,
    }),
    prisma.user.aggregate({
      _count: true,
    }),
  ])

  // include approved supplementary budgets in the total budget amount
  const supplementaryAgg = await prisma.supplementaryBudget.aggregate({
    where: { status: 'APPROVED' },
    _sum: { amount: true },
  })
  const totalBudgetAmount = (budgetStats._sum.amount ?? 0) + (supplementaryAgg._sum.amount ?? 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-gray-600">
            Generate and view system reports
          </p>
        </div>
        <div>
          {/* Use client button to POST to the API rather than navigate to a non-existent page */}
          {/* @ts-ignore server component importing client component dynamically */}
          <GenerateReportButton>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </GenerateReportButton>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgets</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgetStats._count}</div>
            <p className="text-xs text-gray-500">
              {totalBudgetAmount.toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenditures</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenditureStats._count}</div>
            <p className="text-xs text-gray-500">
              {expenditureStats._sum.amount?.toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats._count}</div>
            <p className="text-xs text-gray-500">
              Project proposals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats._count}</div>
            <p className="text-xs text-gray-500">
              System users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Types */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Report
            </CardTitle>
            <CardDescription>
              Generate monthly financial report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Detailed monthly breakdown of budgets, expenditures, and transactions.
            </p>
            <div>
              {/* @ts-ignore client component */}
              <GenerateReportButton type="MONTHLY" className="w-full">
                Generate Monthly Report
              </GenerateReportButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quarterly Report
            </CardTitle>
            <CardDescription>
              Generate quarterly performance report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Quarterly analysis with trends and comparisons.
            </p>
            <div>
              <GenerateReportButton type="QUARTERLY" className="w-full">
                Generate Quarterly Report
              </GenerateReportButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Yearly Report
            </CardTitle>
            <CardDescription>
              Generate annual comprehensive report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Complete yearly analysis with growth metrics and projections.
            </p>
            <div>
              <GenerateReportButton type="YEARLY" className="w-full">
                Generate Yearly Report
              </GenerateReportButton>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            Previously generated reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <h3 className="font-semibold">
                        {report.type} Report - {report.period}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500">
                      Generated by {report.user?.name} • {formatDate(report.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/api/reports/${report.id}/download`}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/dashboard/admin/reports/${report.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No reports generated yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}