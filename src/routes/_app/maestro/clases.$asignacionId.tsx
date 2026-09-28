import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Clock, FilePlus, MoreVertical, StickyNote, Users, BookOpen } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AsistenciaGridModal } from '#/components/asistencia/AsistenciaGridModal'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { NotasDrawer } from '#/components/maestro/NotasDrawer'
import { TareaRevisionModal } from '#/components/tareas/TareaRevisionModal'
import { writeLastAsignacionId } from '#/lib/last-asignacion'
import { userMessageFromError } from '#/lib/api'
import { getMaestroDashboard } from '#/services/maestro-dashboard'
import { listMateriasAsistencia, type AsistenciaMateria } from '#/services/asistencia'
import { createNota, listNotas } from '#/services/notas'
import { updatePlanItem } from '#/services/planestudio'

export const Route = createFileRoute('/_app/maestro/clases/$asignacionId')({
  component: () => (
    <RequirePermission permission="horarios:get">
      <MaestroDashboardPage />
    </RequirePermission>
  ),
})

const CUMPLIMIENTO = [
  { estado: 'pendiente', avance: 0, label: 'Pendiente' },
  { estado: 'iniciado', avance: 50, label: 'Iniciado' },
  { estado: 'finalizado', avance: 100, label: 'Finalizado' },
] as const

function nowParts() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { fecha: `${y}-${m}-${day}`, hora: `${hh}:${mm}` }
}

function labelCumplimiento(v: string) {
  if (v === 'iniciado') return 'Iniciado'
  if (v === 'finalizado') return 'Finalizado'
  return 'Pendiente'
}

function avanceFrac(estado: string) {
  if (estado === 'finalizado') return 1
  if (estado === 'iniciado') return 0.5
  return 0
}

/** Progreso semanal: cada ítem aporta 100/N; iniciado = mitad, finalizado = todo. */
function progresoPlanSemana(items: Array<{ estado_cumplimiento: string }>) {
  if (!items.length) return 0
  const unit = 100 / items.length
  const sum = items.reduce((acc, it) => acc + unit * avanceFrac(it.estado_cumplimiento), 0)
  return Math.round(sum)
}

