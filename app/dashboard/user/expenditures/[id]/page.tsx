import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, DollarSign, FileText, User, CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'

interface ExpenditureDetailPageProps {
  params: { id: string }
}

export default async function ExpenditureDetailPage({ params }: ExpenditureDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  const expenditure = await prisma.expenditure.findUnique({
    where: {
      id: params.id,
      createdBy: session.user.id
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      },
      budget: {
        select: {
          id: true,
          title: true,
          status: true
        }
      },
      items: {
        orderBy: { id: 'desc' }
      }
    }
  })

  if (!expenditure) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Expenditure Not Found</h1>
        <p className="mt-2 text-gray-600">The expenditure you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/user/expenditures">Back to Expenditures</Link>
        </Button>
      </div>
    )
  }

  const totalItemsAmount = expenditure.items?.reduce((sum, item) => sum + item.amount, 0) || 0

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/user/expenditures">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="welcome-header text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            Expenditure Details
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-2">
            {expenditure.title}
          </p>
        </div>
      </div>

      {/* Expenditure Overview */}
      <div className="grid-3-cols">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Total Amount</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(expenditure.amount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Expenditure total
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Priority</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <Badge className={`${getPriorityColor(expenditure.priority || 'MEDIUM')} text-lg px-3 py-1`}>
              {expenditure.priority || 'MEDIUM'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Priority level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenditure Information */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Expenditure Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              <p className="mt-1 text-lg font-medium text-gray-900">{expenditure.title}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Amount</label>
              <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(expenditure.amount)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Priority</label>
              <div className="mt-1">
                <Badge className={getPriorityColor(expenditure.priority || 'MEDIUM')}>
                  {expenditure.priority || 'MEDIUM'}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDate(expenditure.createdAt)}</span>
              </div>
            </div>

            {expenditure.updatedAt && expenditure.updatedAt !== expenditure.createdAt && (
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(expenditure.updatedAt)}</span>
                </div>
              </div>
            )}
          </div>

          {expenditure.description && (
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="mt-1 text-gray-900">{expenditure.description}</p>
            </div>
          )}

          {expenditure.budget && (
            <div>
              <label className="text-sm font-medium text-gray-500">Related Budget</label>
              <div className="mt-1">
                <Link
                  href={`/dashboard/user/budgets/${expenditure.budget.id}`}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
                >
                  <FileText className="h-4 w-4" />
                  <span>{expenditure.budget.title}</span>
                  <Badge className={getStatusColor(expenditure.budget.status || 'PENDING')} variant="outline">
                    {expenditure.budget.status || 'PENDING'}
                  </Badge>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenditure Items */}
      {expenditure.items && expenditure.items.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Expenditure Items</CardTitle>
            <CardDescription>Breakdown of the expenditure</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenditure.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.description || 'No description'}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400">
                        Item #{item.id.slice(-6)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(item.amount)}</p>
                  </div>
                </div>
              ))}

              {/* Items Total */}
              <div className="border-t pt-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Items Total:</span>
                  <span className="text-xl font-bold">{formatCurrency(totalItemsAmount)}</span>
                </div>
                {totalItemsAmount !== expenditure.amount && (
                  <div className="flex items-center justify-between text-sm text-orange-600 mt-1">
                    <span>Difference:</span>
                    <span>{formatCurrency(expenditure.amount - totalItemsAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Items Message */}
      {(!expenditure.items || expenditure.items.length === 0) && (
        <Card className="card-elevated">
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No expenditure items found</p>
            <p className="text-sm text-gray-400 mt-1">This expenditure doesn&apos;t have any detailed items breakdown.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
