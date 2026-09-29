import { useMemo } from 'react'
import { HorarioSemanaGrid } from '#/components/horarios/HorarioSemanaGrid'
import type { SemanaSlot } from '#/components/horarios/HorarioSemanaGrid'
import { Modal } from '#/components/ui/Modal'
import { downloadHorarioActualPdf } from '#/lib/horarioPdf'
import type { FichaSlot } from '#/services/personas'
import type { HorarioSlotDetail } from '#/services/horarios'

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

  const cellText = (s: HorarioSlotDetail) =>
    mode === 'maestro'
      ? `${s.curso_nombre}\n${s.grado_nombre} sec${s.seccion_nombre}`
      : `${s.curso_nombre}\n${s.maestro_nombre}`

  const gridSlots = useMemo<SemanaSlot[]>(
    () =>
      details.map((s) => ({
        key: `${s.asignacion_docente_id}-${s.dia_semana}-${s.hora_inicio}`,
        dia_semana: s.dia_semana,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin,
        lines:
          mode === 'maestro'
            ? [s.curso_nombre, `${s.grado_nombre} sec${s.seccion_nombre}`]
            : [s.curso_nombre, s.maestro_nombre],
      })),
    [details, mode],
  )

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
      <HorarioSemanaGrid slots={gridSlots} testId="ficha-horario-semana" />
    </Modal>
  )
}
