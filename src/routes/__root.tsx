import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect } from 'react'
import { AppProviders } from '#/components/providers/AppProviders'
import { useMantenimiento } from '#/hooks/use-mantenimiento'
import { useSession } from '#/hooks/use-session'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Sasha — Gestión escolar' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  return (
    <AppProviders>
      <MantenimientoWatcher />
      <Outlet />
    </AppProviders>
  )
}

/**
 * Redirección global de mantenimiento: si el modo está activo y el usuario no
 * está ya en la pantalla, se fuerza la navegación dura (recarga completa) para
 * que no se pueda esquivar navegando dentro de la app. El rol `developer`
 * queda exento para poder apagarlo desde la web.
 */
function MantenimientoWatcher() {
  const { activo } = useMantenimiento()
  const { session } = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (!activo) return
    if (typeof window === 'undefined') return
    const limpio = pathname.replace(/\/$/, '')
    if (limpio === '/mantenimiento' || limpio === '/login') return
    if (session?.knownRoles?.includes('developer')) return
    window.location.assign('/mantenimiento')
  }, [activo, pathname, session?.knownRoles])

  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
