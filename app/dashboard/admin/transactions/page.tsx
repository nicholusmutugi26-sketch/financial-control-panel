import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Download
} from 'lucide-react'
import TransactionsTable from '@/components/tables/TransactionsTable'
import FilterBar from '@/components/dashboard/FilterBar'
import { formatCurrency } from '@/lib/utils'

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  const type = searchParams.type as string || 'ALL'
  const status = searchParams.status as string || 'ALL'
  const startDate = searchParams.startDate as string
  const endDate = searchParams.endDate as string
  const search = searchParams.search as string
  const page = parseInt(searchParams.page as string || '1')
  const limit = parseInt(searchParams.limit as string || '10')

  const where: any = {}

  if (type !== 'ALL') {
    where.type = type
  }

  if (status !== 'ALL') {
    where.status = status
  }

  if (startDate) {
    where.createdAt = {
      ...where.createdAt,
      gte: new Date(startDate)
    }
  }

  if (endDate) {
    where.createdAt = {
      ...where.createdAt,
      lte: new Date(endDate)
    }
  }

  if (search) {
    where.OR = [
      { reference: { contains: search, mode: 'insensitive' } },
      { mpesaCode: { contains: search, mode: 'insensitive' } },
      { phoneNumber: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [transactions, total, statistics] = await Promise.all([
    prisma.transaction.findMany({
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
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
    prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as success_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count
      FROM "Transaction"
    ` as any,
  ])

  const stats = statistics[0]
  const successRate = stats.total > 0 ? (parseInt(stats.success_count) / parseInt(stats.total)) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction Management</h1>
          <p className="text-gray-600">
            Monitor and manage all financial transactions
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
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">
              {formatCurrency(stats.total_amount || 0)} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.success_count}</div>
            <p className="text-xs text-gray-500">
              {successRate.toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_count}</div>
            <p className="text-xs text-gray-500">
              Awaiting completion
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed_count}</div>
            <p className="text-xs text-gray-500">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <FilterBar
            filters={[
              { label: 'All Status', value: 'ALL' },
              { label: 'Success', value: 'SUCCESS' },
              { label: 'Pending', value: 'PENDING' },
              { label: 'Failed', value: 'FAILED' },
              { label: 'Cancelled', value: 'CANCELLED' },
            ]}
            defaultStatus={status}
            searchPlaceholder="Search transactions by reference, M-Pesa code, or user..."
          />
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant={type === 'ALL' ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href="?type=ALL">All Types</Link>
            </Button>
            <Button
              variant={type === 'DISBURSEMENT' ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href="?type=DISBURSEMENT">Disbursements</Link>
            </Button>
            <Button
              variant={type === 'REVERSAL' ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href="?type=REVERSAL">Reversals</Link>
            </Button>
            <Button
              variant={type === 'FEE' ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href="?type=FEE">Fees</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            Monitor all financial transactions in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsTable 
            transactions={transactions} 
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