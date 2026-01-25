'use client'

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Item = { id?: string; name: string; unitPrice: number; quantity?: number }

export default function EditBudgetItemsForm({ budgetId }: { budgetId: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<{ items: Item[] }>({
    defaultValues: { items: [] }
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/budgets/${budgetId}/items`)
        if (!res.ok) return
        const json = await res.json()
        if (mounted) form.reset({ items: json.items || [] })
      } catch (e) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [budgetId])

  const onSubmit = async (data: { items: Item[] }) => {
    try {
      setIsLoading(true)
      // collect deleted ids by comparing fields
      const existingIds = fields.map(f => f.id).filter(Boolean)
      const sentIds = data.items.map(i => i.id).filter(Boolean)
      const deletedIds = existingIds.filter(id => id && !sentIds.includes(id as string))

      const response = await fetch(`/api/budgets/${budgetId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: data.items, deletedIds }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update items')
      toast.success('Budget items updated')
      router.push(`/dashboard/user/budgets/${budgetId}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Edit Budget Items</h3>
                <p className="text-sm text-gray-500">Modify, add or remove items. Total will be recalculated.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', unitPrice: 0, quantity: 1 })}>
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField control={form.control} name={`items.${index}.name` as any} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Item name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name={`items.${index}.quantity` as any} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name={`items.${index}.unitPrice` as any} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price (KES) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-end gap-4 mt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Items'}</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}
