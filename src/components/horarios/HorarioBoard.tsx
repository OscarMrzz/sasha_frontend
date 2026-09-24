import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { SearchInput } from '#/components/ui/SearchInput'
import { DIA_SHORT, nextSlotAfter, sortSlots, type TimeInterval } from '#/lib/horarioGrid'
import type { HorarioSlot } from '#/services/horarios'

export type HorarioPill = {
  asignacionId: string
  seccionId: string
  cursoId: string
  maestroId: string
  gradoId: string
  label: string
  minHours: number
  maestroNombre: string
  cursoNombre: string
  seccionLabel: string
  gradoNombre: string
}

export type PlacedBlock = {
  key: string
  asignacionId: string
  seccionId: string
  cursoId: string
  maestroId: string
  label: string
  diaSemana: number
  horaInicio: string
  horaFin: string
  esFijo: boolean
}

type DragPayload =
  | { type: 'pill'; asignacionId: string }
  | { type: 'placed'; asignacionId: string; placedKey: string }

type FocusCell = { diaSemana: number; horaInicio: string }

type HorarioBoardProps = {
  days: number[]
  slots: TimeInterval[]
  onSlotsChange: (next: TimeInterval[]) => void
  slotMinutes: number
  recess: TimeInterval | null
  /** Fin de jornada de la modalidad; filas >= esto se marcan como hora extra. */
  jornadaFin?: string
  pills: HorarioPill[]
  placed: PlacedBlock[]
  onPlacedChange: (next: PlacedBlock[]) => void
  pillSearch: string
  onPillSearchChange: (v: string) => void
  toolbar?: ReactNode
}

