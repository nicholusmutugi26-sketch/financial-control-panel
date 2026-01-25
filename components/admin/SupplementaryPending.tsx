"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Pending = {
  id: string
  amount: number
  reason?: string
  status: string
  createdAt: string
  creator: { id: string; name?: string; email?: string }
  budget: { id: string; title?: string }
  relatedExpenditure?: { id: string; title?: string } | null
}
export default function SupplementaryPending({ limit }: { limit?: number }) {
  const [pending, setPending] = useState<Pending[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPending = async () => {
    try {
      const res = await fetch('/api/supplementary/pending')
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setPending(json.pending || [])
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => { fetchPending() }, [])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return
    try {
      setLoading(true)
      const res = await fetch(`/api/supplementary/${id}/${action}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')
      toast.success(`Request ${action}ed`)
      // remove from list
      setPending(p => p.filter(x => x.id !== id))
    } catch (e: any) {
      toast.error(e.message || 'Failed')
    } finally { setLoading(false) }
  }

  if (pending.length === 0) return (
    <div className="p-4 text-center text-sm text-gray-500">No pending supplementary requests</div>
  )

  const shown = typeof limit === 'number' ? pending.slice(0, limit) : pending

  return (
    <div className="space-y-3">
      {shown.map(p => (
        <div key={p.id} className="flex items-center justify-between p-3 bg-white border rounded">
          <div>
            <div className="font-medium">{p.budget?.title || 'Budget'} — KES {p.amount}</div>
            <div className="text-sm text-gray-500">{p.reason || 'No reason provided'}</div>
            <div className="text-xs text-gray-400">Requested by {p.creator?.name || p.creator?.email} • {new Date(p.createdAt).toLocaleString()}</div>
            {p.relatedExpenditure && (
              <div className="mt-1 text-sm">
                Related expenditure: <Link href={`/dashboard/admin/expenditures/${p.relatedExpenditure.id}`} className="text-sky-600 hover:underline">{p.relatedExpenditure.title || 'View expenditure'}</Link>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={loading} onClick={() => handleAction(p.id, 'approve')}>Approve</Button>
            <Button size="sm" variant="destructive" disabled={loading} onClick={() => handleAction(p.id, 'reject')}>Reject</Button>
          </div>
        </div>
      ))}
      {typeof limit === 'number' && pending.length > limit && (
        <div className="pt-2 flex justify-center">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/admin/supplementary">View all supplementary</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
