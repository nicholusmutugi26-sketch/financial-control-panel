import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditBudgetItemsForm from '@/components/forms/EditBudgetItemsForm'

export default async function EditBudgetPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'USER') redirect('/auth/login')

  const budget = await prisma.budget.findUnique({ where: { id: params.id } })
  if (!budget) notFound()
  if (budget.createdBy !== session.user.id) redirect('/dashboard/user/budgets')
  if (budget.status !== 'DRAFT' && budget.status !== 'PENDING') {
    // only allow editing when draft or pending
    redirect(`/dashboard/user/budgets/${params.id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Budget Items</h1>
        <p className="text-gray-600">Modify items for this budget. Total will be recalculated.</p>
      </div>

      {/* Edit items form (client) */}
      {/* @ts-ignore */}
      <EditBudgetItemsForm budgetId={params.id} />
    </div>
  )
}