function formatFechaNota(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

function formatFechaCorta(iso: string) {
  try {
    return new Date(iso + (iso.length <= 10 ? 'T12:00:00' : '')).toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

function ProgressRing({
  valor,
  total,
  label,
  size = 'sm',
  testId,
}: {
  valor: number
  total: number
  label: string
  size?: 'sm' | 'lg'
  testId?: string
}) {
  const r = 18
  const c = 2 * Math.PI * r
  const frac = total > 0 ? Math.min(valor / total, 1) : 0
  const completo = total > 0 && valor >= total
  return (
    <div
      className={`mdash__ring mdash__ring--${size}${completo ? ' mdash__ring--done' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={total}
      title={`${valor} de ${total} ${label.toLowerCase()}`}
      data-testid={testId}
    >
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle className="mdash__ring-track" cx="22" cy="22" r={r} />
        <circle
          className="mdash__ring-fill"
          cx="22"
          cy="22"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          opacity={frac > 0 ? 1 : 0}
        />
      </svg>
      <span className="mdash__ring-label">
        {valor}/{total}
      </span>
    </div>
  )
}

function MaestroDashboardPage() {
  const { asignacionId } = Route.useParams()
  const { can } = useCan()
  const qc = useQueryClient()
  const [pasar, setPasar] = useState(false)
  const [notasOpen, setNotasOpen] = useState(false)
  const [notaFocusId, setNotaFocusId] = useState<string | null>(null)
  const [revisarId, setRevisarId] = useState<string | null>(null)
  const [tareaCtx, setTareaCtx] = useState<{ x: number; y: number; id: string } | null>(null)
  const [planCtx, setPlanCtx] = useState<{ x: number; y: number; id: string } | null>(null)
  const [planOverride, setPlanOverride] = useState<Record<string, string>>({})
  const clock = useMemo(() => nowParts(), [])

  useEffect(() => {
    writeLastAsignacionId(asignacionId)
  }, [asignacionId])

  useEffect(() => {
    setPlanOverride({})
  }, [asignacionId])

  const closeTareaCtx = useCallback(() => setTareaCtx(null), [])
  const closePlanCtx = useCallback(() => setPlanCtx(null), [])
  const closeAllCtx = useCallback(() => {
    closeTareaCtx()
    closePlanCtx()
  }, [closeTareaCtx, closePlanCtx])

  useEffect(() => {
    if (!tareaCtx && !planCtx) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllCtx()
    }
    window.addEventListener('click', closeAllCtx)
    window.addEventListener('scroll', closeAllCtx, true)
    window.addEventListener('wheel', closeAllCtx, { capture: true, passive: true })
    window.addEventListener('touchmove', closeAllCtx, { capture: true, passive: true })
    window.addEventListener('resize', closeAllCtx)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', closeAllCtx)
      window.removeEventListener('scroll', closeAllCtx, true)
      window.removeEventListener('wheel', closeAllCtx, true)
      window.removeEventListener('touchmove', closeAllCtx, true)
      window.removeEventListener('resize', closeAllCtx)
      window.removeEventListener('keydown', onKey)
    }
  }, [tareaCtx, planCtx, closeAllCtx])

  const { data: materias = [] } = useQuery({
    queryKey: ['asistencia-materias'],
    queryFn: listMateriasAsistencia,
  })
  const materiaRow = materias.find((m) => m.asignacion_docente_id === asignacionId) as
    | AsistenciaMateria
    | undefined

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['maestro-dashboard', asignacionId, clock.fecha],
    queryFn: () =>
      getMaestroDashboard({
        asignacionDocenteId: asignacionId,
        fecha: clock.fecha,
        hora: clock.hora,
      }),
    refetchInterval: 60_000,
  })

  const { data: notas = [] } = useQuery({
    queryKey: ['notas', asignacionId],
    queryFn: () => listNotas(asignacionId),
    enabled: can('notas:get'),
  })

  const createNotaMut = useMutation({
    mutationFn: () =>
      createNota({
        asignacion_docente_id: asignacionId,
        contenido: '',
        titulo: '',
      }),
    onSuccess: (n) => {
      void qc.invalidateQueries({ queryKey: ['notas', asignacionId] })
      setNotaFocusId(n.id)
      setNotasOpen(true)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const slotLabel = (() => {
    if (!data) return ''
    switch (data.slot.etiqueta) {
      case 'en_clase':
        return `En clase · quedan ${data.slot.minutos_restantes ?? 0} min`
      case 'proxima':
        return `Próxima en ${data.slot.minutos_para_inicio ?? 0} min`
      case 'ya_paso':
        return 'El bloque de hoy ya pasó'
      default:
        return 'Sin bloque hoy en el horario'
    }
  })()

  const openNota = (id?: string) => {
    setNotaFocusId(id ?? null)
    setNotasOpen(true)
  }

  const planItems = useMemo(() => {
    if (!data) return []
    return data.plan_hoy.map((it) => ({
      ...it,
      estado_cumplimiento: planOverride[it.id] ?? it.estado_cumplimiento,
    }))
  }, [data, planOverride])

  const planPct = progresoPlanSemana(planItems)

  const setCumplimientoMut = useMutation({
    mutationFn: ({
      id,
      estado,
      avance,
    }: {
      id: string
      estado: string
      avance: number
    }) => updatePlanItem(id, { estado_cumplimiento: estado, porcentaje_avance: avance }),
    onSuccess: (updated) => {
      setPlanOverride((prev) => ({ ...prev, [updated.id]: updated.estado_cumplimiento }))
      void qc.invalidateQueries({ queryKey: ['maestro-dashboard', asignacionId] })
      toast.success(`Marcado como ${labelCumplimiento(updated.estado_cumplimiento).toLowerCase()}`)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  return (
    <div className="mdash" data-testid="maestro-clase">
      {isLoading ? (
        <div className="empty-state">Cargando dashboard…</div>
      ) : isError || !data ? (
        <div className="empty-state" data-testid="maestro-clase-missing">
          No se pudo cargar el dashboard de esta clase.
          {error ? (
            <p className="texto-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              {userMessageFromError(error)}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mdash__bento">
            <section
              className={`mdash__tile mdash__tile--hero${data.slot.en_clase ? ' mdash__tile--live' : ''}`}
              data-testid="mdash-ahora"
            >
              <div className="mdash__hero-kicker">
                <Clock size={16} /> Ahora
              </div>
              <h1 className="mdash__hero-title">{data.materia.curso_nombre}</h1>
              <p className="mdash__hero-meta">
                {data.materia.grado_nombre} · sec{data.materia.seccion_nombre} ·{' '}
                {data.materia.modalidad_nombre}
              </p>
              <p className="mdash__hero-slot">
                {data.slot.hora_inicio && data.slot.hora_fin
                  ? `${data.slot.hora_inicio}–${data.slot.hora_fin}`
                  : '—'}
                {' · '}
                {slotLabel}
              </p>
              <p className="texto-muted" style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>
                {data.materia.periodo_nombre}
              </p>
            </section>

            <section className="mdash__tile mdash__tile--notas" data-testid="mdash-notas">
              <div className="mdash__notas-head">
                <h2 className="mdash__tile-title" style={{ margin: 0 }}>
                  <StickyNote size={15} /> Notas
                </h2>
                {can('notas:post') ? (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    data-testid="mdash-nueva-nota"
                    disabled={createNotaMut.isPending}
                    onClick={() => createNotaMut.mutate()}
                  >
                    <FilePlus size={14} /> Nueva nota
                  </button>
                ) : null}
              </div>
              {!can('notas:get') ? (
                <p className="texto-muted" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
                  Sin permiso de notas.
                </p>
              ) : notas.length === 0 ? (
                <p className="texto-muted" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
                  Sin notas aún.
                </p>
              ) : (
                <div className="mdash__notas-grid" data-testid="mdash-notas-grid">
                  {notas.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="mdash__nota-card"
                      data-testid={`mdash-nota-${n.id}`}
                      onClick={() => openNota(n.id)}
                    >
                      <span className="mdash__nota-card-date">{formatFechaNota(n.created_at)}</span>
                      <span className="mdash__nota-card-title">
                        {(n.titulo || n.contenido || 'Sin título').slice(0, 60)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="mdash__tile mdash__tile--alumnos" data-testid="mdash-alumnos">
              <div className="mdash__alumnos-head">
                <h2 className="mdash__tile-title" style={{ margin: 0 }}>
                  <Users size={15} /> Alumnos
                </h2>
                {(() => {
                  const marcas = data.asistencia_hoy.marcas
                  const total = data.asistencia_hoy.alumnos || data.alumnos_count
                  const pill =
                    marcas <= 0
                      ? { label: 'Pendiente', mod: 'mdash__chip--warn' }
                      : marcas < total
                        ? { label: 'Incompleta', mod: 'mdash__chip--warn' }
                        : { label: 'Lista', mod: 'mdash__chip--ok' }
                  return (
                    <span className={`mdash__chip ${pill.mod}`} data-testid="mdash-asistencia-pill">
                      {pill.label}
                    </span>
                  )
                })()}
              </div>
              <p className="texto-muted" style={{ margin: '0.55rem 0 0', fontSize: '0.8rem' }}>
                {data.materia.grado_nombre} · sec{data.materia.seccion_nombre}
              </p>
              <div className="mdash__asistencia-ratio">
                <ProgressRing
                  valor={data.asistencia_hoy.marcas}
                  total={data.asistencia_hoy.alumnos || data.alumnos_count}
                  label="Alumnos con asistencia"
                  size="lg"
                  testId="mdash-asistencia-ratio"
                />
              </div>
              {can('asistencia:post') ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  data-testid="mdash-pasar-lista"
                  onClick={() => setPasar(true)}
                >
                  <CheckSquare size={14} /> Pasar lista
                </button>
              ) : null}
            </section>

            <section className="mdash__tile mdash__tile--tareas" data-testid="mdash-tareas">
              <h2 className="mdash__tile-title">Tareas a revisar hoy</h2>
              {data.tareas_hoy.length === 0 ? (
                <p className="texto-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  Sin entregas con fecha de hoy.
                </p>
              ) : (
                <ul className="mdash__list">
                  {data.tareas_hoy.map((t) => (
                    <li key={t.id} className="mdash__list-item mdash__list-item--row">
                      <ProgressRing
                        valor={t.revisados}
                        total={t.total}
                        label="Alumnos revisados"
                        testId={`mdash-tarea-ring-${t.id}`}
                      />
                      <span className="mdash__list-main">{t.titulo}</span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        aria-label="Menú tarea"
                        data-testid={`mdash-tarea-menu-${t.id}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (tareaCtx?.id === t.id) {
                            closeTareaCtx()
                            return
                          }
                          closePlanCtx()
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setTareaCtx({ x: r.right - 8, y: r.bottom + 4, id: t.id })
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mdash__tile mdash__tile--plan" data-testid="mdash-plan">
              <div className="mdash__plan-head">
                <h2 className="mdash__tile-title" style={{ margin: 0 }}>
                  <BookOpen size={15} /> Plan de esta semana
                </h2>
                {planItems.length > 0 ? (
                  <span className="mdash__plan-pct" data-testid="mdash-plan-pct">
                    {planPct}%
                  </span>
                ) : null}
              </div>
              {planItems.length > 0 ? (
                <div
                  className="mdash__plan-thermo"
                  role="progressbar"
                  aria-valuenow={planPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  data-testid="mdash-plan-progress"
                >
                  <div className="mdash__plan-thermo-fill" style={{ width: `${planPct}%` }} />
                </div>
              ) : null}
              {planItems.length === 0 ? (
                <p className="texto-muted" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
                  Nada en el plan para esta semana.
                </p>
              ) : (
                <ul className="mdash__plan-list">
                  {planItems.map((it) => (
                    <li key={it.id} className="mdash__plan-card">
                      <div className="mdash__plan-card-top">
                        <h3 className="mdash__plan-card-title">{it.titulo}</h3>
                        <div className="mdash__plan-card-actions">
                          <span className="mdash__chip">{labelCumplimiento(it.estado_cumplimiento)}</span>
                          {can('planestudio:put') ? (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              aria-label="Cambiar estado"
                              data-testid={`mdash-plan-menu-${it.id}`}
                              disabled={setCumplimientoMut.isPending}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (planCtx?.id === it.id) {
                                  closePlanCtx()
                                  return
                                }
                                closeTareaCtx()
                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                setPlanCtx({ x: r.left, y: r.bottom + 4, id: it.id })
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {it.descripcion ? (
                        <p className="mdash__plan-card-body">{it.descripcion}</p>
                      ) : null}
                      <div className="mdash__plan-card-meta">
                        <span>
                          {formatFechaCorta(it.fecha_inicio)} – {formatFechaCorta(it.fecha_fin)}
                        </span>
                        <span>{it.puntos} pts</span>
                        {it.materiales ? <span>{it.materiales}</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {planCtx ? (
        <div
          className="ctx-menu ctx-menu--left"
          style={{ left: planCtx.x, top: planCtx.y }}
          role="menu"
          data-testid="mdash-plan-ctx"
          onClick={(e) => e.stopPropagation()}
        >
          {CUMPLIMIENTO.map((opt) => (
            <button
              key={opt.estado}
              type="button"
              className="ctx-menu__item"
              role="menuitem"
              data-testid={`mdash-plan-estado-${opt.estado}`}
              disabled={setCumplimientoMut.isPending}
              onClick={() => {
                const id = planCtx.id
                closePlanCtx()
                setCumplimientoMut.mutate({
                  id,
                  estado: opt.estado,
                  avance: opt.avance,
                })
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {tareaCtx ? (
        <div
          className="ctx-menu ctx-menu--left"
          style={{ left: tareaCtx.x, top: tareaCtx.y }}
          role="menu"
          data-testid="mdash-tarea-ctx"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="ctx-menu__item"
            role="menuitem"
            data-testid="mdash-tarea-revisar"
            onClick={() => {
              const id = tareaCtx.id
              closeTareaCtx()
              setRevisarId(id)
            }}
          >
            Revisar
          </button>
        </div>
      ) : null}

      {revisarId ? (
        <TareaRevisionModal tareaId={revisarId} onClose={() => setRevisarId(null)} />
      ) : null}

      {pasar && materiaRow ? (
        <AsistenciaGridModal materia={materiaRow} mode="pasar" onClose={() => setPasar(false)} />
      ) : null}

      <NotasDrawer
        open={notasOpen}
        onClose={() => {
          setNotasOpen(false)
          setNotaFocusId(null)
        }}
        asignacionDocenteId={asignacionId}
        focusNotaId={notaFocusId}
      />
    </div>
  )
}
