import { useQuery } from '@tanstack/react-query'
import { Clock, Lock } from 'lucide-react'
import type { PortalCalificaciones, PortalParcialNota } from '#/services/portal'
import { getCalificacionesClase } from '#/services/portal'
import { Anillo } from '#/components/portal/notas-ui'

function TilePromedio({ data }: { data: PortalCalificaciones }) {
  return (
    <section className="mdash__tile notas-bento__promedio" data-testid="portal-calif-promedio">
      <h2 className="mdash__tile-title">Promedio</h2>
      {data.promedio == null ? (
        <p className="notas-bento__vacio">Aún no hay notas visibles.</p>
      ) : (
        <div className="notas-bento__promedio-body">
          <div className="notas-bento__anillo-wrap">
            <Anillo valor={data.promedio} />
            <span className="notas-bento__promedio-n">{data.promedio}</span>
          </div>
          <div>
            <p className="notas-bento__promedio-total">
              Total acumulado: <strong>{data.total ?? '—'}</strong> pts
            </p>
            {data.promedio_parcial ? (
              <p className="notas-bento__nota" data-testid="portal-calif-promedio-parcial">
                Promedio de los parciales visibles. Hay parciales pendientes de habilitar.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}

function TileParcial({ p }: { p: PortalParcialNota }) {
  return (
    <article
      className={`mdash__tile notas-bento__parcial notas-bento__parcial--${p.estado}`}
      data-testid={`portal-calif-parcial-${p.numero}`}
      data-estado={p.estado}
    >
      <h3 className="mdash__tile-title">{p.etiqueta}</h3>
      {p.estado === 'visible' ? (
        <p className="notas-bento__puntos">
          {p.puntos ?? '—'}
          {p.puntos_max > 0 ? <span className="notas-bento__max"> / {p.puntos_max}</span> : null}
        </p>
      ) : p.estado === 'bloqueado_pago' ? (
        <div className="notas-bento__bloqueo">
          <Lock size={22} aria-hidden />
          <p>{p.mensaje}</p>
        </div>
      ) : (
        <div className="notas-bento__bloqueo notas-bento__bloqueo--espera">
          <Clock size={20} aria-hidden />
          <p>Aún no liberado</p>
        </div>
      )}
    </article>
  )
}

export function PortalCalificacionesView({
  asignacionId,
  cursoNombre,
  alumnoId,
}: {
  asignacionId: string
  cursoNombre: string
  alumnoId: string | null
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-calificaciones', asignacionId, alumnoId ?? 'self'],
    queryFn: () => getCalificacionesClase(asignacionId, alumnoId),
  })

  return (
    <div data-testid="portal-calificaciones" className="mdash">
      <h1 className="page-title">Calificaciones · {cursoNombre}</h1>
      {isLoading ? (
        <div className="empty-state">Cargando calificaciones…</div>
      ) : isError || !data ? (
        <div className="empty-state" data-testid="portal-calif-error">
          Hay problemas de conexión.
        </div>
      ) : !data.liberado ? (
        <div className="empty-state" data-testid="portal-calif-bloqueado">
          {data.mensaje || 'Calificaciones aún no liberadas'}
        </div>
      ) : (
        <div className="mdash__bento notas-bento">
          <TilePromedio data={data} />
          {data.parciales.map((p) => (
            <TileParcial key={p.parcial_id} p={p} />
          ))}
        </div>
      )}
    </div>
  )
}
