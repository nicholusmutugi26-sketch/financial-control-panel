"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RemitForm() {
  const [amount, setAmount] = useState<number>(0)
  const [note, setNote] = useState('')
  const [proof, setProof] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (amount <= 0) return toast.error('Enter amount')
    try {
      setLoading(true)
      const res = await fetch('/api/remittances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, note, proof })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Remittance submitted — awaiting verification')
      setAmount(0)
      setNote('')
      setProof('')
      // refresh
      window.location.href = '/dashboard/user/remit'
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Amount</Label>
        <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </div>
      <div>
        <Label>Note</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div>
        <Label>Proof (Mpesa/Bank)</Label>
        <Input value={proof} onChange={(e) => setProof(e.target.value)} />
      </div>
      <Button onClick={submit} disabled={loading}>{loading ? 'Submitting...' : 'Submit Remittance'}</Button>
    </div>
  )
}
