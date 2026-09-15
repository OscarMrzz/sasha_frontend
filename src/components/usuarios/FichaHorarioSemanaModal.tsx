import { useMemo } from 'react'
import { Modal } from '#/components/ui/Modal'
import { DIA_SHORT } from '#/lib/horarioGrid'
import { downloadHorarioActualPdf } from '#/lib/horarioPdf'
import type { FichaSlot } from '#/services/personas'
import type { HorarioSlotDetail } from '#/services/horarios'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

function toDetail(s: FichaSlot): HorarioSlotDetail {
  return {
    asignacion_docente_id: s.asignacion_docente_id,
    seccion_id: s.seccion_id,
    curso_id: s.curso_id,
    maestro_id: s.maestro_id,
    dia_semana: s.dia_semana,
    hora_inicio: s.hora_inicio,
    hora_fin: s.hora_fin,
    es_fijo: false,
    curso_nombre: s.curso_nombre,
    maestro_nombre: s.maestro_nombre,
    seccion_nombre: s.seccion_nombre,
    grado_id: s.grado_id,
    grado_nombre: s.grado_nombre,
    modalidad_id: s.modalidad_id,
    modalidad_nombre: s.modalidad_nombre,
    label: `${s.curso_nombre}-${s.grado_nombre}-sec${s.seccion_nombre}`,
  }
}

type Props = {
  open: boolean
  title: string
  slots: FichaSlot[]
  mode: 'maestro' | 'alumno'
  onClose: () => void
}

export function FichaHorarioSemanaModal({ open, title, slots, mode, onClose }: Props) {
  const details = useMemo(() => slots.map(toDetail), [slots])

  const intervals = useMemo(() => {
    const map = new Map<string, { start: string; end: string }>()
    for (const s of details) {
      const start = s.hora_inicio.slice(0, 5)
      const end = s.hora_fin.slice(0, 5)
      if (start && end) map.set(start, { start, end })
    }
    return [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
  }, [details])

  const byCell = useMemo(() => {
    const map = new Map<string, HorarioSlotDetail[]>()
    for (const s of details) {
      const k = `${s.dia_semana}|${s.hora_inicio.slice(0, 5)}`
      const list = map.get(k) ?? []
      list.push(s)
      map.set(k, list)
    }
    return map
  }, [details])

  const cellText = (s: HorarioSlotDetail) =>
    mode === 'maestro'
      ? `${s.curso_nombre}\n${s.grado_nombre} sec${s.seccion_nombre}`
      : `${s.curso_nombre}\n${s.maestro_nombre}`

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="ficha-horario-download"
            disabled={details.length === 0}
            onClick={() =>
              downloadHorarioActualPdf({
                title,
                subtitle: 'Semana completa',
                slots: details,
                cellText,
                filename: 'horario-semana.pdf',
              })
            }
          >
            Descargar PDF
          </button>
        </>
      }
    >
      {details.length === 0 ? (
        <p className="texto-muted">Sin horario publicado.</p>
      ) : (
        <div className="data-table-wrap" style={{ overflowX: 'auto' }} data-testid="ficha-horario-semana">
          <table className="data-table ficha-semana-table">
            <thead>
              <tr>
                <th>Hora</th>
                {DAYS.map((d) => (
                  <th key={d}>{DIA_SHORT[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {intervals.map((iv) => (
                <tr key={iv.start}>
                  <td className="texto-muted" style={{ whiteSpace: 'nowrap' }}>
                    {iv.start}–{iv.end}
                  </td>
                  {DAYS.map((d) => {
                    const cell = byCell.get(`${d}|${iv.start}`) ?? []
                    return (
                      <td key={d}>
                        {cell.map((s) => (
                          <div key={`${s.asignacion_docente_id}-${s.hora_inicio}`} style={{ fontSize: '0.75rem' }}>
                            {cellText(s).split('\n').map((line) => (
                              <div key={line}>{line}</div>
                            ))}
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