export function HorarioBoard({
  days,
  slots,
  onSlotsChange,
  slotMinutes,
  recess,
  jornadaFin,
  pills,
  placed,
  onPlacedChange,
  pillSearch,
  onPillSearchChange,
  toolbar,
}: HorarioBoardProps) {
  const [drag, setDrag] = useState<DragPayload | null>(null)
  const [focusCell, setFocusCell] = useState<FocusCell | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [filterMaestro, setFilterMaestro] = useState('')
  const [filterCurso, setFilterCurso] = useState('')
  const [filterSeccion, setFilterSeccion] = useState('')
  const [filterGrado, setFilterGrado] = useState('')

  const remaining = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of pills) {
      const used = placed.filter((b) => b.asignacionId === p.asignacionId).length
      map.set(p.asignacionId, Math.max(0, p.minHours - used))
    }
    return map
  }, [pills, placed])

  const maestroOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pills) m.set(p.maestroId, p.maestroNombre)
    return [...m.entries()].map(([value, label]) => ({ value, label }))
  }, [pills])

  const cursoOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pills) m.set(p.cursoId, p.cursoNombre)
    return [...m.entries()].map(([value, label]) => ({ value, label }))
  }, [pills])

  const seccionOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pills) m.set(p.seccionId, p.seccionLabel)
    return [...m.entries()].map(([value, label]) => ({ value, label }))
  }, [pills])

  const gradoOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pills) {
      if (p.gradoId) m.set(p.gradoId, p.gradoNombre || p.gradoId)
    }
    return [...m.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }))
  }, [pills])

  const pillByAsignacion = useMemo(() => {
    const m = new Map<string, HorarioPill>()
    for (const p of pills) m.set(p.asignacionId, p)
    return m
  }, [pills])

  function passesCombobox(p: {
    maestroId: string
    cursoId: string
    seccionId: string
    gradoId?: string
    asignacionId?: string
    label: string
  }) {
    if (filterMaestro && p.maestroId !== filterMaestro) return false
    if (filterCurso && p.cursoId !== filterCurso) return false
    if (filterSeccion && p.seccionId !== filterSeccion) return false
    const gradoId = p.gradoId ?? (p.asignacionId ? pillByAsignacion.get(p.asignacionId)?.gradoId : undefined)
    if (filterGrado && gradoId !== filterGrado) return false
    const q = pillSearch.trim().toLowerCase()
    if (q && !p.label.toLowerCase().includes(q)) return false
    return true
  }

  function isPlaceable(pill: HorarioPill, day: number, horaInicio: string, ignoreKey?: string) {
    const others = placed.filter((b) => b.key !== ignoreKey)
    if (others.some((b) => b.maestroId === pill.maestroId && b.diaSemana === day && b.horaInicio === horaInicio)) {
      return false
    }
    if (others.some((b) => b.seccionId === pill.seccionId && b.diaSemana === day && b.horaInicio === horaInicio)) {
      return false
    }
    return true
  }

  const placeableIds = useMemo(() => {
    if (!focusCell) return null
    const set = new Set<string>()
    for (const p of pills) {
      if ((remaining.get(p.asignacionId) ?? 0) <= 0) continue
      const others = placed
      const maestroBusy = others.some(
        (b) =>
          b.maestroId === p.maestroId &&
          b.diaSemana === focusCell.diaSemana &&
          b.horaInicio === focusCell.horaInicio,
      )
      const secBusy = others.some(
        (b) =>
          b.seccionId === p.seccionId &&
          b.diaSemana === focusCell.diaSemana &&
          b.horaInicio === focusCell.horaInicio,
      )
      if (!maestroBusy && !secBusy) set.add(p.asignacionId)
    }
    return set
  }, [focusCell, pills, placed, remaining])

  function isHighlighted(p: {
    asignacionId: string
    maestroId: string
    cursoId: string
    seccionId: string
    label: string
    gradoId?: string
  }) {
    const combo = passesCombobox(p)
    if (placeableIds) {
      return combo && placeableIds.has(p.asignacionId)
    }
    return combo
  }

  const byCell = useMemo(() => {
    const m = new Map<string, PlacedBlock[]>()
    for (const b of placed) {
      const k = `${b.diaSemana}|${b.horaInicio}`
      const list = m.get(k) ?? []
      list.push(b)
      m.set(k, list)
    }
    return m
  }, [placed])

  function cellKey(day: number, start: string) {
    return `${day}|${start}`
  }

  function onDropCell(day: number, slot: TimeInterval) {
    if (!drag) return
    const payload = drag
    setDrag(null)

    if (payload.type === 'pill') {
      const pill = pills.find((p) => p.asignacionId === payload.asignacionId)
      if (!pill) return
      if ((remaining.get(pill.asignacionId) ?? 0) <= 0) {
        toast.error('Esa materia ya no tiene horas pendientes')
        return
      }
      if (!isPlaceable(pill, day, slot.start)) {
        const conflict = placed.find(
          (b) =>
            (b.maestroId === pill.maestroId || b.seccionId === pill.seccionId) &&
            b.diaSemana === day &&
            b.horaInicio === slot.start,
        )
        if (conflict?.maestroId === pill.maestroId) {
          toast.error(
            `No puedes colocar ${pill.label} aquí porque el mismo maestro ya da otra clase a esa hora (${conflict.label}).`,
          )
        } else {
          toast.error(`La sección ya tiene clase en esa franja (${conflict?.label ?? ''}).`)
        }
        return
      }
      onPlacedChange([
        ...placed,
        {
          key: `${pill.asignacionId}-${day}-${slot.start}-${Date.now()}`,
          asignacionId: pill.asignacionId,
          seccionId: pill.seccionId,
          cursoId: pill.cursoId,
          maestroId: pill.maestroId,
          label: pill.label,
          diaSemana: day,
          horaInicio: slot.start,
          horaFin: slot.end,
          esFijo: true,
        },
      ])
      return
    }

    const moving = placed.find((b) => b.key === payload.placedKey)
    if (!moving) return
    if (moving.diaSemana === day && moving.horaInicio === slot.start) return

    const pillLike = pills.find((p) => p.asignacionId === moving.asignacionId)
    const asPill: HorarioPill = pillLike ?? {
      asignacionId: moving.asignacionId,
      seccionId: moving.seccionId,
      cursoId: moving.cursoId,
      maestroId: moving.maestroId,
      gradoId: '',
      label: moving.label,
      minHours: 1,
      maestroNombre: '',
      cursoNombre: '',
      seccionLabel: '',
      gradoNombre: '',
    }

    if (!isPlaceable(asPill, day, slot.start, moving.key)) {
      toast.error(
        `No puedes mover ${moving.label} aquí porque hay conflicto de maestro o sección a esa hora.`,
      )
      return
    }

    onPlacedChange(
      placed.map((b) =>
        b.key === moving.key
          ? { ...b, diaSemana: day, horaInicio: slot.start, horaFin: slot.end, esFijo: true }
          : b,
      ),
    )
  }

  function removeBlock(key: string, e: React.MouseEvent) {
    e.stopPropagation()
    onPlacedChange(placed.filter((b) => b.key !== key))
  }

  function onCellClick(day: number, slot: TimeInterval, e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.horario-pill')) return
    if (focusCell?.diaSemana === day && focusCell.horaInicio === slot.start) {
      setFocusCell(null)
      return
    }
    setFocusCell({ diaSemana: day, horaInicio: slot.start })
  }

  function addRow() {
    const next = nextSlotAfter(slots, slotMinutes, recess)
    if (!next) {
      toast.error('No se pudo calcular la siguiente franja')
      return
    }
    onSlotsChange(sortSlots([...slots, next]))
  }

  function removeRow() {
    if (slots.length <= 1) {
      toast.error('Debe quedar al menos una fila de clase')
      return
    }
    const ordered = sortSlots(slots)
    for (let i = ordered.length - 1; i >= 0; i--) {
      const s = ordered[i]
      const busy = placed.some((b) => b.horaInicio === s.start)
      if (!busy) {
        onSlotsChange(ordered.filter((x) => x.start !== s.start))
        if (focusCell?.horaInicio === s.start) setFocusCell(null)
        return
      }
    }
    toast.error('Vacía la última fila antes de quitarla')
  }

  const rows = useMemo(() => {
    type Row =
      | { kind: 'slot'; slot: TimeInterval }
      | { kind: 'recess'; interval: TimeInterval }
    const list: Row[] = sortSlots(slots).map((slot) => ({ kind: 'slot' as const, slot }))
    if (recess) {
      list.push({ kind: 'recess', interval: recess })
      list.sort((a, b) => {
        const sa = a.kind === 'slot' ? a.slot.start : a.interval.start
        const sb = b.kind === 'slot' ? b.slot.start : b.interval.start
        return sa.localeCompare(sb)
      })
    }
    return list
  }, [slots, recess])

  return (
    <div className="horario-board-wrap">
      <div className="horario-board__main">
        {toolbar ? <div className="horario-board__toolbar">{toolbar}</div> : null}
        <div className="horario-board__filters">
          <div className="horario-board__filter">
            <span className="horario-board__filter-label">Maestro</span>
            <Combobox
              data-testid="horario-filter-maestro"
              value={filterMaestro}
              onChange={setFilterMaestro}
              options={[{ value: '', label: 'Todos los maestros' }, ...maestroOptions]}
              placeholder="Maestro…"
            />
          </div>
          <div className="horario-board__filter">
            <span className="horario-board__filter-label">Materia</span>
            <Combobox
              data-testid="horario-filter-curso"
              value={filterCurso}
              onChange={setFilterCurso}
              options={[{ value: '', label: 'Todas las materias' }, ...cursoOptions]}
              placeholder="Materia…"
            />
          </div>
          <div className="horario-board__filter">
            <span className="horario-board__filter-label">Grado</span>
            <Combobox
              data-testid="horario-filter-grado"
              value={filterGrado}
              onChange={setFilterGrado}
              options={[{ value: '', label: 'Todos los grados' }, ...gradoOptions]}
              placeholder="Grado…"
            />
          </div>
          <div className="horario-board__filter">
            <span className="horario-board__filter-label">Sección</span>
            <Combobox
              data-testid="horario-filter-seccion"
              value={filterSeccion}
              onChange={setFilterSeccion}
              options={[{ value: '', label: 'Todas las secciones' }, ...seccionOptions]}
              placeholder="Sección…"
            />
          </div>
          {focusCell ? (
            <div className="horario-board__filter horario-board__filter--action">
              <button type="button" className="btn btn--ghost" onClick={() => setFocusCell(null)}>
                Limpiar foco
              </button>
            </div>
          ) : null}
        </div>

        <div className="horario-board__grid-wrap">
          <table className="horario-board__table">
            <thead>
              <tr>
                <th className="horario-board__time">Hora</th>
                {days.map((d) => (
                  <th key={d}>{DIA_SHORT[d] ?? d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                if (row.kind === 'recess') {
                  return (
                    <tr key={`recess-${row.interval.start}`}>
                      <td className="horario-board__time">
                        {row.interval.start}–{row.interval.end}
                      </td>
                      {days.map((d) => (
                        <td key={d} className="horario-board__cell horario-board__cell--recess">
                          Recreo
                        </td>
                      ))}
                    </tr>
                  )
                }
                const slot = row.slot
                const fin = (jornadaFin ?? '').slice(0, 5)
                const isExtra = Boolean(
                  fin && (slot.start >= fin || slot.end > fin),
                )
                return (
                  <tr key={slot.start} className={isExtra ? 'horario-board__row--extra' : undefined}>
                    <td className={`horario-board__time${isExtra ? ' horario-board__time--extra' : ''}`}>
                      {slot.start}–{slot.end}
                      {isExtra ? <span className="horario-board__extra-tag">extra</span> : null}
                    </td>
                    {days.map((d) => {
                      const items = byCell.get(cellKey(d, slot.start)) ?? []
                      const focused =
                        focusCell?.diaSemana === d && focusCell.horaInicio === slot.start
                      return (
                        <td
                          key={d}
                          className={`horario-board__cell${focused ? ' horario-board__cell--focus' : ''}${isExtra ? ' horario-board__cell--extra' : ''}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            onDropCell(d, slot)
                          }}
                          onClick={(e) => onCellClick(d, slot, e)}
                        >
                          <div className="horario-board__cell-stack">
                            {items.map((b) => {
                              const muted = !isHighlighted({
                                asignacionId: b.asignacionId,
                                maestroId: b.maestroId,
                                cursoId: b.cursoId,
                                seccionId: b.seccionId,
                                label: b.label,
                              })
                              return (
                                <div
                                  key={b.key}
                                  className={`horario-pill horario-pill--fixed${muted ? ' horario-pill--muted' : ''}`}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation()
                                    setDrag({
                                      type: 'placed',
                                      asignacionId: b.asignacionId,
                                      placedKey: b.key,
                                    })
                                  }}
                                  onDragEnd={() => setDrag(null)}
                                >
                                  <span>{b.label}</span>
                                  <button
                                    type="button"
                                    className="horario-pill__remove"
                                    aria-label="Quitar"
                                    onClick={(e) => removeBlock(b.key, e)}
                                  >
                                    ×
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="horario-board__row-actions">
          <button type="button" className="btn btn--ghost" data-testid="horario-add-row" onClick={addRow}>
            Agregar fila
          </button>
          <button type="button" className="btn btn--ghost" data-testid="horario-remove-row" onClick={removeRow}>
            Quitar fila
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            data-testid="horario-clear-cells"
            disabled={placed.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            Vaciar celdas
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Vaciar celdas"
        message="Se quitarán todas las pastillas del tablero. ¿Estás seguro?"
        confirmLabel="Vaciar"
        danger
        onConfirm={() => {
          onPlacedChange([])
          setFocusCell(null)
          setConfirmClear(false)
        }}
        onCancel={() => setConfirmClear(false)}
      />

      <aside className="horario-board__sidebar">
        <SearchInput
          value={pillSearch}
          onChange={(e) => onPillSearchChange(e.target.value)}
          data-testid="horario-pill-search"
        />
        <div className="horario-board__pills">
          {pills.map((p) => {
            const left = remaining.get(p.asignacionId) ?? 0
            const empty = left <= 0
            const muted = !isHighlighted(p) || empty
            return (
              <div
                key={p.asignacionId}
                className={`horario-pill${empty ? ' horario-pill--empty' : ''}${muted ? ' horario-pill--muted' : ''}`}
                draggable={!empty}
                onDragStart={() => {
                  if (!empty) setDrag({ type: 'pill', asignacionId: p.asignacionId })
                }}
                onDragEnd={() => setDrag(null)}
                data-testid={`horario-pill-${p.asignacionId}`}
              >
                <span>{p.label}</span>
                <span className="horario-pill__count">{left}</span>
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

export function slotsFromPlaced(placed: PlacedBlock[]): HorarioSlot[] {
  return placed.map((b) => ({
    asignacion_docente_id: b.asignacionId,
    seccion_id: b.seccionId,
    curso_id: b.cursoId,
    maestro_id: b.maestroId,
    dia_semana: b.diaSemana,
    hora_inicio: b.horaInicio,
    hora_fin: b.horaFin,
    es_fijo: b.esFijo,
  }))
}

export function placedFromPreviewSlots(
  slots: HorarioSlot[],
  labelByAsignacion: Map<string, string>,
): PlacedBlock[] {
  return slots.map((s, i) => ({
    key: `${s.asignacion_docente_id}-${s.dia_semana}-${s.hora_inicio}-${i}`,
    asignacionId: s.asignacion_docente_id,
    seccionId: s.seccion_id,
    cursoId: s.curso_id,
    maestroId: s.maestro_id,
    label: labelByAsignacion.get(s.asignacion_docente_id) ?? s.curso_id.slice(0, 8),
    diaSemana: s.dia_semana,
    horaInicio: s.hora_inicio,
    horaFin: s.hora_fin,
    esFijo: s.es_fijo,
  }))
}
