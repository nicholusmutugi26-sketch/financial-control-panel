'use client'

interface MonthlyComparisonChartProps {
  data: any[]
}

export default function MonthlyComparisonChart({ data }: MonthlyComparisonChartProps) {
  return (
    <div className="w-full h-64 flex items-center justify-center bg-muted/30 rounded-lg">
      <p className="text-muted-foreground">Monthly Comparison Chart</p>
    </div>
  )
}
