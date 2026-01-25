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
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'

const revisionSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
})

type RevisionFormValues = z.infer<typeof revisionSchema>

interface RevisionRequestFormProps {
  budgetId: string
  onSuccess?: () => void
}

export default function RevisionRequestForm({ 
  budgetId, 
  onSuccess 
}: RevisionRequestFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<RevisionFormValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      reason: '',
    },
  })

  const onSubmit = async (data: RevisionFormValues) => {
    try {
      setIsLoading(true)

      const response = await fetch(`/api/budgets/${budgetId}/request-revision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to request revision')
      }

      toast.success('Revision requested successfully')
      
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Revision *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide a detailed reason why you're requesting a revision for this budget"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Be specific about what changes you need and why
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Submitting...' : 'Request Revision'}
        </Button>
      </form>
    </Form>
  )
}