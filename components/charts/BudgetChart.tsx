'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface BudgetChartProps {
  data: any[]
}

export default function BudgetChart({ data }: BudgetChartProps) {
  const chartData = data.map(item => ({
    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short' }),
    total: parseFloat(item.total_amount) || 0,
    allocated: parseFloat(item.allocated_amount) || 0,
    budgets: parseInt(item.budget_count) || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip 
          formatter={(value) => [`KES ${Number(value).toLocaleString()}`, '']}
          labelFormatter={(label) => `Month: ${label}`}
        />
        <Legend />
        <Bar dataKey="total" name="Total Budget" fill="#3b82f6" />
        <Bar dataKey="allocated" name="Allocated Amount" fill="#10b981" />
        <Bar dataKey="budgets" name="Number of Budgets" fill="#8b5cf6" />
      </BarChart>
    </ResponsiveContainer>
  )
}