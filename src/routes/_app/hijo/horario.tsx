import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ExamenHorarioView } from '#/components/examenes/ExamenHorarioView'
import { HorarioDiasView } from '#/components/horarios/HorarioDiasView'
import type { BloqueDia } from '#/components/horarios/HorarioDiasView'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'
import { SegmentedToggle } from '#/components/ui/SegmentedToggle'
import { usePortalExamenes, usePortalInicio } from '#/hooks/use-portal'

export const Route = createFileRoute('/_app/hijo/horario')({
  component: () => (
    <PadreScreen title="Horario" testId="padre-horario">
      {() => <HorarioHijo />}
    </PadreScreen>
  ),
})

function HorarioHijo() {
  const { data, isLoading, isError } = usePortalInicio()
  const examenes = usePortalExamenes()
  const [modo, setModo] = useState<'normal' | 'examenes' | null>(null)

  const bloques = useMemo<BloqueDia[]>(
    () =>
      (data?.horario_semana ?? []).map((s) => ({
        key: `${s.asignacion_docente_id}-${s.dia_semana}-${s.hora_inicio}`,
        dia: s.dia_semana,
        inicio: s.hora_inicio,
        fin: s.hora_fin,
        titulo: s.curso_nombre,
        sub: s.maestro_nombre,
      })),
    [data],
  )

  const recreo = data?.recreo
    ? { inicio: data.recreo.hora_inicio, fin: data.recreo.hora_fin }
    : null

  const hayExamenes = Boolean(
    examenes.data?.activo && (examenes.data.examenes?.length ?? 0) > 0,
  )
  const modoActivo: 'normal' | 'examenes' =
    modo ?? (examenes.data?.vigente && hayExamenes ? 'examenes' : 'normal')

  return (
    <div className="portal-horario">
      <SegmentedToggle
        value={modoActivo}
        options={[
          { value: 'normal', label: 'Horario' },
          { value: 'examenes', label: 'Exámenes' },
        ]}
        onChange={setModo}
        testId="padre-horario-modo"
        ariaLabel="Horario normal o de exámenes"
      />

      {modoActivo === 'examenes' ? (
        examenes.isLoading ? (
          <div className="empty-state">Cargando exámenes…</div>
        ) : hayExamenes && examenes.data ? (
          <ExamenHorarioView data={examenes.data} testIdPrefix="padre-examenes" />
        ) : (
          <div className="empty-state">No hay exámenes programados.</div>
        )
      ) : isLoading ? (
        <div className="empty-state">Cargando horario…</div>
      ) : isError || !data ? (
        <div className="empty-state">Hay problemas de conexión. Intente de nuevo.</div>
      ) : (
        <HorarioDiasView
          bloques={bloques}
          recreo={recreo}
          testIdPrefix="padre-horario"
          emptyText="No hay clases este día."
        />
      )}
    </div>
  )
}
