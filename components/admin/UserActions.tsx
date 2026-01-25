"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function UserActions({ userId, role }: { userId: string; role: string }) {
  const router = useRouter()
  const handleAction = async (action: 'promote' | 'demote') => {
    const confirmMsg = `Are you sure you want to ${action} this user?`
    if (!confirm(confirmMsg)) return

    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Action failed')
      toast.success('Action completed')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  // Only allow promote/demote for non-admin users
  if (role === 'ADMIN') {
    return (
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline" asChild>
          <a href={`/dashboard/admin/users/${userId}`}>View Profile</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 mt-2">
      <Button size="sm" variant="outline" asChild>
        <a href={`/dashboard/admin/users/${userId}`}>View Profile</a>
      </Button>
      <Button size="sm" onClick={() => handleAction('promote')}>Promote to Admin</Button>
    </div>
  )
}
