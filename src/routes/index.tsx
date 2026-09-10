import { createFileRoute, redirect } from '@tanstack/react-router'
import { hasPersistedSession } from '#/lib/session-storage'

export const Route = createFileRoute('/')({
  ssr: false,
  beforeLoad: () => {
    if (hasPersistedSession()) {
      throw redirect({ to: '/dashboard' })
    }
    throw redirect({ to: '/login' })
  },
})
