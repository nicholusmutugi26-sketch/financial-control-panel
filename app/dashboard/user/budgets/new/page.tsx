import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CreateBudgetForm from '@/components/forms/CreateBudgetForm'

export default async function NewBudgetPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Budget</h1>
        <p className="text-gray-600">
          Submit a new budget request for approval
        </p>
      </div>

      <CreateBudgetForm />
    </div>
  )
}