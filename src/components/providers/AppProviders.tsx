import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { SessionProvider } from '#/hooks/use-session'
import { PermissionsProvider } from '#/components/gates/Can'

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              const status = (error as { status?: number })?.status
              if (status === 401 || status === 403) return false
              return failureCount < 1
            },
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      <SessionProvider>
        <PermissionsProvider>
          {children}
          <Toaster
            position="bottom-right"
            duration={5000}
            theme="dark"
            toastOptions={{
              style: {
                background: 'var(--sasha-bg-overlay)',
                border: '1px solid var(--sasha-border-suave)',
                color: 'var(--sasha-texto-primary)',
              },
            }}
          />
        </PermissionsProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}
