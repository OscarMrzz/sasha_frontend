import { createFileRoute, redirect } from '@tanstack/react-router'
import { homePathFromStoredSession } from '#/lib/home-path'
import { hasPersistedSession } from '#/lib/session-storage'

export const Route = createFileRoute('/')({
  ssr: false,
  beforeLoad: () => {
    if (hasPersistedSession()) {
      const to = homePathFromStoredSession()
      throw redirect({ to: to === '/login' ? '/dashboard' : to })
    }
    throw redirect({ to: '/login' })
  },
})
