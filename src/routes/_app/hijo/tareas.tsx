import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'
import { fechaRelativa, hoyISO } from '#/lib/fechas-padre'
import { listTareasHijo } from '#/services/portal'
import type { PortalTarea } from '#/services/portal'

export const Route = createFileRoute('/_app/hijo/tareas')({
  component: () => (
    <PadreScreen title="Tareas" testId="padre-tareas">
      {(alumnoId) => <TareasHijo alumnoId={alumnoId} />}
    </PadreScreen>
  ),
})

function TareaItem({ t, hoy }: { t: PortalTarea; hoy: string }) {
  const vencida = t.estado === 'pendiente' && t.fecha_entrega < hoy
  return (
    <li className="app-list__item" data-testid={`padre-tarea-${t.id}`}>
      <div className="app-list__cuerpo">
        <span className="app-list__titulo">{t.titulo}</span>
        <span className="app-list__sub">
          {t.curso_nombre} · Entrega: {fechaRelativa(t.fecha_entrega)}
        </span>
      </div>
      <div className="app-list__lado">
        {t.estado === 'revisada' ? (
          <span className="estado-pill estado-pill--ok">Revisada</span>
        ) : vencida ? (
          <span className="estado-pill estado-pill--mal">Atrasada</span>
        ) : (
          <span className="estado-pill estado-pill--espera">Pendiente</span>
        )}
      </div>
    </li>
  )
}

function TareasHijo({ alumnoId }: { alumnoId: string }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['portal-tareas-hijo', alumnoId],
    queryFn: () => listTareasHijo(alumnoId),
  })
  const hoy = hoyISO()
  const { pendientes, revisadas } = useMemo(() => {
    const p = data
      .filter((t) => t.estado === 'pendiente')
      .sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega))
    const r = data
      .filter((t) => t.estado === 'revisada')
      .sort((a, b) => b.fecha_entrega.localeCompare(a.fecha_entrega))
    return { pendientes: p, revisadas: r }
  }, [data])

  if (isLoading) return <div className="empty-state">Cargando tareas…</div>
  if (isError) return <div className="empty-state">Hay problemas de conexión. Intente de nuevo.</div>
  if (data.length === 0) {
    return (
      <div className="empty-state" data-testid="padre-tareas-vacio">
        Todavía no hay tareas.
      </div>
    )
  }

  return (
    <>
      <section className="app-seccion" data-testid="padre-tareas-pendientes">
        <h2 className="app-seccion__titulo">Pendientes ({pendientes.length})</h2>
        {pendientes.length === 0 ? (
          <div className="empty-state">No tiene tareas pendientes.</div>
        ) : (
          <ul className="app-list">
            {pendientes.map((t) => (
              <TareaItem key={t.id} t={t} hoy={hoy} />
            ))}
          </ul>
        )}
      </section>
      <section className="app-seccion" data-testid="padre-tareas-revisadas">
        <h2 className="app-seccion__titulo">Revisadas ({revisadas.length})</h2>
        {revisadas.length === 0 ? (
          <div className="empty-state">Aún no hay tareas revisadas.</div>
        ) : (
          <ul className="app-list">
            {revisadas.map((t) => (
              <TareaItem key={t.id} t={t} hoy={hoy} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
