import { Navigate, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { usePortal } from '#/hooks/use-portal'

/**
 * Pantalla del portal del padre: barra con «Atrás» grande y título. Sin hijo elegido vuelve a
 * `/responsable`; otros roles ven un aviso.
 */
export function PadreScreen({
  title,
  testId,
  backTo = '/alumno',
  action,
  children,
}: {
  title: string
  testId: string
  backTo?: '/alumno' | '/hijo/plan'
  action?: ReactNode
  children: (alumnoId: string) => ReactNode
}) {
  const navigate = useNavigate()
  const { responsable, alumnoId } = usePortal()

  if (!responsable) {
    return (
      <div className="empty-state" role="alert">
        Esta pantalla es solo para padres y encargados.
      </div>
    )
  }
  if (!alumnoId) return <Navigate to="/responsable" replace />

  return (
    <div className="padre-screen" data-testid={testId}>
      <header className="app-topbar">
        <button
          type="button"
          className="app-topbar__atras"
          data-testid="padre-atras"
          onClick={() => void navigate({ to: backTo })}
        >
          <ArrowLeft size={22} aria-hidden />
          <span>Atrás</span>
        </button>
        <h1 className="app-topbar__titulo">{title}</h1>
        {action ? <div className="app-topbar__accion">{action}</div> : null}
      </header>
      {children(alumnoId)}
    </div>
  )
}
