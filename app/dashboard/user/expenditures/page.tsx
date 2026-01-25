import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ExpendituresTable from '@/components/tables/ExpendituresTable'
import FilterBar from '@/components/dashboard/FilterBar'
import BudgetFilterButtons from '@/components/dashboard/BudgetFilterButtons'

export default async function UserExpendituresPage({
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
  const budgetId = searchParams.budgetId as string
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

  if (budgetId) {
    where.budgetId = budgetId
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [expenditures, total] = await Promise.all([
    prisma.expenditure.findMany({
      where,
      include: {
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
  ])

  // Get user's budgets for filter
  const userBudgets = await prisma.budget.findMany({
    where: { createdBy: session.user.id },
    select: { id: true, title: true },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Expenditures</h1>
          <p className="text-gray-600">
            Manage and track your expenditures
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/user/expenditures/new">
            <Plus className="mr-2 h-4 w-4" />
            New Expenditure
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
              { label: 'Paid', value: 'PAID' },
              { label: 'Cancelled', value: 'CANCELLED' },
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
            searchPlaceholder="Search expenditures..."
          />
          
          {/* Budget Filter */}
          {userBudgets.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium">Filter by Budget</Label>
              <BudgetFilterButtons budgetId={budgetId} budgets={userBudgets} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenditures Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenditures</CardTitle>
          <CardDescription>
              Your expenditures
            </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpendituresTable 
            expenditures={expenditures} 
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

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label className={`text-sm font-medium leading-none ${className}`} {...props} />
  )
}