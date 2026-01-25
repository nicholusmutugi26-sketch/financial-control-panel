import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import BudgetsTable from '@/components/tables/BudgetsTable'
import FilterBar from '@/components/dashboard/FilterBar'

export default async function UserBudgetsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  const status = searchParams.status as string || 'ALL'
  const priority = searchParams.priority as string
  const search = searchParams.search as string
  const page = parseInt(searchParams.page as string || '1')
  const limit = parseInt(searchParams.limit as string || '10')

  const where: any = { createdBy: session.user.id }

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
    ]
  }

  const [budgets, total] = await Promise.all([
    prisma.budget.findMany({
      where,
      include: {
        batches: {
          orderBy: { createdAt: 'asc' }
        },
        items: {
          orderBy: { createdAt: 'asc' },
          take: 3,
        },
        _count: {
          select: {
            expenditures: true,
            batches: true,
            items: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.budget.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Budgets</h1>
          <p className="text-gray-600">
            Manage and track your budget requests
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/user/budgets/new">
            <Plus className="mr-2 h-4 w-4" />
            New Budget
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <FilterBar
            filters={[
              { label: 'All', value: 'ALL' },
              { label: 'Draft', value: 'DRAFT' },
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
            searchPlaceholder="Search budgets..."
          />
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Budgets</CardTitle>
          <CardDescription>
            Your budget requests and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetsTable 
            budgets={budgets} 
            isAdmin={false}
            currentPage={page}
            totalItems={total}
            itemsPerPage={limit}
          />
        </CardContent>
      </Card>
    </div>
  )
}