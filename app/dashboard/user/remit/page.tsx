import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import RemitForm from '@/components/forms/RemitForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function RemitPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login')
  }

  const rems = await prisma.remittance.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Remittend Funds</CardTitle>
        </CardHeader>
        <CardContent>
          <RemitForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Remittances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rems.map((r) => (
              <div key={r.id} className="p-3 border rounded">
                <div className="font-medium">{r.amount}</div>
                <div className="text-sm text-gray-500">{r.status} • {new Date(r.createdAt).toLocaleString()}</div>
                {r.note && <div className="text-sm">{r.note}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
