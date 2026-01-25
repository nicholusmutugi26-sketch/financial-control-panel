import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RemittancesList from '@/components/admin/RemittancesList'

export default async function RemittancesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/auth/login')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-sky-50 to-white p-4">
          <CardTitle className="text-sky-700">Remittances</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Render client list (handles actions) */}
          <RemittancesList />
        </CardContent>
      </Card>
    </div>
  )
}
