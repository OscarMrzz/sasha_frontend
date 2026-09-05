import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '#/components/layout/AppShell'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('sasha.session') : null
    if (!raw) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
