import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Filter, 
  Download, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import ExpendituresTable from '@/components/tables/ExpendituresTable'
import FilterBar from '@/components/dashboard/FilterBar'
import { formatCurrency } from '@/lib/utils'

export default async function AdminExpendituresPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  // status-based workflow removed; expenditures are view-only
  const priority = searchParams.priority as string
  const budgetId = searchParams.budgetId as string
  const search = searchParams.search as string
  const page = parseInt(searchParams.page as string || '1')
  const limit = parseInt(searchParams.limit as string || '10')

  const where: any = {}


  if (priority) {
    where.priority = priority
  }

  if (budgetId) {
    where.budgetId = budgetId
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [expenditures, total, statistics] = await Promise.all([
    prisma.expenditure.findMany({
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
        budget: {
          select: {
            title: true,
            amount: true,
          }
        },
        items: {
          orderBy: { amount: 'desc' }
        },
        _count: {
          select: {
            items: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expenditure.count({ where }),
    prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN priority = 'EMERGENCY' THEN 1 END) as emergency_count,
        COUNT(CASE WHEN priority = 'URGENT' THEN 1 END) as urgent_count
      FROM "Expenditure"
    ` as any,
  ])

  const stats = statistics[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenditure Management</h1>
          <p className="text-gray-600">
              View all expenditures (read-only)
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
            <CardTitle className="text-sm font-medium">Total Expenditures</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">
              {formatCurrency(stats.total_amount || 0)} total amount
            </p>
          </CardContent>
        </Card>
        {/* Removed approval workflow stats — expenditures are read-only */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency/Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parseInt(stats.emergency_count) + parseInt(stats.urgent_count)}</div>
            <p className="text-xs text-gray-500">
              High priority expenditures
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <FilterBar
            filters={[]}
            priorities={[
              { label: 'All Priorities', value: 'ALL' },
              { label: 'Emergency', value: 'EMERGENCY' },
              { label: 'Urgent', value: 'URGENT' },
              { label: 'Normal', value: 'NORMAL' },
              { label: 'Long Term', value: 'LONG_TERM' },
            ]}
            defaultStatus={undefined}
            defaultPriority={priority}
            searchPlaceholder="Search expenditures by title, description, or user..."
          />
        </CardContent>
      </Card>

      {/* Expenditures Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenditures</CardTitle>
          <CardDescription>
           view expenditures from all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpendituresTable 
            expenditures={expenditures} 
            isAdmin={true}
            currentPage={page}
            totalItems={total}
            itemsPerPage={limit}
          />
        </CardContent>
      </Card>
    </div>
  )
}
