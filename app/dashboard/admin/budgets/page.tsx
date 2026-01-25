import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { 
  Filter, 
  Download, 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign
} from 'lucide-react'
import BudgetsTable from '@/components/tables/BudgetsTable'
import FilterBar from '@/components/dashboard/FilterBar'
import RemittancesList from '@/components/admin/RemittancesList'
import { formatCurrency } from '@/lib/utils'

export default async function AdminBudgetsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  const status = searchParams.status as string || 'ALL'
  const priority = searchParams.priority as string
  const search = searchParams.search as string
  const page = parseInt(searchParams.page as string || '1')
  const limit = parseInt(searchParams.limit as string || '10')

  const where: any = {}

  if (status !== 'ALL') {
    where.status = status
  }

  if (priority) {
    where.priority = priority
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [budgets, total, statistics] = await Promise.all([
    prisma.budget.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          }
        },
        batches: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            expenditures: true,
            batches: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.budget.count({ where }),
    prisma.$queryRaw`
      SELECT b.total, b.total_amount, b.allocated_amount, b.pending_count, b.approved_count, b.rejected_count, b.disbursed_count,
             COALESCE(s.total_supplementary, 0) as supplementary_amount
      FROM (
        SELECT 
          COUNT(*) as total,
          SUM(amount) as total_amount,
          SUM("allocatedAmount") as allocated_amount,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN status = 'DISBURSED' THEN 1 END) as disbursed_count
        FROM "Budget"
      ) b
      LEFT JOIN (
        SELECT SUM(amount) as total_supplementary FROM "SupplementaryBudget" WHERE status = 'APPROVED'
      ) s ON true
    ` as any,
  ])

  const stats = statistics[0]

  const totalWithSupplementary = (stats?.total_amount ?? 0) + (stats?.supplementary_amount ?? 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Management</h1>
          <p className="text-gray-600">
            Review, approve, and manage all budgets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgets</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalWithSupplementary || 0)}</div>
              <p className="text-xs text-gray-500">
                {formatCurrency(totalWithSupplementary || 0)} total amount
              </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_count}</div>
            <p className="text-xs text-gray-500">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved_count}</div>
            <p className="text-xs text-gray-500">
              {formatCurrency(totalWithSupplementary || 0)} allocated
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected_count}</div>
            <p className="text-xs text-gray-500">
              Not approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <FilterBar
            filters={[
              { label: 'All', value: 'ALL' },
              { label: 'Pending', value: 'PENDING' },
              { label: 'Approved', value: 'APPROVED' },
              { label: 'Rejected', value: 'REJECTED' },
              { label: 'Disbursed', value: 'DISBURSED' },
              { label: 'Partially Disbursed', value: 'PARTIALLY_DISBURSED' },
              { label: 'Revoked', value: 'REVOKED' },
            ]}
            priorities={[
              { label: 'All Priorities', value: 'ALL' },
              { label: 'Emergency', value: 'EMERGENCY' },
              { label: 'Urgent', value: 'URGENT' },
              { label: 'Normal', value: 'NORMAL' },
              { label: 'Long Term', value: 'LONG_TERM' },
            ]}
            defaultStatus={status}
            defaultPriority={priority}
            searchPlaceholder="Search budgets by title, description, or user..."
          />
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Budgets</CardTitle>
          <CardDescription>
            Manage and review budget requests from all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetsTable 
            budgets={budgets} 
            isAdmin={true}
            currentPage={page}
            totalItems={total}
            itemsPerPage={limit}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Approve Budgets</h3>
                <p className="text-sm text-gray-500">Review and approve pending requests</p>
              </div>
            </div>
            <Button className="w-full" asChild>
              <Link href="/dashboard/admin/budgets?status=PENDING">
                Review Pending
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Disburse Funds</h3>
                <p className="text-sm text-gray-500">Send payments for approved budgets</p>
              </div>
            </div>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/dashboard/admin/budgets?status=APPROVED">
                View Approved
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Filter className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Generate Reports</h3>
                <p className="text-sm text-gray-500">Create detailed budget reports</p>
              </div>
            </div>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/dashboard/admin/reports">
                Create Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* Remittances (admin verify) */}
      <Card>
        <CardHeader>
          <CardTitle>Remittances </CardTitle>
        </CardHeader>
        <CardContent>
          <RemittancesList />
        </CardContent>
      </Card>
    </div>
  )
}
