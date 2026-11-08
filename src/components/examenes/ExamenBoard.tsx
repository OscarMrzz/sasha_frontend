import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Combobox } from '#/components/ui/Combobox'
import { SearchInput } from '#/components/ui/SearchInput'
import {
  duracionTexto,
  hora12,
  labelPill,
  minutosDeHora,
  normalizarHora,
  soloFecha,
} from '#/lib/examenes'

export type ExamenBloqueTablero = {
  orden: number
  hora_inicio: string
  hora_fin: string
}

/** Pastilla del tablero. `soloMateria` se expande a todas las secciones con esa materia. */
export type ExamenPill = {
  key: string
  cursoId: string
  cursoNombre: string
  gradoId?: string
  gradoNombre?: string
  seccionId: string
  seccionNombre?: string
  asignacionDocenteId?: string
  soloMateria: boolean
}

/** Examen colocado en una fecha y bloque del tablero. */
export type PlacedExamen = {
  key: string
  fecha: string
  bloqueOrden: number
  seccionId: string
  seccionNombre: string
  gradoId?: string
  gradoNombre?: string
  cursoId: string
  cursoNombre: string
  asignacionDocenteId?: string
}

type DragPayload =
  | { type: 'pill'; key: string }
  | { type: 'placed'; key: string }

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function diaLabel(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const date = new Date(anio, (mes || 1) - 1, dia || 1)
  return DIAS_SEMANA[date.getDay()] ?? ''
}

function diaNumero(fecha: string) {
  return fecha.slice(8, 10)
}

type FilaTablero =
  | { tipo: 'bloque'; bloque: ExamenBloqueTablero }
  | { tipo: 'receso'; inicio: string; fin: string; minutos: number }

type ExamenBoardProps = {
  dates: string[]
  bloques: ExamenBloqueTablero[]
  pills: ExamenPill[]
  placed: PlacedExamen[]
  onPlacedChange: (next: PlacedExamen[]) => void
  pillSearch: string
  onPillSearchChange: (value: string) => void
  toolbar?: ReactNode
}

