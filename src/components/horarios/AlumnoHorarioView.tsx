import { useMemo } from 'react'
import { HorarioSemanaGrid } from '#/components/horarios/HorarioSemanaGrid'
import type { SemanaRecreo, SemanaSlot } from '#/components/horarios/HorarioSemanaGrid'
import type { PortalHorarioSlot, PortalRecreo } from '#/services/portal'

/** Horario semanal del alumno; con `asignacionId` solo muestra los bloques de esa clase. */
export function AlumnoHorarioView({
  slots,
  recreo,
  asignacionId,
  title = 'Mi horario',
}: {
  slots: PortalHorarioSlot[]
  recreo?: PortalRecreo | null
  asignacionId?: string | null
  title?: string
}) {
  const gridSlots = useMemo<SemanaSlot[]>(
    () =>
      slots
        .filter((s) => !asignacionId || s.asignacion_docente_id === asignacionId)
        .map((s) => ({
          key: `${s.asignacion_docente_id}-${s.dia_semana}-${s.hora_inicio}`,
          dia_semana: s.dia_semana,
          hora_inicio: s.hora_inicio,
          hora_fin: s.hora_fin,
          lines: [s.curso_nombre, s.maestro_nombre],
        })),
    [slots, asignacionId],
  )

  const recesos = useMemo<SemanaRecreo[]>(
    () => (recreo ? [{ start: recreo.hora_inicio, end: recreo.hora_fin }] : []),
    [recreo],
  )

  return (
    <section data-testid="alumno-horario">
      <h2 className="portal-home__section-title">{title}</h2>
      <HorarioSemanaGrid
        slots={gridSlots}
        recesos={recesos}
        testId="alumno-horario-semana"
        emptyText="Sin horario publicado para este periodo."
      />
    </section>
  )
}
