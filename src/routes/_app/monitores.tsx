import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, Clock, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { RequirePermission } from '#/components/gates/Can'
import { MonitorAsistenciaModal } from '#/components/monitores/MonitorAsistenciaModal'
import type { MonitorAsistenciaTipo } from '#/components/monitores/MonitorAsistenciaModal'
import { MonitorTareasModal } from '#/components/monitores/MonitorTareasModal'
import { SearchInput } from '#/components/ui/SearchInput'
import { getMonitor } from '#/services/monitores'
import type { MonitorClase } from '#/services/monitores'

export const Route = createFileRoute('/_app/monitores')({
  component: () => (
    <RequirePermission permission="monitores:get">
      <MonitoresPage />
    </RequirePermission>
  ),
})

function nowParts() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return {
    fecha: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    hora: `${p(d.getHours())}:${p(d.getMinutes())}`,
  }
}

function labelCumplimiento(v: string) {
  if (v === 'finalizado') return 'Finalizado'
  if (v === 'iniciado') return 'Iniciado'
  return 'Pendiente'
}

function chipEstado(v: string) {
  if (v === 'finalizado') return 'badge badge--ok'
  if (v === 'iniciado') return 'badge badge--warn'
  return 'badge'
}

function matchClase(c: MonitorClase, q: string) {
  if (!q) return true
  const hay = `${c.grado_nombre} ${c.seccion_nombre} ${c.curso_nombre} ${c.maestro_nombre} ${c.modalidad_nombre}`
  return hay.toLowerCase().includes(q.toLowerCase())
}

function IconBtn({
  icon,
  count,
  label,
  onClick,
  testId,
}: {
  icon: ReactNode
  count: number | string
  label: string
  onClick: () => void
  testId: string
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={`${label} (${count})`}
      data-testid={testId}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.45rem 0.65rem',
        borderRadius: '8px',
        background: 'var(--sasha-bg-muted)',
        border: '1px solid var(--sasha-border-suave)',
        color: 'var(--sasha-texto-primary)',
        cursor: 'pointer',
      }}
    >
      {icon}
      <span style={{ fontWeight: 700 }}>{count}</span>
    </button>
  )
}

