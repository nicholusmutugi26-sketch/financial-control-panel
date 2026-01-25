import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Budget statuses
    DRAFT: 'bg-gray-100 text-gray-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    REVOKED: 'bg-red-100 text-red-800',
    DISBURSED: 'bg-blue-100 text-blue-800',
    PARTIALLY_DISBURSED: 'bg-indigo-100 text-indigo-800',
    COMPLETED: 'bg-purple-100 text-purple-800',
    
    // Expenditure statuses
    PAID: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    
    // Project statuses
    PROPOSED: 'bg-gray-100 text-gray-800',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
    VOTING: 'bg-indigo-100 text-indigo-800',
    STARTED: 'bg-blue-100 text-blue-800',
    PROGRESSING: 'bg-blue-100 text-blue-800',
    NEARING_COMPLETION: 'bg-green-100 text-green-800',
    TERMINATED: 'bg-red-100 text-red-800',
    
    // Transaction statuses
    SUCCESS: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  }
  
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    EMERGENCY: 'bg-red-100 text-red-800 border-red-200',
    URGENT: 'bg-orange-100 text-orange-800 border-orange-200',
    NORMAL: 'bg-blue-100 text-blue-800 border-blue-200',
    LONG_TERM: 'bg-green-100 text-green-800 border-green-200',
  }
  
  return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export function generateReportPeriod(type: 'MONTHLY' | 'QUARTERLY' | 'YEARLY', date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const quarter = Math.ceil(month / 3)
  
  switch (type) {
    case 'MONTHLY':
      return `${year}-${month.toString().padStart(2, '0')}`
    case 'QUARTERLY':
      return `${year}-Q${quarter}`
    case 'YEARLY':
      return year.toString()
    default:
      return `${year}-${month.toString().padStart(2, '0')}`
  }
}

export function getReportDateRange(type: 'MONTHLY' | 'QUARTERLY' | 'YEARLY', date: Date = new Date()): { startDate: Date; endDate: Date } {
  const year = date.getFullYear()
  const month = date.getMonth()
  const quarter = Math.ceil((month + 1) / 3)
  
  switch (type) {
    case 'MONTHLY':
      // First day of current month to last day of current month
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
      return { startDate: monthStart, endDate: monthEnd }
    
    case 'QUARTERLY':
      // First day of quarter to last day of quarter
      const quarterStartMonth = (quarter - 1) * 3
      const quarterStart = new Date(year, quarterStartMonth, 1)
      const quarterEnd = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999)
      return { startDate: quarterStart, endDate: quarterEnd }
    
    case 'YEARLY':
      // First day of year to last day of year
      const yearStart = new Date(year, 0, 1)
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)
      return { startDate: yearStart, endDate: yearEnd }
    
    default:
      const defaultStart = new Date(year, month, 1)
      const defaultEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
      return { startDate: defaultStart, endDate: defaultEnd }
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function validatePhoneNumber(phone: string): boolean {
  const regex = /^254[17]\d{8}$/
  return regex.test(phone)
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}