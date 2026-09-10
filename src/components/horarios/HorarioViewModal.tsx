import { useMemo, useState } from 'react'
import { Combobox } from '#/components/ui/Combobox'
import { Modal } from '#/components/ui/Modal'
import { DIA_SHORT, type TimeInterval } from '#/lib/horarioGrid'
import {
  downloadHorarioActualPdf,
  downloadHorariosAlumnosPdf,
  downloadHorariosMaestrosPdf,
} from '#/lib/horarioPdf'
import type { HorarioSlotDetail, HorarioVersionDetail } from '#/services/horarios'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

function hm(t: string | undefined): string {
  return (t ?? '').slice(0, 5)
}

type ViewRow =
  | { kind: 'slot'; start: string; end: string }
  | { kind: 'recess'; start: string; end: string }

type HorarioViewModalProps = {
  open: boolean
  detail: HorarioVersionDetail | null
  loading?: boolean
  /** Fin de jornada de la modalidad; filas posteriores se marcan como extra. */
  jornadaFin?: string
  onClose: () => void
}

export function HorarioViewModal({
  open,
  detail,
  loading,
  jornadaFin,
  onClose,
}: HorarioViewModalProps) {
  const [filterMode, setFilterMode] = useState<'seccion' | 'maestro'>('seccion')
  const [filterSeccion, setFilterSeccion] = useState('')
  const [filterMaestro, setFilterMaestro] = useState('')
  const [downloadOpen, setDownloadOpen] = useState(false)

  const slots = detail?.slots ?? []
  const finJornada = hm(jornadaFin)
  const recess: TimeInterval | null =
    detail?.recreo_inicio && detail?.recreo_fin
      ? { start: hm(detail.recreo_inicio), end: hm(detail.recreo_fin) }
      : null

  const brand = {
    appName: 'Sasha',
    institucionNombre: detail?.nombre_institucion,
  }

  const seccionOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of slots) {
      m.set(s.seccion_id, `${s.grado_nombre} · sec${s.seccion_nombre}`)
    }
    return [...m.entries()].map(([value, label]) => ({ value, label }))
  }, [slots])

  const maestroOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of slots) m.set(s.maestro_id, s.maestro_nombre)
    return [...m.entries()].map(([value, label]) => ({ value, label }))
  }, [slots])

  const filtered = useMemo(() => {
    return slots.filter((s) => {
      if (filterMode === 'seccion') {
        if (filterSeccion && s.seccion_id !== filterSeccion) return false
        return true
      }
      if (filterMaestro && s.maestro_id !== filterMaestro) return false
      return true
    })
  }, [slots, filterMode, filterSeccion, filterMaestro])

  const classIntervals = useMemo(() => {
    const map = new Map<string, TimeInterval>()
    for (const s of filtered) {
      const start = hm(s.hora_inicio)
      const end = hm(s.hora_fin)
      if (start && end) map.set(start, { start, end })
    }
    return [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
  }, [filtered])

  const rows = useMemo(() => {
    const out: ViewRow[] = []
    const recessNorm =
      recess && hm(recess.start) && hm(recess.end)
        ? { start: hm(recess.start), end: hm(recess.end) }
        : null

    for (let i = 0; i < classIntervals.length; i++) {
      const cur = classIntervals[i]
      const prev = i > 0 ? classIntervals[i - 1] : null
      if (prev && prev.end < cur.start) {
        const gapStart = prev.end
        const gapEnd = cur.start
        // Hueco dentro de la jornada → recreo (no el salto hacia horas extra)
        if (!finJornada || gapStart < finJornada) {
          out.push({ kind: 'recess', start: gapStart, end: gapEnd })
        }
      }
      out.push({ kind: 'slot', start: cur.start, end: cur.end })
    }

    // Si no hubo hueco detectable pero la modalidad tiene recreo, insertarlo
    if (recessNorm && !out.some((r) => r.kind === 'recess')) {
      const withRecess: ViewRow[] = []
      let inserted = false
      for (const r of out) {
        if (
          !inserted &&
          r.kind === 'slot' &&
          r.start >= recessNorm.end &&
          (!finJornada || recessNorm.start < finJornada)
        ) {
          withRecess.push({ kind: 'recess', start: recessNorm.start, end: recessNorm.end })
          inserted = true
        }
        withRecess.push(r)
      }
      if (inserted) return withRecess
    }

    return out
  }, [classIntervals, finJornada, recess])

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

  const filterSubtitle = useMemo(() => {
    if (filterMode === 'seccion') {
      const sec = seccionOptions.find((o) => o.value === filterSeccion)
      return sec ? `Filtro: ${sec.label}` : 'Todas las secciones'
    }
    const mae = maestroOptions.find((o) => o.value === filterMaestro)?.label
    return mae ? `Filtro: ${mae}` : 'Todos los maestros'
  }, [filterMode, filterSeccion, filterMaestro, seccionOptions, maestroOptions])

  function cellLabel(s: HorarioSlotDetail) {
    if (filterMode === 'maestro') {
      return `${s.curso_nombre} · ${s.grado_nombre} sec${s.seccion_nombre}`
    }
    return `${s.curso_nombre} · ${s.maestro_nombre}`
  }

  function isExtraSlot(start: string, end: string) {
    if (!finJornada) return false
    return start >= finJornada || end > finJornada
  }

  function runDownload(kind: 'actual' | 'maestros' | 'alumnos') {
    if (!detail) return
    const versionLabel = detail.codigo_semilla
    const periodoNombre = detail.periodo_nombre || 'Periodo'
    if (kind === 'actual') {
      downloadHorarioActualPdf({
        title: `Horario ${versionLabel}`,
        subtitle: `${periodoNombre} · ${filterSubtitle}`,
        slots: filtered,
        recess,
        jornadaFin: finJornada || undefined,
        brand,
        cellText: cellLabel,
        filename: `${versionLabel}-actual.pdf`,
      })
    } else if (kind === 'maestros') {
      downloadHorariosMaestrosPdf({
        versionLabel,
        periodoNombre,
        slots,
        recess,
        jornadaFin: finJornada || undefined,
        brand,
        filename: `${versionLabel}-maestros.pdf`,
      })
    } else {
      downloadHorariosAlumnosPdf({
        versionLabel,
        periodoNombre,
        slots,
        recess,
        jornadaFin: finJornada || undefined,
        brand,
        filename: `${versionLabel}-alumnos.pdf`,
      })
    }
    setDownloadOpen(false)
  }

  return (
    <>
      <Modal
        open={open}
        title={detail ? `Ver horario · ${detail.codigo_semilla}` : 'Ver horario'}
        board
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cerrar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!detail || slots.length === 0}
              onClick={() => setDownloadOpen(true)}
            >
              Descargar PDF
            </button>
          </>
        }
      >
        {loading || !detail ? (
          <p className="texto-muted">Cargando horario…</p>
        ) : (
          <div className="horario-view">
            <div className="horario-view__meta texto-muted">
              {detail.periodo_nombre || 'Periodo'} ·{' '}
              {detail.es_activa ? 'Activa' : 'Inactiva'}
              {detail.modalidad_nombre ? ` · ${detail.modalidad_nombre}` : ''}
              {finJornada ? ` · jornada hasta ${finJornada}` : ''}
            </div>

            <div className="horario-view__filters">
              <div className="horario-view__filter">
                <span className="horario-board__filter-label">Filtrar por</span>
                <Combobox
                  value={filterMode}
                  onChange={(v) => setFilterMode(v as 'seccion' | 'maestro')}
                  options={[
                    { value: 'seccion', label: 'Grado · sección' },
                    { value: 'maestro', label: 'Maestro' },
                  ]}
                />
              </div>
              {filterMode === 'seccion' ? (
                <div className="horario-view__filter">
                  <span className="horario-board__filter-label">Grado · sección</span>
                  <Combobox
                    value={filterSeccion}
                    onChange={setFilterSeccion}
                    options={[{ value: '', label: 'Todas' }, ...seccionOptions]}
                    placeholder="Sección…"
                  />
                </div>
              ) : (
                <div className="horario-view__filter">
                  <span className="horario-board__filter-label">Maestro</span>
                  <Combobox
                    value={filterMaestro}
                    onChange={setFilterMaestro}
                    options={[{ value: '', label: 'Todos' }, ...maestroOptions]}
                    placeholder="Maestro…"
                  />
                </div>
              )}
            </div>

            <div className="horario-board__grid-wrap">
              <table className="horario-board__table horario-view__table">
                <thead>
                  <tr>
                    <th className="horario-board__time">Hora</th>
                    {DAYS.map((d) => (
                      <th key={d}>{DIA_SHORT[d]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="texto-muted" style={{ textAlign: 'center' }}>
                        Sin bloques con este filtro
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      if (row.kind === 'recess') {
                        return (
                          <tr key={`recess-${row.start}`}>
                            <td className="horario-board__time">
                              {row.start}–{row.end}
                            </td>
                            {DAYS.map((d) => (
                              <td key={d} className="horario-board__cell horario-board__cell--recess">
                                Recreo
                              </td>
                            ))}
                          </tr>
                        )
                      }
                      const isExtra = isExtraSlot(row.start, row.end)
                      return (
                        <tr
                          key={`slot-${row.start}`}
                          className={isExtra ? 'horario-board__row--extra' : undefined}
                        >
                          <td
                            className={`horario-board__time${isExtra ? ' horario-board__time--extra' : ''}`}
                          >
                            {row.start}–{row.end}
                            {isExtra ? <span className="horario-board__extra-tag">extra</span> : null}
                          </td>
                          {DAYS.map((d) => {
                            const items = byCell.get(`${d}|${row.start}`) ?? []
                            return (
                              <td
                                key={d}
                                className={`horario-board__cell${isExtra ? ' horario-board__cell--extra' : ''}`}
                              >
                                <div className="horario-board__cell-stack">
                                  {items.map((s, i) => (
                                    <div
                                      key={`${s.asignacion_docente_id}-${i}`}
                                      className="horario-pill horario-pill--fixed"
                                    >
                                      <span>{cellLabel(s)}</span>
                                    </div>
                                  ))}
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
          </div>
        )}
      </Modal>

      <Modal
        open={downloadOpen}
        title="Descargar PDF"
        onClose={() => setDownloadOpen(false)}
        footer={
          <button type="button" className="btn btn--ghost" onClick={() => setDownloadOpen(false)}>
            Cancelar
          </button>
        }
      >
        <div className="horario-download-options">
          <button type="button" className="btn btn--ghost" onClick={() => runDownload('actual')}>
            Descargar actual
          </button>
          <p className="texto-muted" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
            PDF de la vista filtrada que estás viendo.
          </p>
          <button type="button" className="btn btn--ghost" onClick={() => runDownload('maestros')}>
            Descargar horarios maestros
          </button>
          <p className="texto-muted" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
            Una página por maestro con su horario de lunes a domingo.
          </p>
          <button type="button" className="btn btn--ghost" onClick={() => runDownload('alumnos')}>
            Horario total alumnos
          </button>
          <p className="texto-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Una página por grado-sección con el horario completo.
          </p>
        </div>
      </Modal>
    </>
  )
}
