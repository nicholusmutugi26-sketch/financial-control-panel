"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

export default function RemittancesList({ limit }: { limit?: number }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchList = async () => {
    try {
      const res = await fetch('/api/remittances')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setItems(data)
    } catch (err: any) {
      console.error(err)
    }
  }

  useEffect(() => { fetchList() }, [])

  const handle = async (id: string, approve: boolean) => {
    if (!confirm('Are you sure?')) return
    try {
      setLoading(true)
      const res = await fetch(`/api/remittances/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Processed')
      fetchList()
      // refresh pool info on page reload if needed
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally { setLoading(false) }
  }

  if (items.length === 0) return <div className="text-sm text-muted-foreground text-center py-4">No remittances yet</div>

  const shown = typeof limit === 'number' ? items.slice(0, limit) : items

  const formatStatus = (s: string) => {
    const lower = String(s || '').toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }

  const statusClasses = (s: string) => {
    const key = String(s || '').toUpperCase()
    switch (key) {
      case 'VERIFIED':
        return 'badge-success'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'PENDING':
      default:
        return 'badge-warning'
    }
  }

  return (
    <div className="space-y-2">
      {shown.map((r) => (
        <div key={r.id} className="p-3 bg-muted/40 border border-border rounded-lg hover:bg-muted/60 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{r.user?.name || r.userId}</div>
              <div className="text-xs text-muted-foreground">{formatCurrency(r.amount)}</div>
              {r.note && <div className="text-xs mt-1 text-muted-foreground line-clamp-2">{r.note}</div>}
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusClasses(r.status)}`}>
                {formatStatus(r.status)}
              </span>
              {String(r.status).toUpperCase() === 'PENDING' && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => handle(r.id, true)} disabled={loading}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => handle(r.id, false)} disabled={loading}>Reject</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {typeof limit === 'number' && items.length > limit && (
        <div className="pt-2 flex justify-center">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/admin/remittances">View all remittances</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
