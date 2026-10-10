import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen, ChevronRight } from 'lucide-react'
import { AlumnoScreen } from '#/components/portal/AlumnoScreen'
import { usePortalInicio } from '#/hooks/use-portal'
import { writePortalClase } from '#/lib/portal-context'
import type { PortalClase } from '#/services/portal'

export const Route = createFileRoute('/_app/alumno/clases')({
  component: AlumnoClasesPage,
})

function resumenTareas(c: PortalClase) {
  const partes: string[] = []
  if (c.tareas_hoy > 0) partes.push(`Tarea hoy: ${c.tareas_hoy}`)
  if (c.tareas_manana > 0)
    partes.push(`${partes.length ? 'Mañana' : 'Tarea mañana'}: ${c.tareas_manana}`)
  return partes.join(' · ')
}

/** Mis clases: una tarjeta por materia; al tocarla se entra a la clase (modo clase). */
function AlumnoClasesPage() {
  const { data, isLoading, isError } = usePortalInicio()
  const clases = data?.clases ?? []

  return (
    <AlumnoScreen title="Mis clases" testId="alumno-clases">
      {isLoading ? (
        <div className="empty-state">Cargando…</div>
      ) : isError || !data ? (
        <div className="empty-state">No se pudieron cargar las clases.</div>
      ) : clases.length === 0 ? (
        <div className="empty-state">No hay clases asignadas en el periodo activo.</div>
      ) : (
        <nav className="app-tiles" aria-label="Clases" data-testid="alumno-clases-lista">
          {clases.map((c) => (
            <Link
              key={c.asignacion_docente_id}
              to="/tareas"
              search={{ revisar: undefined }}
              className="app-tile"
              data-testid={`alumno-clase-${c.asignacion_docente_id}`}
              onClick={() =>
                writePortalClase({
                  asignacionId: c.asignacion_docente_id,
                  cursoNombre: c.curso_nombre,
                })
              }
            >
              <span className="app-tile__icono" aria-hidden>
                <BookOpen size={28} />
              </span>
              <span className="app-tile__texto">
                <span className="app-tile__label">{c.curso_nombre}</span>
                <span
                  className="app-tile__detalle"
                  data-testid={
                    c.tareas_pendientes > 0
                      ? `alumno-clase-tareas-${c.asignacion_docente_id}`
                      : undefined
                  }
                >
                  {c.tareas_pendientes > 0 ? resumenTareas(c) : c.maestro_nombre}
                </span>
              </span>
              {c.tareas_pendientes > 0 ? (
                <span
                  className="app-tile__badge"
                  data-testid={`alumno-clase-badge-${c.asignacion_docente_id}`}
                  title={`${c.tareas_hoy} para hoy · ${c.tareas_manana} para mañana`}
                >
                  T{c.tareas_pendientes}
                </span>
              ) : null}
              <ChevronRight size={22} className="app-tile__flecha" aria-hidden />
            </Link>
          ))}
        </nav>
      )}
    </AlumnoScreen>
  )
}
