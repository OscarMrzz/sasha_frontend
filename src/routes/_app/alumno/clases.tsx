import { createFileRoute } from '@tanstack/react-router'
import { AlumnoScreen } from '#/components/portal/AlumnoScreen'
import { usePortalInicio } from '#/hooks/use-portal'

export const Route = createFileRoute('/_app/alumno/clases')({
  component: AlumnoClasesPage,
})

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
        <ul className="app-list" aria-label="Clases" data-testid="alumno-clases-lista">
          {clases.map((c) => (
            <li
              key={c.asignacion_docente_id}
              className="app-list__item"
              data-testid={`alumno-clase-${c.asignacion_docente_id}`}
            >
              <span className="app-list__titulo">{c.curso_nombre}</span>
            </li>
          ))}
        </ul>
      )}
    </AlumnoScreen>
  )
}
