import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

export default async function AdminSupplementaryPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/auth/login')

  const supplementary = await prisma.supplementaryBudget.findMany({
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: { id: true, name: true, email: true } }, budget: { select: { id: true, title: true } } }
  })

  // best-effort find a related expenditure for each supplementary
  const enriched = await Promise.all(supplementary.map(async (s) => {
    const start = new Date(s.createdAt)
    start.setMinutes(start.getMinutes() - 5)
    const end = new Date(s.createdAt)
    end.setMinutes(end.getMinutes() + 5)
    const related = await prisma.expenditure.findFirst({
      where: { createdBy: s.createdBy, budgetId: s.budgetId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true }
    })
    return { ...s, relatedExpenditure: related || null }
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>All Supplementary Budgets</CardTitle>
          <CardDescription>List of supplementary budget requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {enriched.map((s) => (
              <div key={s.id} className="p-3 bg-white border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.budget?.title || 'Budget'} — {formatCurrency(s.amount)}</div>
                  <div className="text-sm text-gray-500">Requested by {s.creator?.name || s.creator?.email} • {new Date(s.createdAt).toLocaleString()}</div>
                  {s.relatedExpenditure && (
                    <div className="text-sm mt-1">Related expenditure: <Link href={`/dashboard/admin/expenditures/${s.relatedExpenditure.id}`} className="text-sky-600 hover:underline">{s.relatedExpenditure.title}</Link></div>
                  )}
                </div>
                <div className="text-sm text-gray-600">{s.status}</div>
              </div>
            ))}
            {enriched.length === 0 && <p className="text-center text-gray-500 py-6">No supplementary budgets</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
