"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Mail, Phone, Calendar, Check, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface PendingUser {
  id: string
  name: string | null
  email: string
  phoneNumber?: string | null
  createdAt: Date
}

interface PendingUsersApprovalProps {
  pendingUsers: PendingUser[]
  onApprovalChange?: () => void
}

export default function PendingUsersApproval({ pendingUsers, onApprovalChange }: PendingUsersApprovalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleApprove = async (userId: string) => {
    if (!confirm('Approve this user?')) return

    setLoading(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json?.error || 'Failed to approve')

      setTimeout(() => router.refresh(), 500)
      toast.success('User approved successfully')
      onApprovalChange?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve user')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async (userId: string) => {
    if (!confirm('Reject this user? They will be deleted from the system.')) return

    setLoading(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json?.error || 'Failed to reject')
setTimeout(() => router.refresh(), 500)
      
      toast.success('User rejected and deleted')
      onApprovalChange?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject user')
    } finally {
      setLoading(null)
    }
  }

  if (pendingUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending User Approvals</CardTitle>
          <CardDescription>Review and approve new user registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No pending approvals at this time</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending User Approvals</CardTitle>
        <CardDescription>
          {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} awaiting approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-amber-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{user.name || 'Unnamed User'}</h3>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                    Pending
                  </Badge>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                  {user.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {user.phoneNumber}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Registered {formatDate(user.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(user.id)}
                  disabled={loading === user.id}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(user.id)}
                  disabled={loading === user.id}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
