import { Navigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { usePortal } from '#/hooks/use-portal'
import type { PortalClase } from '#/lib/portal-context'

/** Páginas en modo clase del portal: sin clase elegida vuelven al inicio. */
export function RequirePortalClase({
  children,
}: {
  children: (ctx: { clase: PortalClase; alumnoId: string | null }) => ReactNode
}) {
  const { clase, alumnoId, ready } = usePortal()
  if (!ready || !clase) return <Navigate to="/alumno" replace />
  return <>{children({ clase, alumnoId })}</>
}
