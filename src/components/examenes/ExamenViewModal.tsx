import { useEffect, useMemo, useState } from 'react'
import { Combobox } from '#/components/ui/Combobox'
import { Modal } from '#/components/ui/Modal'
import {
  estadoExamen,
  fechaCorta,
  fechasEntre,
  horaSalidaConBloques,
  labelPill,
  normalizarHora,
  soloFecha,
} from '#/lib/examenes'
import { downloadExamenHorarioPdf } from '#/lib/examenesPdf'
import type { ExamenDetalle } from '#/services/examenes'

type ExamenViewModalProps = {
  open: boolean
  detail: ExamenDetalle | null
  loading?: boolean
  onClose: () => void
}

export function ExamenViewModal({ open, detail, loading, onClose }: ExamenViewModalProps) {
  const [filterGrado, setFilterGrado] = useState('')
  const [filterSeccion, setFilterSeccion] = useState('')
  const [filterCurso, setFilterCurso] = useState('')

  useEffect(() => {
    if (!open) return
    setFilterGrado('')
    setFilterSeccion('')
    setFilterCurso('')
  }, [open, detail?.id])

  const asignaciones = detail?.asignaciones ?? []

  const gradoOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of asignaciones) {
      if (a.grado_id) map.set(a.grado_id, a.grado_nombre || a.grado_id)
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }))
  }, [asignaciones])

  const seccionOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of asignaciones) {
      map.set(
        a.seccion_id,
        labelPill('', a.grado_nombre ?? '', a.seccion_nombre ?? '').replace(/^ · /, '') ||
          a.seccion_nombre ||
          a.seccion_id,
      )
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }))
  }, [asignaciones])

  const cursoOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of asignaciones) map.set(a.curso_id, a.curso_nombre || a.curso_id)
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }))
  }, [asignaciones])

  const filtered = useMemo(
    () =>
      asignaciones.filter((a) => {
        if (filterGrado && a.grado_id !== filterGrado) return false
        if (filterSeccion && a.seccion_id !== filterSeccion) return false
        if (filterCurso && a.curso_id !== filterCurso) return false
        return true
      }),
    [asignaciones, filterGrado, filterSeccion, filterCurso],
  )

  const bloques = useMemo(
    () => [...(detail?.bloques ?? [])].sort((a, b) => a.orden - b.orden),
    [detail?.bloques],
  )

  const fechas = useMemo(() => {
    if (!detail) return []
    const rango = fechasEntre(detail.fecha_inicio, detail.fecha_fin)
    if (rango.length > 0) return rango
    return [...new Set(asignaciones.map((a) => soloFecha(a.fecha)))].sort()
  }, [detail, asignaciones])

  const byCell = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const a of filtered) {
      const key = `${soloFecha(a.fecha)}|${a.bloque_orden}`
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    }
    return map
  }, [filtered])

  const estado = detail ? estadoExamen(detail.estado, detail.es_activa) : null

  return (
    <Modal
      open={open}
      title={
        detail
          ? `Horario de exámenes · v${detail.numero_version}`
          : 'Horario de exámenes'
      }
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
            disabled={!detail || asignaciones.length === 0}
            onClick={() =>
              detail &&
              downloadExamenHorarioPdf({ detail, asignaciones: filtered })
            }
          >
            Descargar PDF
          </button>
        </>
      }
    >
      {loading || !detail ? (
        <p className="texto-muted">Cargando horario de exámenes…</p>
      ) : (
        <div className="horario-view">
          <div className="horario-view__meta texto-muted">
            {detail.periodo_nombre || 'Periodo'} · {detail.parcial_nombre || 'Parcial'} ·{' '}
            {detail.modalidad_nombre || 'Modalidad'} ·{' '}
            {fechaCorta(detail.fecha_inicio)} – {fechaCorta(detail.fecha_fin)} · v
            {detail.numero_version}
            {estado ? (
              <span className={`estado-pill estado-pill--${estado.tone}`} style={{ marginLeft: '0.5rem' }}>
                {estado.label}
              </span>
            ) : null}
          </div>

          <div className="horario-view__filters">
            <div className="horario-view__filter">
              <span className="horario-board__filter-label">Grado</span>
              <Combobox
                value={filterGrado}
                onChange={setFilterGrado}
                options={[{ value: '', label: 'Todos' }, ...gradoOptions]}
                placeholder="Grado…"
              />
            </div>
            <div className="horario-view__filter">
              <span className="horario-board__filter-label">Grado · sección</span>
              <Combobox
                value={filterSeccion}
                onChange={setFilterSeccion}
                options={[{ value: '', label: 'Todas' }, ...seccionOptions]}
                placeholder="Sección…"
              />
            </div>
            <div className="horario-view__filter">
              <span className="horario-board__filter-label">Materia</span>
              <Combobox
                value={filterCurso}
                onChange={setFilterCurso}
                options={[{ value: '', label: 'Todas' }, ...cursoOptions]}
                placeholder="Materia…"
              />
            </div>
          </div>

          <div className="horario-board__grid-wrap">
            <table className="horario-board__table horario-view__table">
              <thead>
                <tr>
                  <th className="horario-board__time">Fecha / salida</th>
                  {bloques.length > 0 ? (
                    bloques.map((bloque) => (
                      <th key={bloque.orden}>
                        Bloque {bloque.orden}
                        <br />
                        <span className="texto-muted" style={{ fontSize: '0.75rem', fontWeight: 400 }}>
                          {normalizarHora(bloque.hora_inicio)}–{normalizarHora(bloque.hora_fin)}
                        </span>
                      </th>
                    ))
                  ) : (
                    <th>Exámenes</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {fechas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={bloques.length > 0 ? bloques.length + 1 : 2}
                      className="texto-muted"
                      style={{ textAlign: 'center' }}
                    >
                      Sin exámenes con este filtro
                    </td>
                  </tr>
                ) : (
                  fechas.map((fecha) => {
                    const salida = horaSalidaConBloques(filtered, bloques, fecha)
                    return (
                      <tr key={fecha}>
                        <td className="horario-board__time">
                          {fechaCorta(fecha)}
                          <br />
                          <span className="texto-muted" style={{ fontSize: '0.75rem' }}>
                            Salida {salida || '—'}
                          </span>
                        </td>
                        {bloques.length > 0 ? (
                          bloques.map((bloque) => {
                            const items =
                              byCell.get(`${soloFecha(fecha)}|${bloque.orden}`) ?? []
                            return (
                              <td key={bloque.orden} className="horario-board__cell">
                                <div className="horario-board__cell-stack">
                                  {items.length === 0 ? (
                                    <span className="texto-muted" style={{ fontSize: '0.75rem' }}>
                                      —
                                    </span>
                                  ) : (
                                    items.map((a) => (
                                      <div
                                        key={`${a.id || a.seccion_id}-${a.curso_id}`}
                                        className="horario-pill horario-pill--fixed"
                                      >
                                        <span>
                                          {labelPill(
                                            a.curso_nombre ?? 'Materia',
                                            a.grado_nombre ?? '',
                                            a.seccion_nombre ?? '',
                                          )}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </td>
                            )
                          })
                        ) : (
                          <td className="horario-board__cell">
                            <div className="horario-board__cell-stack">
                              {filtered
                                .filter((a) => soloFecha(a.fecha) === fecha)
                                .map((a) => (
                                  <div
                                    key={`${a.id || a.seccion_id}-${a.curso_id}`}
                                    className="horario-pill horario-pill--fixed"
                                  >
                                    <span>
                                      {labelPill(
                                        a.curso_nombre ?? 'Materia',
                                        a.grado_nombre ?? '',
                                        a.seccion_nombre ?? '',
                                      )}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </td>
                        )}
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
  )
}
