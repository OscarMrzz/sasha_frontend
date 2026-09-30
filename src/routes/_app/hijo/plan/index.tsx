import { Link, createFileRoute } from '@tanstack/react-router'
import { BookOpen, ChevronRight } from 'lucide-react'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'
import { usePortalInicio } from '#/hooks/use-portal'

export const Route = createFileRoute('/_app/hijo/plan/')({
  component: () => (
    <PadreScreen title="Plan de estudio" testId="padre-plan">
      {() => <Materias />}
    </PadreScreen>
  ),
})

function Materias() {
  const { data, isLoading, isError } = usePortalInicio()

  if (isLoading) return <div className="empty-state">Cargando materias…</div>
  if (isError || !data) return <div className="empty-state">Hay problemas de conexión. Intente de nuevo.</div>
  if (data.clases.length === 0) {
    return <div className="empty-state">No hay materias asignadas en el periodo.</div>
  }

  return (
    <section className="app-seccion">
      <h2 className="app-seccion__titulo">Elija una materia</h2>
      <ul className="app-list" data-testid="padre-plan-materias">
        {data.clases.map((c) => (
          <li key={c.asignacion_docente_id}>
            <Link
              to="/hijo/plan/$asignacionId"
              params={{ asignacionId: c.asignacion_docente_id }}
              className="app-list__item"
              data-testid={`padre-plan-materia-${c.asignacion_docente_id}`}
            >
              <span className="app-tile__icono" aria-hidden style={{ width: 44, height: 44 }}>
                <BookOpen size={22} />
              </span>
              <div className="app-list__cuerpo">
                <span className="app-list__titulo">{c.curso_nombre}</span>
                <span className="app-list__sub">{c.maestro_nombre}</span>
              </div>
              <ChevronRight size={22} className="app-tile__flecha" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
