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

interface BudgetDetailPageProps {
  params: { id: string }
}

export default async function BudgetDetailPage({ params }: BudgetDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  const budget = await prisma.budget.findUnique({
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
      items: {
        orderBy: { createdAt: 'desc' }
      },
      supplementary: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' }
      },
      expenditures: {
        include: {
          items: true
        },
        orderBy: { createdAt: 'desc' }
      },
      transactions: {
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' }
      },
      approvedBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })

  if (!budget) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Budget Not Found</h1>
        <p className="mt-2 text-gray-600">The budget you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/user/budgets">Back to Budgets</Link>
        </Button>
      </div>
    )
  }

  const totalSupplementary = budget.supplementary.reduce((sum, supp) => sum + supp.amount, 0)
  const totalDisbursed = budget.transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const remainingBalance = (budget.allocatedAmount || 0) - totalDisbursed

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/user/budgets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="welcome-header text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            Budget Details
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-2">
            {budget.title}
          </p>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="grid-3-cols">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Total Budget</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.amount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Original amount
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Allocated</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(budget.allocatedAmount || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Approved amount
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Disbursed</CardTitle>
            <FileText className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalDisbursed)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Amount received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Information */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Budget Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <Badge className={getStatusColor(budget.status || 'PENDING')}>
                  {budget.status === 'APPROVED' && <CheckCircle className="mr-1 h-3 w-3" />}
                  {budget.status === 'REJECTED' && <XCircle className="mr-1 h-3 w-3" />}
                  {budget.status === 'PENDING' && <Clock className="mr-1 h-3 w-3" />}
                  {budget.status || 'PENDING'}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Priority</label>
              <div className="mt-1">
                <Badge className={getPriorityColor(budget.priority || 'MEDIUM')}>
                  {budget.priority || 'MEDIUM'}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDate(budget.createdAt)}</span>
              </div>
            </div>

            {budget.approvedAt && (
              <div>
                <label className="text-sm font-medium text-gray-500">Approved</label>
                <div className="mt-1 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>{formatDate(budget.approvedAt)}</span>
                </div>
              </div>
            )}
          </div>

          {budget.description && (
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="mt-1 text-gray-900">{budget.description}</p>
            </div>
          )}

          {budget.approvedBy && (
            <div>
              <label className="text-sm font-medium text-gray-500">Approved By</label>
              <div className="mt-1 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>{budget.approvedBy.name} ({budget.approvedBy.email})</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Items */}
      {budget.items && budget.items.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Budget Items</CardTitle>
            <CardDescription>Breakdown of the budget allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budget.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.unitPrice)} × {item.quantity || 1} = {formatCurrency(item.total || item.unitPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(item.total || (item.unitPrice * (item.quantity || 1)))}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplementary Budgets */}
      {budget.supplementary && budget.supplementary.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Supplementary Budgets</CardTitle>
            <CardDescription>Additional approved funds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budget.supplementary.map((supp) => (
                <div key={supp.id} className="flex items-center justify-between p-3 rounded-lg border bg-green-50">
                  <div>
                    <p className="font-medium">Supplementary Request</p>
                    <p className="text-sm text-gray-500">{supp.reason || 'No reason provided'}</p>
                    <p className="text-xs text-green-600">Approved on {formatDate(supp.approvedAt || supp.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">+{formatCurrency(supp.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Expenditures */}
      {budget.expenditures && budget.expenditures.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Related Expenditures</CardTitle>
            <CardDescription>Expenditures made against this budget</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budget.expenditures.map((expenditure) => (
                <div key={expenditure.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{expenditure.title}</p>
                    <p className="text-sm text-gray-500">{expenditure.description || 'No description'}</p>
                    <p className="text-xs">Created {formatDate(expenditure.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(expenditure.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disbursement History */}
      {budget.transactions && budget.transactions.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Disbursement History</CardTitle>
            <CardDescription>Funds received from this budget</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budget.transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border bg-blue-50">
                  <div>
                    <p className="font-medium">Disbursement #{transaction.reference}</p>
                    <p className="text-sm text-gray-500">{transaction.paymentMethod}</p>
                    <p className="text-xs text-blue-600">{formatDate(transaction.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{formatCurrency(transaction.amount)}</p>
                    <Badge className="bg-green-100 text-green-800">COMPLETED</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
