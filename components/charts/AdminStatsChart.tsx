"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface AdminStatsChartProps {
  data: any[]
}

export default function AdminStatsChart({ data }: AdminStatsChartProps) {
  const chartData = (data || []).map((item: any) => ({
    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short' }),
    // include supplementary amounts in the total budget per month
    total: (parseFloat(item.total_amount) || 0) + (parseFloat(item.total_supplementary) || 0),
    total_expenditures: parseFloat(item.total_expenditures) || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value: any) => [`KES ${Number(value).toLocaleString()}`, '']} />
        <Legend />
        <Bar dataKey="total" name="Total Budget (incl. supplementary)" fill="#3b82f6" />
        <Bar dataKey="total_expenditures" name="Expenditures" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  )

}
