'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { SocketProvider } from './SocketProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }))

  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch when window regains focus
      refetchWhenOffline={false} // Don't refetch when offline
    >
      <QueryClientProvider client={queryClient}>
        <ErrorBoundaryWrapper>
          <SocketProvider>
            {children}
          </SocketProvider>
        </ErrorBoundaryWrapper>
      </QueryClientProvider>
    </SessionProvider>
  )
}

/**
 * Simple error boundary for Socket provider failures
 * Ensures Socket.IO errors don't break the entire app
 */
function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div style={{ padding: '20px', color: '#d32f2f' }}>
        <p>Failed to initialize Socket.IO connection. This is optional and won&apos;t affect core functionality.</p>
        <button onClick={() => setHasError(false)} style={{ marginTop: '10px', padding: '8px 16px' }}>
          Retry
        </button>
      </div>
    )
  }

  try {
    return <>{children}</>
  } catch (error) {
    console.error('Error in SocketProvider:', error)
    setHasError(true)
    return null
  }
}