import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AlumnoHorarioView } from '#/components/horarios/AlumnoHorarioView'
import { AvisoBanner } from '#/components/layout/AvisoBanner'
import { Anillo, CUADRO, claseNivelNota } from '#/components/portal/notas-ui'
import { usePortal, usePortalInicio } from '#/hooks/use-portal'
import { userMessageFromError } from '#/lib/api'
import { writePortalClase } from '#/lib/portal-context'
import { HijoHub } from '#/components/portal/padre/HijoHub'
import { getResumenCalificaciones } from '#/services/portal'
import type { PortalClase } from '#/services/portal'

export const Route = createFileRoute('/_app/alumno/')({
  component: AlumnoHomePage,
})

function resumenTareas(c: PortalClase) {
  const partes: string[] = []
  if (c.tareas_hoy > 0) partes.push(`Tarea hoy: ${c.tareas_hoy}`)
  if (c.tareas_manana > 0) partes.push(`${partes.length ? 'Mañana' : 'Tarea mañana'}: ${c.tareas_manana}`)
  return partes.join(' · ')
}

function ResultadoGeneral() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-resumen', 'self'],
    queryFn: () => getResumenCalificaciones(null),
  })
  const cuadro = data?.indicador ? CUADRO[data.indicador] : undefined

  return (
    <section className="portal-home__section" data-testid="alumno-resultado">
      <h2 className="portal-home__section-title">Resultado general</h2>
      {isLoading ? (
        <div className="empty-state">Cargando…</div>
      ) : isError || !data ? (
        <div className="empty-state">No se pudo cargar el resultado.</div>
      ) : data.promedio == null ? (
        <div className="empty-state" data-testid="alumno-resultado-vacio">
          Aún no hay calificaciones liberadas.
        </div>
      ) : (
        <div className="portal-home__resultado">
          <div className={`notas-bento__anillo-wrap ${claseNivelNota(data.indicador)}`}>
            <Anillo valor={data.promedio} />
            <span className="notas-bento__promedio-n" data-testid="alumno-resultado-promedio">
              {data.promedio}
            </span>
          </div>
          <div className="portal-home__resultado-info">
            <p className="portal-home__resultado-titulo" data-testid="alumno-resultado-cuadro">
              {cuadro?.titulo ?? data.etiqueta}
            </p>
            <p className="notas-bento__nota">
              Tu promedio de {data.aprobadas + data.reprobadas} materia
              {data.aprobadas + data.reprobadas === 1 ? '' : 's'} con parciales liberados
              {data.promedio_parcial ? '. Hay parciales pendientes de habilitar.' : '.'}
            </p>
          </div>
          <Link
            to="/alumno/resultados"
            className="btn btn--primary btn--sm"
            data-testid="alumno-resultado-ver-mas"
          >
            Ver más
          </Link>
        </div>
      )}
    </section>
  )
}

function AlumnoHomePage() {
  const navigate = useNavigate()
  const { portal, responsable, alumnoId } = usePortal()
  const { data, isLoading, isError, error } = usePortalInicio()

  useEffect(() => {
    writePortalClase(null)
  }, [])

  if (!portal) {
    return (
      <div className="empty-state" role="alert">
        Esta pantalla es solo para alumnos y responsables.
      </div>
    )
  }
  if (responsable && !alumnoId) return <Navigate to="/responsable" replace />
  if (responsable && alumnoId) {
    return (
      <div className="maestro-hub" data-testid="alumno-home">
        <HijoHub alumnoId={alumnoId} />
      </div>
    )
  }

  const abrirClase = (c: PortalClase) => {
    writePortalClase({ asignacionId: c.asignacion_docente_id, cursoNombre: c.curso_nombre })
    void navigate({ to: '/tareas', search: { revisar: undefined } })
  }

  const alumno = data?.alumno

  return (
    <div className="maestro-hub" data-testid="alumno-home">
      <AvisoBanner />
      <header className="portal-home__header">
        <div>
          <h1 className="page-title" style={{ margin: 0 }} data-testid="alumno-home-title">
            Mi inicio
          </h1>
          {alumno ? (
            <p className="texto-muted" style={{ margin: '0.35rem 0 0' }}>
              {alumno.grado} · sec{alumno.seccion} · {alumno.modalidad} · {alumno.periodo}
            </p>
          ) : null}
        </div>
      </header>

      {isLoading ? (
        <div className="empty-state">Cargando…</div>
      ) : isError || !data ? (
        <div className="empty-state" data-testid="alumno-home-error">
          No se pudo cargar el inicio.
          {error ? (
            <p className="texto-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              {userMessageFromError(error)}
            </p>
          ) : null}
        </div>
      ) : !alumno ? (
        <div className="empty-state" data-testid="alumno-home-sin-matricula">
          {data.mensaje || 'Sin matrícula activa'}
        </div>
      ) : (
        <>
          <div className="portal-home__section">
            <AlumnoHorarioView
              slots={data.horario_semana}
              recreo={data.recreo}
            />
          </div>

          <ResultadoGeneral />

          <section className="portal-home__section" data-testid="alumno-clases">
            <h2 className="portal-home__section-title">Mis clases</h2>
            {data.clases.length === 0 ? (
              <div className="empty-state">No hay clases asignadas en el periodo activo.</div>
            ) : (
              <div className="maestro-hub__cards">
                {data.clases.map((c) => (
                  <button
                    key={c.asignacion_docente_id}
                    type="button"
                    className="maestro-hub__card clase-card"
                    data-testid={`alumno-clase-${c.asignacion_docente_id}`}
                    onClick={() => abrirClase(c)}
                  >
                    {c.tareas_pendientes > 0 ? (
                      <span
                        className="clase-card__badge"
                        title={`${c.tareas_hoy} para hoy · ${c.tareas_manana} para mañana`}
                        data-testid={`alumno-clase-badge-${c.asignacion_docente_id}`}
                      >
                        T{c.tareas_pendientes}
                      </span>
                    ) : null}
                    <div>
                      <h3 className="maestro-hub__card-title">{c.curso_nombre}</h3>
                      {c.tareas_pendientes > 0 ? (
                        <p
                          className="clase-card__tareas"
                          data-testid={`alumno-clase-tareas-${c.asignacion_docente_id}`}
                        >
                          {resumenTareas(c)}
                        </p>
                      ) : null}
                    </div>
                    <p className="maestro-hub__card-meta texto-muted">{c.maestro_nombre}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