export function ExamenBoard({
  dates,
  bloques,
  pills,
  placed,
  onPlacedChange,
  pillSearch,
  onPillSearchChange,
  toolbar,
}: ExamenBoardProps) {
  const [drag, setDrag] = useState<DragPayload | null>(null)
  const [filterGrado, setFilterGrado] = useState('')
  const [filterSeccion, setFilterSeccion] = useState('')
  const [filterCurso, setFilterCurso] = useState('')

  const specificPills = useMemo(() => pills.filter((p) => !p.soloMateria), [pills])
  const soloPills = useMemo(() => pills.filter((p) => p.soloMateria), [pills])

  const gradoOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of specificPills) {
      if (p.gradoId) map.set(p.gradoId, p.gradoNombre || p.gradoId)
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }))
  }, [specificPills])

  const seccionOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of specificPills) {
      if (p.seccionId) {
        map.set(p.seccionId, labelPill('', p.gradoNombre ?? '', p.seccionNombre ?? '').replace(/^ · /, ''))
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }))
  }, [specificPills])

  const cursoOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of pills) map.set(p.cursoId, p.cursoNombre)
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }))
  }, [pills])

  function targetsFor(pill: ExamenPill): ExamenPill[] {
    if (!pill.soloMateria) return [pill]
    // Una sección solo puede tener un examen por fecha y bloque: si hay varias
    // asignaciones del mismo curso en la misma sección, se llena una sola vez.
    const vistos = new Set<string>()
    return specificPills.filter((p) => {
      if (p.cursoId !== pill.cursoId || vistos.has(p.seccionId)) return false
      vistos.add(p.seccionId)
      return true
    })
  }

  function passesPillFilters(pill: ExamenPill): boolean {
    const targets = targetsFor(pill)
    if (filterCurso && pill.cursoId !== filterCurso) return false
    if (filterGrado && !targets.some((t) => t.gradoId === filterGrado)) return false
    if (filterSeccion && !targets.some((t) => t.seccionId === filterSeccion)) return false
    const q = pillSearch.trim().toLowerCase()
    if (!q) return true
    return targets.some((t) =>
      labelPill(pill.cursoNombre, t.gradoNombre ?? '', t.seccionNombre ?? '')
        .toLowerCase()
        .includes(q),
    )
  }

  function passesPlacedFilters(item: PlacedExamen): boolean {
    if (filterCurso && item.cursoId !== filterCurso) return false
    if (filterGrado && item.gradoId !== filterGrado) return false
    if (filterSeccion && item.seccionId !== filterSeccion) return false
    const q = pillSearch.trim().toLowerCase()
    if (!q) return true
    return labelPill(item.cursoNombre, item.gradoNombre ?? '', item.seccionNombre)
      .toLowerCase()
      .includes(q)
  }

  const byCell = useMemo(() => {
    const map = new Map<string, PlacedExamen[]>()
    for (const item of placed) {
      const key = `${soloFecha(item.fecha)}|${item.bloqueOrden}`
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [placed])

  function sectionBusy(fecha: string, bloqueOrden: number, seccionId: string, ignoreKey?: string) {
    return placed.some(
      (item) =>
        item.key !== ignoreKey &&
        soloFecha(item.fecha) === soloFecha(fecha) &&
        item.bloqueOrden === bloqueOrden &&
        item.seccionId === seccionId,
    )
  }

  // Un examen (materia + sección) solo puede existir una vez en todo el rango.
  function examPlaced(cursoId: string, seccionId: string, ignoreKey?: string) {
    return placed.some(
      (item) =>
        item.key !== ignoreKey &&
        item.cursoId === cursoId &&
        item.seccionId === seccionId,
    )
  }

  function remainingTargets(pill: ExamenPill) {
    return targetsFor(pill).filter(
      (target) => !examPlaced(target.cursoId, target.seccionId),
    )
  }

  function pillFullyPlaced(pill: ExamenPill) {
    const targets = targetsFor(pill)
    return (
      targets.length > 0 &&
      targets.every((target) => examPlaced(target.cursoId, target.seccionId))
    )
  }

  function makeKey(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  function placePill(pill: ExamenPill, fecha: string, bloque: ExamenBloqueTablero) {
    const allTargets = targetsFor(pill)
    const targets = remainingTargets(pill)
    if (targets.length === 0) {
      toast.error(
        allTargets.length === 0
          ? 'Esa materia no tiene secciones en la modalidad elegida.'
          : pill.soloMateria
            ? 'Todas las secciones de esa materia ya tienen su examen.'
            : 'Ese examen ya está asignado.',
      )
      return
    }
    let agregados = 0
    let omitidos = 0
    const next = [...placed]
    for (const target of targets) {
      if (sectionBusy(fecha, bloque.orden, target.seccionId)) {
        omitidos += 1
        continue
      }
      next.push({
        key: makeKey(`${target.cursoId}-${target.seccionId}-${fecha}-${bloque.orden}`),
        fecha: soloFecha(fecha),
        bloqueOrden: bloque.orden,
        seccionId: target.seccionId,
        seccionNombre: target.seccionNombre ?? '',
        gradoId: target.gradoId,
        gradoNombre: target.gradoNombre,
        cursoId: target.cursoId,
        cursoNombre: target.cursoNombre,
        asignacionDocenteId: target.asignacionDocenteId,
      })
      agregados += 1
    }
    if (agregados === 0) {
      toast.error('La sección ya tiene otro examen en ese bloque.')
      return
    }
    if (omitidos > 0) {
      toast.message(
        `Se colocaron ${agregados} exámenes; ${omitidos} se omitieron porque la sección ya estaba ocupada.`,
      )
    }
    onPlacedChange(next)
  }

  function movePlaced(item: PlacedExamen, fecha: string, bloque: ExamenBloqueTablero) {
    if (soloFecha(item.fecha) === soloFecha(fecha) && item.bloqueOrden === bloque.orden) return
    if (sectionBusy(fecha, bloque.orden, item.seccionId, item.key)) {
      toast.error('La sección ya tiene otro examen en ese bloque.')
      return
    }
    onPlacedChange(
      placed.map((cur) =>
        cur.key === item.key
          ? { ...cur, fecha: soloFecha(fecha), bloqueOrden: bloque.orden }
          : cur,
      ),
    )
  }

  function onDropCell(fecha: string, bloque: ExamenBloqueTablero) {
    if (!drag) return
    const payload = drag
    setDrag(null)
    if (payload.type === 'pill') {
      const pill = pills.find((p) => p.key === payload.key)
      if (pill) placePill(pill, fecha, bloque)
      return
    }
    const item = placed.find((p) => p.key === payload.key)
    if (item) movePlaced(item, fecha, bloque)
  }

  function removePlaced(key: string, event: React.MouseEvent) {
    event.stopPropagation()
    onPlacedChange(placed.filter((item) => item.key !== key))
  }

  const orderedBloques = useMemo(
    () => [...bloques].sort((a, b) => a.orden - b.orden),
    [bloques],
  )

  const filas = useMemo<FilaTablero[]>(() => {
    const out: FilaTablero[] = []
    orderedBloques.forEach((bloque, index) => {
      out.push({ tipo: 'bloque', bloque })
      const siguiente = orderedBloques[index + 1]
      if (siguiente) {
        const minutos =
          minutosDeHora(siguiente.hora_inicio) - minutosDeHora(bloque.hora_fin)
        if (minutos > 0) {
          out.push({
            tipo: 'receso',
            inicio: bloque.hora_fin,
            fin: siguiente.hora_inicio,
            minutos,
          })
        }
      }
    })
    return out
  }, [orderedBloques])

  return (
    <div className="examenes-board">
      <div className="examenes-board__cols">
        <div className="horario-board__main">
        {toolbar ? <div className="horario-board__toolbar">{toolbar}</div> : null}
        <div className="horario-board__filters">
          <div className="horario-board__filter">
            <span className="horario-board__filter-label">Grado</span>
            <Combobox
              value={filterGrado}
              onChange={setFilterGrado}
              options={[{ value: '', label: 'Todos los grados' }, ...gradoOptions]}
              placeholder="Grado…"
            />
          </div>
          <div className="horario-board__filter">
            <span className="horario-board__filter-label">Sección</span>
            <Combobox
              value={filterSeccion}
              onChange={setFilterSeccion}
              options={[{ value: '', label: 'Todas las secciones' }, ...seccionOptions]}
              placeholder="Sección…"
            />
          </div>
          <div className="horario-board__filter">
            <span className="horario-board__filter-label">Materia</span>
            <Combobox
              value={filterCurso}
              onChange={setFilterCurso}
              options={[{ value: '', label: 'Todas las materias' }, ...cursoOptions]}
              placeholder="Materia…"
            />
          </div>
        </div>

        <div className="horario-board__grid-wrap">
          <table className="horario-board__table">
            <thead>
              <tr>
                <th className="horario-board__time examenes-board__hora">Hora</th>
                {dates.map((fecha) => (
                  <th key={fecha} className="examenes-board__dia">
                    <span className="examenes-board__dia-label">{diaLabel(fecha)}</span>
                    <span className="examenes-board__dia-num">{diaNumero(fecha)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 1} className="texto-muted" style={{ textAlign: 'center' }}>
                    Define el rango de fechas para armar el tablero.
                  </td>
                </tr>
              ) : (
                filas.map((fila, index) => {
                  if (fila.tipo === 'receso') {
                    return (
                      <tr key={`receso-${index}`} className="examenes-board__receso">
                        <td className="horario-board__time examenes-board__hora">Receso</td>
                        <td colSpan={dates.length}>
                          {hora12(fila.inicio)} – {hora12(fila.fin)} ·{' '}
                          {duracionTexto(fila.minutos)}
                        </td>
                      </tr>
                    )
                  }
                  const bloque = fila.bloque
                  return (
                    <tr key={`bloque-${bloque.orden}`}>
                      <td className="horario-board__time examenes-board__hora">
                        <strong>Bloque {bloque.orden}</strong>
                        <span className="examenes-board__hora-item">
                          {hora12(bloque.hora_inicio)}
                        </span>
                        <span className="examenes-board__hora-item">
                          {hora12(bloque.hora_fin)}
                        </span>
                      </td>
                      {dates.map((fecha) => {
                        const items = byCell.get(`${soloFecha(fecha)}|${bloque.orden}`) ?? []
                        return (
                          <td
                            key={fecha}
                            className="horario-board__cell"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault()
                              onDropCell(fecha, bloque)
                            }}
                          >
                            <div className="horario-board__cell-stack">
                              {items.map((item) => {
                                const muted = !passesPlacedFilters(item)
                                return (
                                  <div
                                    key={item.key}
                                    className={`horario-pill horario-pill--fixed${muted ? ' horario-pill--muted' : ''}`}
                                    draggable
                                    onDragStart={(e) => {
                                      e.stopPropagation()
                                      setDrag({ type: 'placed', key: item.key })
                                    }}
                                    onDragEnd={() => setDrag(null)}
                                  >
                                    <span>{labelPill(item.cursoNombre, item.gradoNombre ?? '', item.seccionNombre)}</span>
                                    <button
                                      type="button"
                                      className="horario-pill__remove"
                                      aria-label="Quitar examen"
                                      onClick={(e) => removePlaced(item.key, e)}
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
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="horario-board__row-actions">
          <span className="texto-muted" style={{ fontSize: '0.8rem' }}>
            {placed.length} exámenes colocados · {orderedBloques.length} bloques ·{' '}
            {bloques.length > 0
              ? `${normalizarHora(bloques[0].hora_inicio)}–${normalizarHora(orderedBloques[orderedBloques.length - 1]?.hora_fin ?? '')}`
              : 'sin bloques'}
          </span>
        </div>
      </div>

        <aside className="examenes-board__col examenes-board__col--especificas">
          <SearchInput
            value={pillSearch}
            onChange={(e) => onPillSearchChange(e.target.value)}
            data-testid="examen-pill-search"
          />
          <p className="horario-board__filter-label" style={{ margin: '0.5rem 0 0.25rem' }}>
            Materia · grado · sección
          </p>
          <div className="horario-board__pills">
            {specificPills.length === 0 ? (
              <p className="texto-muted" style={{ fontSize: '0.8rem' }}>
                Sin materias para esta modalidad.
              </p>
            ) : (
              specificPills.map((pill) => {
                const visible = passesPillFilters(pill)
                const used = examPlaced(pill.cursoId, pill.seccionId)
                return (
                  <div
                    key={pill.key}
                    className={`horario-pill${visible ? '' : ' horario-pill--muted'}${used ? ' horario-pill--used' : ''}`}
                    draggable={!used}
                    onDragStart={() => {
                      if (!used) setDrag({ type: 'pill', key: pill.key })
                    }}
                    onDragEnd={() => setDrag(null)}
                    aria-disabled={used}
                    title={used ? 'Este examen ya está colocado' : undefined}
                  >
                    <span>{labelPill(pill.cursoNombre, pill.gradoNombre ?? '', pill.seccionNombre ?? '')}</span>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        <aside className="examenes-board__col examenes-board__col--materias">
          <p className="horario-board__filter-label" style={{ margin: '0 0 0.25rem' }}>
            Solo materia
          </p>
          <div className="horario-board__pills">
            {soloPills.length === 0 ? (
              <p className="texto-muted" style={{ fontSize: '0.78rem' }}>
                Sin materias.
              </p>
            ) : (
              soloPills.map((pill) => {
                const visible = passesPillFilters(pill)
                const used = pillFullyPlaced(pill)
                return (
                  <div
                    key={pill.key}
                    className={`horario-pill horario-pill--maestro${visible ? '' : ' horario-pill--muted'}${used ? ' horario-pill--used' : ''}`}
                    draggable={!used}
                    onDragStart={() => {
                      if (!used) setDrag({ type: 'pill', key: pill.key })
                    }}
                    onDragEnd={() => setDrag(null)}
                    aria-disabled={used}
                    title={
                      used
                        ? 'Todas las secciones ya tienen esta materia'
                        : 'Al soltarla se llenan todas las secciones con esta materia'
                    }
                  >
                    <span>{pill.cursoNombre}</span>
                  </div>
                )
              })
            )}
          </div>
        </aside>
      </div>

    </div>
  )
}
