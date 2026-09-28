import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Combobox } from '#/components/ui/Combobox'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { SearchInput } from '#/components/ui/SearchInput'
import { userMessageFromError } from '#/lib/api'
import { DIA_SHORT } from '#/lib/horarioGrid'
import {
  getHorarioMio,
  getHorarioMioDetalle,
  type HorarioMioDetalle,
  type HorarioSlotDetail,
} from '#/services/horarios'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function hm(t: string | undefined): string {
  return (t ?? '').slice(0, 5)
}

/** Fecha concreta (YYYY-MM-DD) de un día de la semana Lun=1…Dom=7. */
function fechaDeDia(semanaInicio: string, diaSemana: number): string {
  const d = new Date(`${semanaInicio}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + (diaSemana - 1))
  return d.toISOString().slice(0, 10)
}

function cellLabel(s: HorarioSlotDetail) {
  return `${s.curso_nombre} · ${s.grado_nombre} sec${s.seccion_nombre}`
}

/** Duración en horas enteras (siempre redondea hacia arriba). */
function slotHoursCeil(s: HorarioSlotDetail): number {
  const [sh, sm] = hm(s.hora_inicio).split(':').map(Number)
  const [eh, em] = hm(s.hora_fin).split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0
  const mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) return 0
  return Math.ceil(mins / 60)
}

function labelCumplimiento(v: string) {
  if (v === 'iniciado') return 'Iniciado'
  if (v === 'finalizado') return 'Finalizado'
  return 'Pendiente'
}

function labelTipo(v: string) {
  const map: Record<string, string> = {
    teorico: 'Teórico',
    practico: 'Práctico',
    social: 'Social',
    prueba: 'Prueba',
    examen: 'Examen',
  }
  return map[v] ?? v
}

export function MaestroHorarioView({
  asignacionId,
  title = 'Mi horario',
}: {
  /** Si se indica, solo muestra bloques de esa asignación. */
  asignacionId?: string
  title?: string
} = {}) {
  const [fechaRef, setFechaRef] = useState(todayISO)
  const [search, setSearch] = useState('')
  const [filterSeccion, setFilterSeccion] = useState('')
  const [ctx, setCtx] = useState<{
    x: number
    y: number
    slot: HorarioSlotDetail
    fecha: string
  } | null>(null)
  const [detalle, setDetalle] = useState<HorarioMioDetalle | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['horario-mio', fechaRef],
    queryFn: () => getHorarioMio(fechaRef),
  })

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const slots = useMemo(() => {
    const all = data?.slots ?? []
    if (!asignacionId) return all
    return all.filter((s) => s.asignacion_docente_id === asignacionId)
  }, [data?.slots, asignacionId])
  const semanaInicio = data?.semana_inicio ?? fechaRef
  const lockedToAsignacion = Boolean(asignacionId)

  const seccionOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of slots) {
      m.set(s.seccion_id, `${s.grado_nombre} · sec${s.seccion_nombre}`)
    }
    return [...m.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
  }, [slots])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return slots.filter((s) => {
      if (filterSeccion && s.seccion_id !== filterSeccion) return false
      if (!q) return true
      const haystack = [
        s.curso_nombre,
        s.grado_nombre,
        s.seccion_nombre,
        s.modalidad_nombre,
        s.label,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [slots, filterSeccion, search])
  const intervals = useMemo(() => {
    const map = new Map<string, { start: string; end: string }>()
    for (const s of filtered) {
      const start = hm(s.hora_inicio)
      const end = hm(s.hora_fin)
      if (start && end) map.set(start, { start, end })
    }
    return [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
  }, [filtered])

  const byCell = useMemo(() => {
    const map = new Map<string, HorarioSlotDetail[]>()
    for (const s of filtered) {
      const k = `${s.dia_semana}|${hm(s.hora_inicio)}`
      const list = map.get(k) ?? []
      list.push(s)
      map.set(k, list)
    }
    return map
  }, [filtered])

  const stats = useMemo(() => {
    const porDia = new Map<number, number>()
    const porMateria = new Map<string, number>()
    let total = 0
    for (const s of filtered) {
      // Redondear cada bloque hacia arriba, luego acumular
      const h = slotHoursCeil(s)
      total += h
      porDia.set(s.dia_semana, (porDia.get(s.dia_semana) ?? 0) + h)
      const key = `${s.curso_nombre} · ${s.grado_nombre} sec${s.seccion_nombre}`
      porMateria.set(key, (porMateria.get(key) ?? 0) + h)
    }
    const dias = DAYS.filter((d) => (porDia.get(d) ?? 0) > 0).map((d) => ({
      dia: DIA_SHORT[d],
      horas: porDia.get(d) ?? 0,
    }))
    const materias = [...porMateria.entries()]
      .map(([label, horas]) => ({ label, horas }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    return { dias, materias, total }
  }, [filtered])

  const openVer = async (slot: HorarioSlotDetail, fecha: string) => {
    setDetalleLoading(true)
    setDetalle(null)
    try {
      const d = await getHorarioMioDetalle(slot.asignacion_docente_id, fecha)
      setDetalle(d)
    } catch (e) {
      toast.error(userMessageFromError(e))
    } finally {
      setDetalleLoading(false)
    }
  }

  return (
    <div data-testid="horario-maestro-view">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem 1.25rem',
          alignItems: 'end',
          marginBottom: '0.75rem',
        }}
      >
        <h1 className="page-title" style={{ margin: 0, flex: '1 1 auto' }}>
          {title}
        </h1>
        <Field label="Semana de">
          <input
            type="date"
            className="field__input"
            data-testid="horario-maestro-fecha"
            value={fechaRef}
            onChange={(e) => setFechaRef(e.target.value)}
          />
        </Field>
      </div>

      {isLoading ? (
        <div className="empty-state">Cargando horario…</div>
      ) : slots.length === 0 ? (
        <div className="empty-state" data-testid="horario-maestro-empty">
          {lockedToAsignacion
            ? 'Sin bloques de horario para esta clase en la semana.'
            : 'Sin horario publicado para tus asignaciones.'}
        </div>
      ) : (
        <div className="horario-view" data-testid="horario-maestro-horario-view">
          {!lockedToAsignacion ? (
            <div className="horario-view__filters">
              <div className="horario-view__filter" style={{ minWidth: 220, flex: '1 1 200px' }}>
                <SearchInput
                  data-testid="horario-maestro-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="horario-view__filter">
                <span className="horario-board__filter-label">Grado · sección</span>
                <Combobox
                  data-testid="horario-maestro-filtro-seccion"
                  value={filterSeccion}
                  onChange={setFilterSeccion}
                  options={[{ value: '', label: 'Todas' }, ...seccionOptions]}
                  placeholder="Sección…"
                />
              </div>
            </div>
          ) : null}

          <div className="horario-board__grid-wrap">
            <table
              className="horario-board__table horario-view__table"
              data-testid="horario-maestro-grid"
            >
              <thead>
                <tr>
                  <th className="horario-board__time">Hora</th>
                  {DAYS.map((d) => (
                    <th key={d}>{DIA_SHORT[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {intervals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="texto-muted" style={{ textAlign: 'center' }}>
                      Sin bloques con este filtro
                    </td>
                  </tr>
                ) : (
                  intervals.map((iv) => (
                    <tr key={iv.start}>
                      <td className="horario-board__time">
                        {iv.start}–{iv.end}
                      </td>
                      {DAYS.map((d) => {
                        const cell = byCell.get(`${d}|${iv.start}`) ?? []
                        const fecha = fechaDeDia(semanaInicio, d)
                        return (
                          <td key={d} className="horario-board__cell">
                            <div className="horario-board__cell-stack">
                              {cell.map((s) => (
                                <button
                                  key={`${s.asignacion_docente_id}-${s.hora_inicio}-${s.seccion_id}`}
                                  type="button"
                                  className="horario-pill horario-pill--fixed horario-pill--maestro"
                                  data-testid={`horario-maestro-slot-${s.dia_semana}-${iv.start}`}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setCtx({ x: e.clientX, y: e.clientY, slot: s, fecha })
                                  }}
                                >
                                  <span>{cellLabel(s)}</span>
                                </button>
                              ))}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="horario-maestro-stats" data-testid="horario-maestro-stats">
            <div className="horario-maestro-stats__row">
              <span className="horario-maestro-stats__label">Por día</span>
              <span className="horario-maestro-stats__value">
                {stats.dias.length === 0
                  ? '—'
                  : stats.dias.map((d) => `${d.dia} ${d.horas} h`).join(' · ')}
              </span>
            </div>
            <div className="horario-maestro-stats__row">
              <span className="horario-maestro-stats__label">Por materia</span>
              <span className="horario-maestro-stats__value">
                {stats.materias.length === 0
                  ? '—'
                  : stats.materias.map((m) => `${m.label}: ${m.horas} h`).join(' · ')}
              </span>
            </div>
            <div className="horario-maestro-stats__row">
              <span className="horario-maestro-stats__label">Total</span>
              <span className="horario-maestro-stats__value">{stats.total} h</span>
            </div>
          </div>
        </div>
      )}

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          data-testid="horario-maestro-ctx"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="horario-maestro-ctx-ver"
            onClick={() => {
              void openVer(ctx.slot, ctx.fecha)
              closeCtx()
            }}
          >
            Ver
          </button>
        </div>
      ) : null}

      <Modal
        open={detalleLoading || detalle !== null}
        title={
          detalle
            ? `${detalle.curso_nombre} · ${detalle.dia_semana} ${detalle.fecha}`
            : 'Cargando…'
        }
        onClose={() => {
          setDetalle(null)
          setDetalleLoading(false)
        }}
        xl
        footer={
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setDetalle(null)
              setDetalleLoading(false)
            }}
          >
            Cerrar
          </button>
        }
      >
        <div data-testid="horario-maestro-detalle">
          {detalleLoading || !detalle ? (
            <div className="empty-state">Cargando…</div>
          ) : (
            <>
              <p className="texto-muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {detalle.grado_nombre} sec{detalle.seccion_nombre} · {detalle.modalidad_nombre}
                <br />
                Semana del plan: {detalle.semana_inicio} — {detalle.semana_fin}
              </p>

              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Plan de la semana</h3>
              {(detalle.plan_items ?? []).length === 0 ? (
                <p className="texto-muted" style={{ fontSize: '0.85rem' }}>
                  Sin ítems de plan activo para esta semana.
                </p>
              ) : (
                <table className="data-table" style={{ marginBottom: '1.25rem' }}>
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Fechas</th>
                      <th>Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.plan_items.map((it) => (
                      <tr key={it.id}>
                        <td>{it.titulo}</td>
                        <td>{labelTipo(it.tipo_item)}</td>
                        <td>
                          {it.fecha_inicio} — {it.fecha_fin}
                        </td>
                        <td>
                          {labelCumplimiento(it.estado_cumplimiento)}
                          {it.porcentaje_avance > 0 ? ` (${it.porcentaje_avance}%)` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Tareas del día</h3>
              {(detalle.tareas ?? []).length === 0 ? (
                <p className="texto-muted" style={{ fontSize: '0.85rem' }}>
                  Sin tareas asignadas o con entrega en este día.
                </p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Asignación</th>
                      <th>Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.tareas.map((t) => (
                      <tr key={t.id}>
                        <td>{t.titulo}</td>
                        <td>{t.fecha_asignacion}</td>
                        <td>{t.fecha_entrega}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
