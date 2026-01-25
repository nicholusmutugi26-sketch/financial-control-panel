'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterBarProps {
  filters: Array<{ label: string; value: string }>
  priorities?: Array<{ label: string; value: string }>
  defaultStatus?: string
  defaultPriority?: string
  searchPlaceholder?: string
}

export default function FilterBar({
  filters,
  priorities = [],
  defaultStatus = 'ALL',
  defaultPriority = '',
  searchPlaceholder = 'Search...',
}: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(searchParams?.get('search') || '')
  const [status, setStatus] = useState(defaultStatus)
  const [priority, setPriority] = useState(defaultPriority)

  const applyFilters = () => {
    const params = new URLSearchParams()
    
    if (search) params.set('search', search)
    if (status && status !== 'ALL') params.set('status', status)
    if (priority && priority !== 'ALL') params.set('priority', priority)
    
    router.push(`?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('ALL')
    setPriority('')
    router.push('?')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {filters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        {priorities.length > 0 && (
          <div className="w-full md:w-48">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value}>
                    {priority.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={applyFilters}>
            Apply Filters
          </Button>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {(search || status !== 'ALL' || priority) && (
        <div className="flex flex-wrap gap-2">
          {search && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              Search: {search}
            </span>
          )}
          {status !== 'ALL' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              Status: {filters.find(f => f.value === status)?.label}
            </span>
          )}
          {priority && priority !== 'ALL' && priorities.length > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
              Priority: {priorities.find(p => p.value === priority)?.label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}