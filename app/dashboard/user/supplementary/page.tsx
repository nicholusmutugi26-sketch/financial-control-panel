import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'

export default async function UserSupplementaryPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  const supplementary = await prisma.supplementaryBudget.findMany({
    where: { createdBy: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { budget: { select: { title: true } } },
    take: 50,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Supplementary Requests</h1>
          <p className="text-gray-600">Review the supplementary budget requests you've submitted.</p>
        </div>
        <div />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplementary Budgets</CardTitle>
          <CardDescription>Your supplementary requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {supplementary.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-white border rounded">
                <div>
                  <div className="font-medium">{s.budget?.title || 'Budget'} — {formatCurrency(s.amount)}</div>
                  <div className="text-sm text-gray-500">{s.reason || 'No reason provided'}</div>
                  <div className="text-xs text-gray-400">{formatDate(s.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}>{s.status}</div>
                </div>
              </div>
            ))}

            {supplementary.length === 0 && (
              <p className="text-gray-500 text-center py-6">No supplementary requests yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
