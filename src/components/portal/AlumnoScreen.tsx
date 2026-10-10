import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { usePortal } from '#/hooks/use-portal'

/**
 * Pantalla del portal del alumno: barra superior con «Atrás» grande y título.
 * Pensada para celular (una columna, botones grandes).
 */
export function AlumnoScreen({
  title,
  testId,
  children,
}: {
  title: string
  testId: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const { portal } = usePortal()

  if (!portal) {
    return (
      <div className="empty-state" role="alert">
        Esta pantalla es solo para alumnos y responsables.
      </div>
    )
  }

  return (
    <div className="padre-screen" data-testid={testId}>
      <header className="app-topbar">
        <button
          type="button"
          className="app-topbar__atras"
          data-testid="alumno-atras"
          onClick={() => void navigate({ to: '/alumno' })}
        >
          <ArrowLeft size={22} aria-hidden />
          <span>Atrás</span>
        </button>
        <h1 className="app-topbar__titulo">{title}</h1>
      </header>
      {children}
    </div>
  )
}
