"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface Props {
  budgetId: string
  status: string
}

export default function BudgetQuickActions({ budgetId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [disbursementType, setDisbursementType] = useState<'FULL' | 'BATCHES'>('FULL')
  const [batchCount, setBatchCount] = useState<number>(3)

  const handleApprove = async (opts?: { disbursementType?: string; batchCount?: number }) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/budgets/${budgetId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocatedAmount: 0, disbursementType: opts?.disbursementType ?? disbursementType, batchCount: opts?.batchCount ?? batchCount })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve')
      toast.success('Budget approved')
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this budget?')) return
    try {
      setLoading(true)
      const res = await fetch(`/api/budgets/${budgetId}/reject`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject')
      toast.success('Budget rejected')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestRevision = async () => {
    const reason = prompt('Please enter the reason for revision request:')
    if (!reason) return
    try {
      setLoading(true)
      const res = await fetch(`/api/budgets/${budgetId}/request-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to request revision')
      toast.success('Revision requested')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'PENDING') {
    return (
      <div className="space-y-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Budget</DialogTitle>
              <DialogDescription>Select disbursement options before approving.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-2 py-2">
              <Label className="text-sm">Disbursement Type</Label>
              <RadioGroup value={disbursementType} onValueChange={(v: any) => setDisbursementType(v)} className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="FULL" id="full" />
                  <Label htmlFor="full">Full</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="BATCHES" id="batches" />
                  <Label htmlFor="batches">Batches</Label>
                </div>
              </RadioGroup>

              {disbursementType === 'BATCHES' && (
                <div>
                  <Label className="text-sm">Number of batches (1-12)</Label>
                  <Input type="number" min={1} max={12} value={batchCount} onChange={(e) => setBatchCount(Number(e.target.value))} />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => handleApprove({ disbursementType, batchCount })} disabled={loading}>
                Confirm Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="outline" className="w-full" onClick={handleReject} disabled={loading}>
          <XCircle className="mr-2 h-4 w-4" />
          Reject Budget
        </Button>
        <Button variant="outline" className="w-full" onClick={handleRequestRevision} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Request Revision
        </Button>
      </div>
    )
  }

  return null
}
