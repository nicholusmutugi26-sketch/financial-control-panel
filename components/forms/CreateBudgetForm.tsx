'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

const budgetSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.enum(['EMERGENCY', 'URGENT', 'NORMAL', 'LONG_TERM']),
  items: z.array(z.object({
    name: z.string().min(1, 'Item name is required'),
    unitPrice: z.number().positive('Unit price must be positive'),
    quantity: z.number().min(1).optional().default(1),
  })).min(1, 'At least one budget item is required'),
})

type BudgetFormValues = z.infer<typeof budgetSchema>

export default function CreateBudgetForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'NORMAL',
      items: [
        { name: '', unitPrice: 0, quantity: 1 }
      ],
    },
  })


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const calculateItemsTotal = () => {
    const items = form.watch('items') || []
    return items.reduce((s: number, it: any) => s + ((it.unitPrice || 0) * (it.quantity || 1)), 0)
  }

  const onSubmit = async (data: BudgetFormValues) => {
    try {
      setIsLoading(true)

      // Calculate total amount from items
      const items = data.items || []
      const calculatedAmount = items.reduce((s, it) => s + ((it.unitPrice || 0) * (it.quantity || 1)), 0)

      const payload = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        amount: calculatedAmount,
        disbursementType: 'FULL',
        items: items,
      }

      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create budget')
      }

      toast.success('Budget created successfully!')
      router.push('/dashboard/user/budgets')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Monthly Office Supplies"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the purpose of this budget..."
                        className="min-h-[100px]"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Budget amount is calculated from items; users must add items below */}

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                        <SelectItem value="EMERGENCY">Emergency</SelectItem>
                        <SelectItem value="LONG_TERM">Long Term</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Emergency: Immediate action required, Urgent: Within 24 hours, Normal: Regular, Long Term: Future planning
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Disbursement type and batching are controlled by admins; removed from user form */}
            </div>
          </CardContent>
        </Card>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Budget Items</h3>
                <p className="text-sm text-gray-500">Optional: add individual items and their prices</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', unitPrice: 0, quantity: 1 })}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {fields.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.name` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Printer Paper" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price (KES) *</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Items Total:</span>
                <span className="text-2xl font-bold">KES {calculateItemsTotal().toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Budget'}
          </Button>
        </div>
      </form>
    </Form>
  )
}