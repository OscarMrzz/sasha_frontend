import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '#/components/layout/AppShell'
import { hasPersistedSession } from '#/lib/session-storage'

export const Route = createFileRoute('/_app')({
  // localStorage no existe en SSR: sin esto, beforeLoad manda siempre a /login y luego el cliente corrige (parpadeo).
  ssr: false,
  beforeLoad: () => {
    if (!hasPersistedSession()) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