function MonitorCard({ clase }: { clase: MonitorClase }) {
  const [tareasOpen, setTareasOpen] = useState(false)
  const [asistTipo, setAsistTipo] = useState<MonitorAsistenciaTipo | null>(null)
  const { plan, tareas, asistencia } = clase

  return (
    <article
      data-testid={`monitor-card-${clase.asignacion_docente_id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        padding: '1rem',
        borderRadius: 'var(--sasha-radius, 12px)',
        background: 'var(--sasha-bg-raised)',
        border: '1px solid var(--sasha-border-suave)',
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
          {clase.grado_nombre} · sec{clase.seccion_nombre}
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          {clase.curso_nombre} · {clase.maestro_nombre || '—'}
        </p>
        <span className="texto-muted" style={{ fontSize: '0.78rem' }}>
          {clase.hora_inicio}–{clase.hora_fin} · {clase.modalidad_nombre} · {clase.alumnos_count}{' '}
          alumnos
        </span>
      </header>

      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Plan de la semana · {plan.total} {plan.total === 1 ? 'cosa' : 'cosas'}
          </span>
          <span style={{ fontWeight: 700 }} data-testid={`monitor-plan-pct-${clase.asignacion_docente_id}`}>
            {plan.porcentaje}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={plan.porcentaje}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            marginTop: '0.4rem',
            height: 8,
            borderRadius: 999,
            background: 'var(--sasha-bg-muted)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${plan.porcentaje}%`,
              height: '100%',
              background: 'var(--sasha-accent)',
            }}
          />
        </div>
        {plan.items.length === 0 ? (
          <p className="texto-muted" style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>
            Nada en el plan para esta semana.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', padding: 0, display: 'grid', gap: '0.3rem' }}>
            {plan.items.map((it) => (
              <li
                key={it.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}
              >
                <span style={{ fontSize: '0.82rem' }}>{it.titulo}</span>
                <span className={chipEstado(it.estado_cumplimiento)} style={{ whiteSpace: 'nowrap' }}>
                  {labelCumplimiento(it.estado_cumplimiento)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto' }}>
        <IconBtn
          icon={<span style={{ fontWeight: 800, lineHeight: 1 }}>T</span>}
          count={tareas.total}
          label="Tareas de hoy"
          testId={`monitor-tareas-${clase.asignacion_docente_id}`}
          onClick={() => setTareasOpen(true)}
        />
        <IconBtn
          icon={<CheckSquare size={16} />}
          count={`${asistencia.marcas}/${asistencia.alumnos}`}
          label={asistencia.pasada ? 'Asistencia (ya se pasó)' : 'Asistencia (pendiente)'}
          testId={`monitor-asistencia-${clase.asignacion_docente_id}`}
          onClick={() => setAsistTipo('resumen')}
        />
        <IconBtn
          icon={<UserX size={16} />}
          count={asistencia.faltantes}
          label="Alumnos faltantes"
          testId={`monitor-faltantes-${clase.asignacion_docente_id}`}
          onClick={() => setAsistTipo('faltantes')}
        />
        <IconBtn
          icon={<Clock size={16} />}
          count={asistencia.tarde}
          label="Alumnos que llegaron tarde"
          testId={`monitor-tarde-${clase.asignacion_docente_id}`}
          onClick={() => setAsistTipo('tarde')}
        />
      </section>

      {tareasOpen ? <MonitorTareasModal clase={clase} onClose={() => setTareasOpen(false)} /> : null}
      {asistTipo ? (
        <MonitorAsistenciaModal clase={clase} tipo={asistTipo} onClose={() => setAsistTipo(null)} />
      ) : null}
    </article>
  )
}

function MonitoresPage() {
  const clock = useMemo(() => nowParts(), [])
  const [q, setQ] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['monitor', clock.fecha],
    queryFn: () => getMonitor({ fecha: clock.fecha, hora: clock.hora }),
    refetchInterval: 60_000,
  })

  const clases = useMemo(
    () => (data?.clases ?? []).filter((c) => matchClase(c, q.trim())),
    [data, q],
  )

  const bloqueLabel = (() => {
    if (!data) return ''
    if (data.estado === 'en_clase' && data.bloque) {
      return `${data.bloque.hora_inicio} – ${data.bloque.hora_fin}`
    }
    if (data.estado === 'recreo' && data.bloque) {
      return `Recreo ${data.bloque.hora_inicio} – ${data.bloque.hora_fin}`
    }
    return `Sin clases ahora`
  })()

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          Monitores
        </h1>
        {bloqueLabel ? (
          <span className="badge" data-testid="monitor-bloque">
            {bloqueLabel}
          </span>
        ) : null}
      </div>

      <div className="panel-toolbar">
        <div className="panel-toolbar__search">
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="monitor-buscar"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state">Cargando monitores…</div>
      ) : isError || !data ? (
        <div className="empty-state" role="alert">
          No se pudo cargar el monitor.
        </div>
      ) : data.estado === 'recreo' ? (
        <div className="empty-state" data-testid="monitor-recreo">
          Es recreo{data.bloque ? ` (${data.bloque.hora_inicio} – ${data.bloque.hora_fin})` : ''}. No
          hay clases en este momento.
        </div>
      ) : data.estado === 'sin_clase' ? (
        <div className="empty-state" data-testid="monitor-sin-clase">
          No hay clases en este momento.
          {data.proxima ? (
            <span> La siguiente clase es a las {data.proxima.hora_inicio}.</span>
          ) : (
            <span> Ya no hay más clases hoy.</span>
          )}
        </div>
      ) : clases.length === 0 ? (
        <div className="empty-state" data-testid="monitor-vacio">
          {q.trim() ? 'Sin coincidencias.' : 'No hay clases en este bloque.'}
        </div>
      ) : (
        <div
          data-testid="monitor-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          {clases.map((c) => (
            <MonitorCard key={c.asignacion_docente_id} clase={c} />
          ))}
        </div>
      )}
    </div>
  )
}
