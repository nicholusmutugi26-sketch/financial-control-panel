"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Props = {
  type?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  children?: React.ReactNode
  className?: string
}

export default function GenerateReportButton({ type, children, className }: Props) {
  const router = useRouter()

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type || 'MONTHLY' }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to generate report')
        return
      }
      // navigate to download URL if present
      if (data.report?.downloadUrl) {
        window.location.href = data.report.downloadUrl
        return
      }
      // otherwise refresh the page to show new report
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error generating report')
    }
  }

  return (
    <Button className={className} onClick={handleClick}>
      {children ?? 'Generate Report'}
    </Button>
  )
}
