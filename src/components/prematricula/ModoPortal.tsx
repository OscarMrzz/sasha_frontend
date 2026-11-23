import { useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate, useRouterState } from '@tanstack/react-router'
import { GraduationCap, LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCan } from '#/components/gates/Can'
import { getModos } from '#/services/prematricula'
import { listHijos } from '#/services/portal'
import { writePortalAlumnoId } from '#/lib/portal-context'
import { userMessageFromError } from '#/lib/api'
import { getResultadoPeriodo } from '#/services/portal'
import '#/styles/prematricula.css'

export function ModoPortal({ children }: { children: ReactNode }) {
  const { roles } = useCan()
  const portal =
    roles.length === 1 &&
    (roles.includes('responsable') || roles.includes('alumno'))
  const responsable = roles.includes('responsable')
  const path = useRouterState({ select: (s) => s.location.pathname })
  const config = useQuery({
    queryKey: ['modos-institucion'],
    queryFn: getModos,
    enabled: portal,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  })
  const modoConfigurado = config.data?.modo_efectivo ?? config.data?.modo
  const hijos = useQuery({
    queryKey: ['portal-hijos'],
    queryFn: listHijos,
    enabled: portal && responsable && config.data?.modo !== 'normal',
  })
  const resultado = useQuery({
    queryKey: ['portal-resultado'],
    queryFn: () => getResultadoPeriodo(),
    enabled: portal && !responsable && path === '/alumno' && modoConfigurado === 'prematricula',
  })
  const navigate = useNavigate()
  if (!portal || path === '/responsable') return children
  if (config.isPending)
    return (
      <p className="empty-state" role="status">
        Cargando período institucional…
      </p>
    )
  if (config.isError)
    return (
      <p className="empty-state" role="alert">
        {userMessageFromError(config.error)}
      </p>
    )
  const modo = config.data.modo_efectivo ?? config.data.modo
  if (modo === 'prematricula' && !responsable && path === '/alumno') {
    if (resultado.isPending) {
      return <p className="empty-state" role="status">Revisando pagos pendientes…</p>
    }
    if (resultado.isError) return <p className="empty-state" role="alert">No se pudo verificar el estado de las calificaciones.</p>
    if (resultado.data?.estado === 'bloqueado') {
      return (
        <div className="pre-mode-portal">
          <section className="pre-hero pre-hero--deuda" role="status">
            <LockKeyhole size={42} aria-hidden="true" />
            <h1>Calificaciones bloqueadas</h1>
            <p>El período ya culminó, pero tienes pagos pendientes. Tus calificaciones se habilitarán cuando se confirmen los pagos.</p>
          </section>
        </div>
      )
    }
  }
  if (responsable && path === '/alumno' && modo !== 'normal') {
    return <Navigate to="/responsable" replace />
  }
  if (modo === 'normal' || path === '/alumno/resultados') return children
  const verCalificaciones = (alumnoId?: string) => {
    if (alumnoId) writePortalAlumnoId(alumnoId)
    void navigate({ to: '/alumno/resultados' })
  }
  return (
    <div className="pre-mode-portal">
      <section className="pre-hero">
        <GraduationCap size={42} />
        <h1>El período académico ha culminado</h1>
        <p>Puedes consultar las calificaciones finales.</p>
        {responsable ? (
          hijos.isError ? (
            <p role="alert">{userMessageFromError(hijos.error)}</p>
          ) : (
            <div className="pre-actions">
              {hijos.data?.map((h) => (
                <button
                  key={h.alumno_id}
                  className="btn btn--secondary"
                  onClick={() => verCalificaciones(h.alumno_id)}
                >
                  Calificaciones de {h.nombre}
                </button>
              ))}
            </div>
          )
        ) : (
          <button
            className="btn btn--primary"
            onClick={() => verCalificaciones()}
          >
            Ver calificaciones
          </button>
        )}
      </section>
    </div>
  )
}
