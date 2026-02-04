"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm, FormProvider, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

const expenditureSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  budgetId: z.string().min(1),
  items: z
    .array(
      z.object({
        budgetItemId: z.string().min(1),
        spentAmount: z.number().min(0),
      })
    )
    .min(1),
  requestSupplementary: z.boolean().optional(),
  supplementaryReason: z.string().optional(),
})

type ExpenditureFormValues = z.infer<typeof expenditureSchema>

export default function CreateExpenditureForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [budgets, setBudgets] = useState<{ id: string; title: string; status?: string }[]>([])
  const [itemsForBudget, setItemsForBudget] = useState<{ id: string; name: string; unitPrice: number }[]>([])
  const [noDisbursedBudgets, setNoDisbursedBudgets] = useState(false)

  const methods = useForm<ExpenditureFormValues>({
    resolver: zodResolver(expenditureSchema),
    defaultValues: { title: '', description: '', budgetId: '', items: [], requestSupplementary: false, supplementaryReason: '' },
  })

  const { control, watch, setValue, handleSubmit } = methods
  const { replace } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/budgets?limit=1000')
        if (!res.ok) return
        const json = await res.json()
        const raw = json.data || json.budgets || json.budgetsList || json
        
        // Filter budgets: only APPROVED and with DISBURSED or PARTIALLY_DISBURSED status
        const list = (raw || [])
          .filter((b: any) => {
            const status = b.status || ''
            return status === 'APPROVED' || status === 'DISBURSED' || status === 'PARTIALLY_DISBURSED'
          })
          .map((b: any) => ({
            id: b.id,
            title: b.title || b.name || 'Untitled',
            status: b.status,
            createdAt: b.createdAt || b.created_at || b.createdAtDate,
          }))
        
        // sort latest first if createdAt present
        list.sort((a: any, b: any) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return tb - ta
        })
        
        if (mounted) {
          setBudgets(list)
          setNoDisbursedBudgets(list.length === 0)
        }
      } catch (e) {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const calculateTotal = () => {
    const items = watch('items') || []
    return items.reduce((s: number, it: any) => s + (Number(it.spentAmount) || 0), 0)
  }

  const handleBudgetChange = async (budgetId: string) => {
    if (!budgetId) {
      setItemsForBudget([])
      replace([])
      return
    }

    try {
      const res = await fetch(`/api/budgets/${budgetId}/items`)
      if (!res.ok) return
      const json = await res.json()
      const rawItems = json.items || []
      const items = rawItems.map((it: any) => ({
        id: it.id,
        name: it.name || it.title || 'Item',
        unitPrice: Number(it.unitPrice ?? it.unit_price ?? it.price ?? 0),
      }))
      setItemsForBudget(items)
      replace(items.map((it: any) => ({ budgetItemId: it.id, spentAmount: it.unitPrice ?? 0 })))
    } catch (e) {
      setItemsForBudget([])
    }
  }

  const prefillFromItem = (itemId?: string) => {
    if (!itemId) return
    const idx = itemsForBudget.findIndex(i => i.id === itemId)
    if (idx === -1) return
    setValue(`items.${idx}.spentAmount` as any, itemsForBudget[idx].unitPrice)
  }

  const onSubmit = async (data: ExpenditureFormValues) => {
    try {
      console.log('onSubmit called', data)
      setLastAction('Submitting')
      setIsLoading(true)
      const payload = {
        title: data.title,
        description: data.description,
        budgetId: data.budgetId,
        items: data.items.map(i => ({ budgetItemId: i.budgetItemId, spentAmount: Number(i.spentAmount) })),
        requestSupplementary: data.requestSupplementary,
        supplementaryReason: data.supplementaryReason,
      }

      const res = await fetch('/api/expenditures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to create expenditure')

      toast.success('Expenditure created')
      console.log('expenditure created', json)
      router.push('/dashboard/user/expenditures')
    } catch (e: any) {
      console.error('onSubmit error', e)
      toast.error(e?.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
      setLastAction(null)
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <FormField
                control={control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expenditure Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Office Supplies" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="budgetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val)
                          handleBudgetChange(val)
                        }}
                        defaultValue={field.value}
                        disabled={isLoading || noDisbursedBudgets}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={noDisbursedBudgets ? "No disbursed budgets available" : "Select a budget"} />
                        </SelectTrigger>
                        <SelectContent>
                          {budgets.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No budgets available
                            </div>
                          ) : (
                            budgets.map(b => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.title}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      {noDisbursedBudgets 
                        ? "You need an approved budget with disbursed funds to create expenditures"
                        : "Select a budget to load its items"
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="space-y-4">
              {itemsForBudget.map((it, idx) => (
                <Card key={it.id}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{it.name}</h4>
                        <p className="text-sm text-muted-foreground">Budget price: KES {it.unitPrice}</p>
                      </div>

                      <div className="w-1/3">
                        <FormField
                          control={control}
                          name={`items.${idx}.spentAmount` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount Spent</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="mt-2 flex gap-2">
                          <Button variant="ghost" size="sm" type="button" onClick={() => prefillFromItem(it.id)} disabled={isLoading}>
                            Use budget price
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {itemsForBudget.length > 0 && (() => {
                const budgetTotal = itemsForBudget.reduce((s, it) => s + (Number(it.unitPrice) || 0), 0)
                const total = calculateTotal()
                return (
                  <>
                    <div className="p-4 bg-muted rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm">Budget Total</p>
                          <p className="text-lg font-semibold">KES {budgetTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-sm">Expenditure Total</p>
                          <p className="text-lg font-semibold">KES {total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>

                    {total > budgetTotal && (
                      <Card>
                        <CardContent>
                          <FormField
                            control={control}
                            name="requestSupplementary"
                            render={({ field }) => (
                              <FormItem>
                                <label className="flex items-center gap-2">
                                  <input type="checkbox" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} disabled={isLoading} />
                                  <span className="font-medium">Request supplementary budget</span>
                                </label>
                                <FormDescription className="mt-2">Your expenditure exceeds the budget total. Optionally request additional funds.</FormDescription>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={control}
                            name="supplementaryReason"
                            render={({ field }) => (
                              <FormItem className="mt-4">
                                <FormLabel>Reason for supplementary request</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Explain why additional funds are needed" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    )}
                  </>
                )
              })()}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.back()} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            onClick={() => {
              console.log('submit button clicked')
              setLastAction('Clicked submit')
            }}
          >
            {isLoading ? 'Creating...' : 'Create Expenditure'}
          </Button>
        </div>
        {lastAction && (
          <div className="text-sm text-gray-500">Status: {lastAction}</div>
        )}
      </form>
    </FormProvider>
  )
}
