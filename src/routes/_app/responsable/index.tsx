import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { useCan } from '#/components/gates/Can'
import { AvisoBanner } from '#/components/layout/AvisoBanner'
import { isResponsableRole } from '#/lib/home-path'
import { writePortalAlumnoId } from '#/lib/portal-context'
import { listHijos } from '#/services/portal'
import type { PortalHijo } from '#/services/portal'

export const Route = createFileRoute('/_app/responsable/')({
  component: ResponsableHomePage,
})

function ResponsableHomePage() {
  const { roles } = useCan()
  const navigate = useNavigate()
  const responsable = isResponsableRole(roles)
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['portal-hijos'],
    queryFn: listHijos,
    enabled: responsable,
  })

  const elegir = (h: PortalHijo, replace = false) => {
    writePortalAlumnoId(h.alumno_id)
    void navigate({ to: '/alumno', replace })
  }

  useEffect(() => {
    if (data.length === 1) elegir(data[0], true)
  }, [data])

  if (!responsable) {
    return (
      <div className="empty-state" role="alert">
        Esta pantalla es solo para responsables.
      </div>
    )
  }

  return (
    <div className="maestro-hub" data-testid="responsable-home">
      <AvisoBanner />
      <header className="maestro-hub__header">
        <h1 className="page-title" style={{ margin: 0 }}>
          Mis alumnos
        </h1>
        <p className="texto-muted" style={{ margin: '0.35rem 0 0' }}>
          Elige al alumno para ver su horario, clases y tareas.
        </p>
      </header>

      {isLoading ? (
        <div className="empty-state">Cargando alumnos…</div>
      ) : isError ? (
        <div className="empty-state" data-testid="responsable-home-error">
          Hay problemas de conexión.
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state" data-testid="responsable-home-empty">
          No tienes alumnos a cargo registrados.
        </div>
      ) : (
        <div className="maestro-hub__cards" data-testid="responsable-hijos">
          {data.map((h) => (
            <button
              key={h.alumno_id}
              type="button"
              className="maestro-hub__card clase-card"
              data-testid={`responsable-hijo-${h.user_code}`}
              onClick={() => elegir(h)}
            >
              <div className="maestro-hub__card-top">
                <h2 className="maestro-hub__card-title">{h.nombre}</h2>
                <UserRound size={18} className="texto-muted" />
              </div>
              <p className="maestro-hub__card-meta">
                {h.grado ? `${h.grado} · sec${h.seccion}` : 'Sin matrícula activa'}
              </p>
              <p className="maestro-hub__card-meta texto-muted">
                {[h.parentesco, h.user_code].filter(Boolean).join(' · ')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
