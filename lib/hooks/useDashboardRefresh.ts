import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Hook for refreshing dashboard data without logging out
 * Clears React Query cache and refetches data
 */
export function useDashboardRefresh() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const refreshDashboard = useCallback(async () => {
    try {
      // Clear React Query cache for fresh data
      await queryClient.invalidateQueries()

      // Refresh the page within the same session
      // Use router.refresh() which doesn't lose the session
      router.refresh()

      console.log('Dashboard refreshed successfully')
    } catch (error) {
      console.error('Dashboard refresh error:', error)
    }
  }, [queryClient, router])

  return { refreshDashboard }
}
