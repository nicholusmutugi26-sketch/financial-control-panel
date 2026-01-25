'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

const disburseSchema = z.object({
  type: z.enum(['FULL', 'PARTIAL']),
  amount: z.number().positive('Amount must be positive'),
  disbursementMethod: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER']),
  notes: z.string().optional(),
})

type DisbursementFormValues = z.infer<typeof disburseSchema>

interface DisbursementFormProps {
  budgetId: string
  budgetAmount: number
  allocatedAmount: number
  disbursedAmount?: number
  onSuccess?: () => void
}

export default function DisbursementForm({
  budgetId,
  budgetAmount,
  allocatedAmount,
  disbursedAmount = 0,
  onSuccess,
}: DisbursementFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Remaining amount to disburse from allocated budget
  const remainingAmount = allocatedAmount - disbursedAmount

  const form = useForm<DisbursementFormValues>({
    resolver: zodResolver(disburseSchema),
    defaultValues: {
      type: 'FULL',
      amount: remainingAmount,
      disbursementMethod: 'BANK_TRANSFER',
      notes: '',
    },
  })

  const selectedType = form.watch('type')

  const onSubmit = async (data: DisbursementFormValues) => {
    try {
      setIsLoading(true)

      // Validate amount
      if (data.amount > remainingAmount) {
        toast.error(`Amount exceeds remaining allocated balance. Available: KES ${remainingAmount.toLocaleString()}`)
        return
      }

      const response = await fetch(`/api/budgets/${budgetId}/disburse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: data.type,
          amount: data.amount,
          disbursementMethod: data.disbursementMethod,
          notes: data.notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Disbursement failed')
      }

      toast.success(`KES ${data.amount.toLocaleString()} disbursed successfully!`)
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (remainingAmount <= 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <p className="text-center text-green-700 font-medium">
            ✓ Full budget amount has been disbursed
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Disbursement Information</h3>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Budget</p>
                  <p className="text-lg font-semibold">KES {budgetAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Allocated Amount</p>
                  <p className="text-lg font-semibold text-blue-600">
                    KES {allocatedAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Remaining to Disburse</p>
                  <p className="text-lg font-semibold text-amber-600">
                    KES {remainingAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              {disbursedAmount > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-gray-500">Already Disbursed</p>
                  <p className="text-lg font-semibold text-green-600">
                    KES {disbursedAmount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Disbursement Type *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                      disabled={isLoading}
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="FULL" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Full Remaining Amount (KES {remainingAmount.toLocaleString()})
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="PARTIAL" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Partial Amount
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === 'PARTIAL' && (
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Amount (KES) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        max={remainingAmount}
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum: KES {remainingAmount.toLocaleString()}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="disbursementMethod"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Disbursement Method *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select how the funds will be disbursed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this disbursement (e.g., reference number, conditions, etc.)"
                      {...field}
                      disabled={isLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onSuccess ? onSuccess() : window.history.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Processing...' : `Disburse KES ${selectedType === 'FULL' ? remainingAmount.toLocaleString() : 'Amount'}`}
          </Button>
        </div>
      </form>
    </Form>
  )
}
