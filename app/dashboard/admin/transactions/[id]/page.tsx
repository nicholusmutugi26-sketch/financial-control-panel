import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, DollarSign, FileText, User, CheckCircle, CreditCard, Banknote } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'

interface TransactionDetailPageProps {
  params: { id: string }
}

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          id: true,
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
      }
    }
  })

  if (!transaction) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Transaction Not Found</h1>
        <p className="mt-2 text-gray-600">The transaction you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/admin/transactions">Back to Transactions</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/admin/transactions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="welcome-header text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            Transaction Details
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mt-2">
            {transaction.reference || `Transaction ${transaction.id.slice(-8)}`}
          </p>
        </div>
      </div>

      {/* Transaction Overview */}
      <div className="grid-3-cols">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Amount</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(transaction.amount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Transaction amount
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Type</CardTitle>
            <FileText className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <Badge className="text-lg px-3 py-1 bg-blue-100 text-blue-800">
              {transaction.type === 'DISBURSEMENT' && <Banknote className="mr-2 h-4 w-4" />}
              {transaction.type === 'EXPENDITURE' && <CreditCard className="mr-2 h-4 w-4" />}
              {transaction.type}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Transaction type
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Status</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <Badge className={`${getStatusColor(transaction.status || 'PENDING')} text-lg px-3 py-1`}>
              {transaction.status === 'COMPLETED' && <CheckCircle className="mr-2 h-4 w-4" />}
              {transaction.status || 'PENDING'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Current status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Information */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Transaction Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Reference</label>
              <p className="mt-1 text-lg font-medium text-gray-900">{transaction.reference || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Amount</label>
              <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(transaction.amount)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <div className="mt-1">
                <Badge className="bg-blue-100 text-blue-800">
                  {transaction.type}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <Badge className={getStatusColor(transaction.status || 'PENDING')}>
                  {transaction.status === 'COMPLETED' && <CheckCircle className="mr-1 h-3 w-3" />}
                  {transaction.status || 'PENDING'}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Payment Method</label>
              <p className="mt-1 text-gray-900">{transaction.paymentMethod || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDate(transaction.createdAt)}</span>
              </div>
            </div>
          </div>

          {transaction.user && (
            <div>
              <label className="text-sm font-medium text-gray-500">User</label>
              <div className="mt-1">
                <Link
                  href={`/dashboard/admin/users/${transaction.user.id}`}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
                >
                  <User className="h-4 w-4" />
                  <span>{transaction.user.name} ({transaction.user.email})</span>
                </Link>
              </div>
            </div>
          )}

          {transaction.budget && (
            <div>
              <label className="text-sm font-medium text-gray-500">Related Budget</label>
              <div className="mt-1">
                <Link
                  href={`/dashboard/admin/budgets/${transaction.budget.id}`}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80"
                >
                  <FileText className="h-4 w-4" />
                  <span>{transaction.budget.title}</span>
                  <Badge className={getStatusColor(transaction.budget.status || 'PENDING')} variant="outline">
                    {transaction.budget.status || 'PENDING'}
                  </Badge>
                </Link>
              </div>
            </div>
          )}

          {/* Transaction Metadata */}
          {transaction.metadata && Object.keys(transaction.metadata as any).length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500">Additional Details</label>
              <div className="mt-2 space-y-2">
                {Object.entries(transaction.metadata as any).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="text-sm">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}