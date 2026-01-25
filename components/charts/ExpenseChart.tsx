'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ExpenseChartProps {
  data: any[]
}

export default function ExpenseChart({ data }: ExpenseChartProps) {
  const chartData = data.map(item => ({
    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    amount: parseFloat(item.total_amount) || 0,
    count: parseInt(item.count) || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip 
          formatter={(value) => [`KES ${Number(value).toLocaleString()}`, '']}
          labelFormatter={(label) => `Month: ${label}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="amount" 
          name="Expenditure Amount" 
          stroke="#3b82f6" 
          strokeWidth={2}
          activeDot={{ r: 8 }}
        />
        <Line 
          type="monotone" 
          dataKey="count" 
          name="Number of Expenses" 
          stroke="#10b981" 
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}