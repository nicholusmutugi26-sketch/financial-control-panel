import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CreateExpenditureForm from '@/components/forms/CreateExpenditureForm'

export default async function NewExpenditurePage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Expenditure</h1>
        <p className="text-gray-600">
          Submit a new expenditure with item breakdown
        </p>
      </div>

      <CreateExpenditureForm />
    </div>
  )
}