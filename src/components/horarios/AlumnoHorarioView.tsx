import { useMemo } from 'react'
import { HorarioDiasView } from '#/components/horarios/HorarioDiasView'
import type { BloqueDia } from '#/components/horarios/HorarioDiasView'
import { HorarioSemanaGrid } from '#/components/horarios/HorarioSemanaGrid'
import type { SemanaRecreo, SemanaSlot } from '#/components/horarios/HorarioSemanaGrid'
import { useEsMovil } from '#/hooks/use-media-query'
import type { PortalHorarioSlot, PortalRecreo } from '#/services/portal'

/**
 * Horario semanal del alumno; con `asignacionId` solo muestra los bloques de esa clase.
 * En teléfono/tablet se ve por días (igual que el padre); en escritorio, la semana en tabla.
 */
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
  const esMovil = useEsMovil()

  const visibles = useMemo(
    () => slots.filter((s) => !asignacionId || s.asignacion_docente_id === asignacionId),
    [slots, asignacionId],
  )

  const gridSlots = useMemo<SemanaSlot[]>(
    () =>
      visibles.map((s) => ({
        key: `${s.asignacion_docente_id}-${s.dia_semana}-${s.hora_inicio}`,
        dia_semana: s.dia_semana,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin,
        lines: [s.curso_nombre, s.maestro_nombre],
      })),
    [visibles],
  )

  const bloques = useMemo<BloqueDia[]>(
    () =>
      visibles.map((s) => ({
        key: `${s.asignacion_docente_id}-${s.dia_semana}-${s.hora_inicio}`,
        dia: s.dia_semana,
        inicio: s.hora_inicio.slice(0, 5),
        fin: s.hora_fin.slice(0, 5),
        titulo: s.curso_nombre,
        sub: s.maestro_nombre,
      })),
    [visibles],
  )

  const recesos = useMemo<SemanaRecreo[]>(
    () => (recreo ? [{ start: recreo.hora_inicio, end: recreo.hora_fin }] : []),
    [recreo],
  )

  const recreoDia = recreo
    ? { inicio: recreo.hora_inicio.slice(0, 5), fin: recreo.hora_fin.slice(0, 5) }
    : null

  return (
    <section data-testid="alumno-horario">
      <h2 className="portal-home__section-title">{title}</h2>
      {esMovil ? (
        <HorarioDiasView
          bloques={bloques}
          recreo={recreoDia}
          testIdPrefix="alumno-horario"
          emptyText="Sin horario publicado para este periodo."
        />
      ) : (
        <HorarioSemanaGrid
          slots={gridSlots}
          recesos={recesos}
          testId="alumno-horario-semana"
          emptyText="Sin horario publicado para este periodo."
        />
      )}
    </section>
  )
}
