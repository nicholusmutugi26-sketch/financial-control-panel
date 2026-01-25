import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { 
  ArrowLeft,
  CheckCircle,
  XCircle,
  DollarSign,
  RefreshCw,
  User,
  Calendar,
  FileText,
  TrendingUp,
  Clock
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const ClientBudgetQuickActions = dynamic(() => import('@/components/admin/BudgetQuickActions'), { ssr: false })
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import DisbursementForm from '@/components/forms/DisbursementForm'

export default async function BudgetDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  const budget = await prisma.budget.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: { createdAt: 'asc' }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
          phoneNumber: true,
        }
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      batches: {
        orderBy: { createdAt: 'asc' }
      },
      expenditures: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: true
        }
      },
      revisions: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            }
          }
        }
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
            }
          }
        }
      },
      _count: {
        select: {
          expenditures: true,
          batches: true,
          transactions: true,
          items: true,
        }
      }
    }
  })

  if (!budget) {
    notFound()
  }

  // Calculate disbursed amount from completed transactions
  const disbursedAmount = budget.transactions
    .filter(t => t.type === 'DISBURSEMENT' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  
  const allocatedAmount = budget.allocatedAmount || 0
  const remainingToDisburst = allocatedAmount - disbursedAmount
  const disbursementPercentage = allocatedAmount > 0 ? (disbursedAmount / allocatedAmount) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/admin/budgets">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Budgets
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{budget.title}</h1>
            <p className="text-gray-600">
              Budget ID: {budget.id}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor(budget.status || 'PENDING')}>
            {budget.status || 'PENDING'}
          </Badge>
          <Badge className={getPriorityColor(budget.priority || 'MEDIUM')}>
            {budget.priority || 'MEDIUM'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Budget Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Details</CardTitle>
              <CardDescription>
                Complete information about this budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold">{formatCurrency(budget.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Allocated Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(allocatedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Disbursed Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(disbursedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Remaining to Disburse</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {formatCurrency(remainingToDisburst)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 mb-2">Disbursement Progress (from Allocated)</p>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${disbursementPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{Math.round(disbursementPercentage)}%</span>
                    </div>
                  </div>
                </div>

                {budget.description && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Description</p>
                    <p className="text-gray-700">{budget.description}</p>
                  </div>
                )}

                {/* Full items list */}
                {budget.items && budget.items.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Budget Items</p>
                    <div className="space-y-2">
                      {budget.items.map(it => (
                        <div key={it.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{it.name}</p>
                            <p className="text-sm text-gray-500">Qty: {it.quantity || 1}</p>
                          </div>
                          <div className="font-medium">{formatCurrency(it.unitPrice)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Disbursement Type</p>
                    <p className="font-medium">{budget.disbursementType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium">{formatDate(budget.createdAt)}</p>
                  </div>
                  {budget.approvedAt && (
                    <div>
                      <p className="text-sm text-gray-500">Approved</p>
                      <p className="font-medium">{formatDate(budget.approvedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>
                User who created this budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  {budget.user.profileImage ? (
                    <img 
                      src={budget.user.profileImage} 
                      alt={budget.user.name || 'User'}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <User className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{budget.user.name}</h3>
                  <p className="text-sm text-gray-500">{budget.user.email}</p>
                  {budget.user.phoneNumber && (
                    <p className="text-sm text-gray-500">{budget.user.phoneNumber}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" asChild className="ml-auto">
                  <Link href={`/dashboard/admin/users/${budget.user.id}`}>
                    View Profile
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Batches Card */}
          {budget.disbursementType === 'BATCHES' && budget.batches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Batches</CardTitle>
                <CardDescription>
                  {budget.batches.length} batches for this budget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {budget.batches.map((batch, index) => (
                    <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          batch.status === 'DISBURSED' ? 'bg-green-100 text-green-800' :
                          batch.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">Batch {index + 1}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(batch.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={
                          batch.status === 'DISBURSED' ? 'bg-green-100 text-green-800' :
                          batch.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {batch.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage this budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {budget.status === 'PENDING' && (
                  <>
                    {/* Client-side quick actions perform POST requests */}
                    <Suspense>
                      {/* @ts-ignore */}
                      <ClientBudgetQuickActions budgetId={budget.id} status={budget.status} />
                    </Suspense>
                  </>
                )}

                {(budget.status === 'APPROVED' || budget.status === 'PARTIALLY_DISBURSED') && (
                  <div id="disburse">
                    {(() => {
                      // Calculate disbursed amount from completed transactions
                      const disbursedAmount = budget.transactions
                        .filter(t => t.type === 'DISBURSEMENT' && t.status === 'COMPLETED')
                        .reduce((sum, t) => sum + (t.amount || 0), 0)
                      
                      return (
                        <DisbursementForm
                          budgetId={budget.id}
                          budgetAmount={budget.amount}
                          allocatedAmount={budget.allocatedAmount || 0}
                          disbursedAmount={disbursedAmount}
                        />
                      )
                    })()}
                  </div>
                )}

                {(budget.status === 'APPROVED' || budget.status === 'PARTIALLY_DISBURSED') && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/api/budgets/${budget.id}/revoke`}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Revoke Budget
                    </Link>
                  </Button>
                )}

                {/* Admins are not allowed to edit budgets here */}
              </div>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Total Expenditures</span>
                  </div>
                  <span className="font-medium">{budget._count.expenditures}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Total Batches</span>
                  </div>
                  <span className="font-medium">{budget._count.batches}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Transactions</span>
                  </div>
                  <span className="font-medium">{budget._count.transactions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Created</span>
                  </div>
                  <span className="font-medium">{formatDate(budget.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for Related Data */}
      <Tabs defaultValue="expenditures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenditures">
            Expenditures ({budget._count.expenditures})
          </TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions ({budget._count.transactions})
          </TabsTrigger>
          <TabsTrigger value="revisions">
            Revisions ({budget.revisions.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenditures">
          <Card>
            <CardHeader>
              <CardTitle>Related Expenditures</CardTitle>
              <CardDescription>
                Expenditures linked to this budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              {budget.expenditures.length > 0 ? (
                <div className="space-y-4">
                  {budget.expenditures.map((expenditure) => (
                    <div key={expenditure.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{expenditure.title}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(expenditure.amount)} • {expenditure.items.length} items
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(expenditure.priority || 'MEDIUM')}>
                          {expenditure.priority || 'MEDIUM'}
                        </Badge>
                        <Badge className={getStatusColor(expenditure.status || 'PENDING')}>
                          {expenditure.status || 'PENDING'}
                        </Badge>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/admin/expenditures/${expenditure.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No expenditures linked to this budget</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Related Transactions</CardTitle>
              <CardDescription>
                Transaction history for this budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              {budget.transactions.length > 0 ? (
                <div className="space-y-4">
                  {budget.transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {transaction.type} • {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.user?.name} • {formatDate(transaction.createdAt)}
                        </p>
                        {transaction.mpesaCode && (
                          <p className="text-sm text-gray-500">
                            M-Pesa: {transaction.mpesaCode}
                          </p>
                        )}
                      </div>
                      <Badge className={
                        transaction.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {transaction.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No transactions for this budget</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisions">
          <Card>
            <CardHeader>
              <CardTitle>Revision History</CardTitle>
              <CardDescription>
                Revision requests for this budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              {budget.revisions.length > 0 ? (
                <div className="space-y-4">
                  {budget.revisions.map((revision) => (
                    <div key={revision.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{revision.user?.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(revision.createdAt)}
                          </p>
                        </div>
                        <Badge className={
                          revision.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          revision.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {revision.status}
                        </Badge>
                      </div>
                      <p className="text-gray-700">{revision.notes || 'No notes provided'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No revision requests</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}