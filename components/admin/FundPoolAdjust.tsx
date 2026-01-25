"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'

export default function FundPoolAdjust({ balance }: { balance: number }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT')
  const [amount, setAmount] = useState<number>(0)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (amount <= 0) {
      toast.error('Enter a positive amount')
      return
    }

    const delta = mode === 'DEPOSIT' ? amount : -amount

    try {
      setLoading(true)
      const res = await fetch('/api/fund-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, note })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update pool')
      toast.success('Pool updated')
      setOpen(false)
      // refresh
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 xs:px-6 py-2 rounded-lg transition-all hover:shadow-lg font-poppins text-sm xs:text-base">
          Adjust Pool
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-w-[90vw] w-full">
        <DialogHeader>
          <DialogTitle className="text-lg xs:text-xl font-poppins">Adjust Fund Pool</DialogTitle>
          <DialogDescription className="text-xs xs:text-sm">Deposit or withdraw funds from the common pool</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label className="text-xs xs:text-sm font-semibold mb-3 block">Action</Label>
            <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)} className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-2 xs:p-3 rounded-lg border border-border hover:bg-muted cursor-pointer">
                <RadioGroupItem value="DEPOSIT" id="deposit" />
                <Label htmlFor="deposit" className="cursor-pointer flex-1 text-xs xs:text-sm">Deposit</Label>
              </div>
              <div className="flex items-center gap-3 p-2 xs:p-3 rounded-lg border border-border hover:bg-muted cursor-pointer">
                <RadioGroupItem value="WITHDRAW" id="withdraw" />
                <Label htmlFor="withdraw" className="cursor-pointer flex-1 text-xs xs:text-sm">Withdraw</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="amount" className="text-xs xs:text-sm font-semibold mb-2 block">Amount</Label>
            <Input 
              id="amount"
              type="number" 
              min={0} 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
              className="text-base xs:text-lg font-semibold font-poppins"
            />
          </div>

          <div>
            <Label htmlFor="note" className="text-xs xs:text-sm font-semibold mb-2 block">Note (optional)</Label>
            <Input 
              id="note"
              value={note} 
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this transaction"
              className="text-xs xs:text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 flex flex-col xs:flex-row">
          <Button variant="outline" onClick={() => setOpen(false)} className="text-xs xs:text-sm">Cancel</Button>
          <Button 
            className={`font-semibold text-xs xs:text-sm font-poppins ${mode === 'DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
            onClick={submit} 
            disabled={loading}
          >
            {loading ? 'Processing...' : (mode === 'DEPOSIT' ? 'Deposit' : 'Withdraw')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
