"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  budgetId?: string
  budgets: Array<{ id: string; title: string }>
}

export default function BudgetFilterButtons({ budgetId, budgets }: Props) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <Button
        variant={!budgetId ? 'default' : 'outline'}
        size="sm"
        onClick={() => router.push('?')}
      >
        All Budgets
      </Button>
      {budgets.map((budget) => (
        <Button
          key={budget.id}
          variant={budgetId === budget.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => router.push(`?budgetId=${budget.id}`)}
        >
          {budget.title}
        </Button>
      ))}
    </div>
  )
}
