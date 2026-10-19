import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { TareaPortalVerModal } from '#/components/portal/TareaPortalVerModal'
import { fechaRelativa, hoyISO } from '#/lib/fechas-padre'
import { listTareasHijo } from '#/services/portal'
import type { PortalTarea } from '#/services/portal'

function TareaItem({
  t,
  hoy,
  prefix,
  onVer,
}: {
  t: PortalTarea
  hoy: string
  prefix: string
  onVer: (t: PortalTarea) => void
}) {
  const vencida = t.estado === 'pendiente' && t.fecha_entrega < hoy
  return (
    <li>
      <button
        type="button"
        className="app-list__item"
        data-testid={`${prefix}-tarea-${t.id}`}
        aria-label={`Ver detalle de ${t.titulo}`}
        onClick={() => onVer(t)}
      >
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
      </button>
    </li>
  )
}

/**
 * Lista de todas las tareas (pendientes y revisadas) del alumno o del hijo elegido.
 * `alumnoId` null = el propio alumno (sesión). `prefix` distingue los `data-testid`.
 * Tocar una tarea abre el detalle (sin puntos).
 */
export function TareasLista({ alumnoId, prefix }: { alumnoId: string | null; prefix: string }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['portal-tareas-lista', alumnoId ?? 'self'],
    queryFn: () => listTareasHijo(alumnoId),
  })
  const [verTarea, setVerTarea] = useState<PortalTarea | null>(null)
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
      <div className="empty-state" data-testid={`${prefix}-tareas-vacio`}>
        Todavía no hay tareas.
      </div>
    )
  }

  return (
    <>
      <section className="app-seccion" data-testid={`${prefix}-tareas-pendientes`}>
        <h2 className="app-seccion__titulo">Pendientes ({pendientes.length})</h2>
        {pendientes.length === 0 ? (
          <div className="empty-state">No tiene tareas pendientes.</div>
        ) : (
          <ul className="app-list">
            {pendientes.map((t) => (
              <TareaItem key={t.id} t={t} hoy={hoy} prefix={prefix} onVer={setVerTarea} />
            ))}
          </ul>
        )}
      </section>
      <section className="app-seccion" data-testid={`${prefix}-tareas-revisadas`}>
        <h2 className="app-seccion__titulo">Revisadas ({revisadas.length})</h2>
        {revisadas.length === 0 ? (
          <div className="empty-state">Aún no hay tareas revisadas.</div>
        ) : (
          <ul className="app-list">
            {revisadas.map((t) => (
              <TareaItem key={t.id} t={t} hoy={hoy} prefix={prefix} onVer={setVerTarea} />
            ))}
          </ul>
        )}
      </section>

      <TareaPortalVerModal
        tarea={verTarea}
        alumnoId={alumnoId}
        onClose={() => setVerTarea(null)}
      />
    </>
  )
}
