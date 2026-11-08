import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ExamenHorarioView } from '#/components/examenes/ExamenHorarioView'
import { AlumnoHorarioView } from '#/components/horarios/AlumnoHorarioView'
import { AlumnoScreen } from '#/components/portal/AlumnoScreen'
import { SegmentedToggle } from '#/components/ui/SegmentedToggle'
import { usePortalExamenes, usePortalInicio } from '#/hooks/use-portal'

export const Route = createFileRoute('/_app/alumno/horario')({
  component: AlumnoHorarioPage,
})

function AlumnoHorarioPage() {
  const { data, isLoading, isError } = usePortalInicio()
  const examenes = usePortalExamenes()
  const [modo, setModo] = useState<'normal' | 'examenes' | null>(null)

  const hayExamenes = Boolean(
    examenes.data?.activo && (examenes.data.examenes?.length ?? 0) > 0,
  )
  const modoActivo: 'normal' | 'examenes' =
    modo ?? (examenes.data?.vigente && hayExamenes ? 'examenes' : 'normal')

  return (
    <AlumnoScreen title="Mi horario" testId="alumno-horario-page">
      <div className="portal-horario">
        <SegmentedToggle
          value={modoActivo}
          options={[
            { value: 'normal', label: 'Horario' },
            { value: 'examenes', label: 'Exámenes' },
          ]}
          onChange={setModo}
          testId="alumno-horario-modo"
          ariaLabel="Horario normal o de exámenes"
        />

        {modoActivo === 'examenes' ? (
          examenes.isLoading ? (
            <div className="empty-state">Cargando exámenes…</div>
          ) : hayExamenes && examenes.data ? (
            <ExamenHorarioView data={examenes.data} testIdPrefix="alumno-examenes" />
          ) : (
            <div className="empty-state">No hay exámenes programados.</div>
          )
        ) : isLoading ? (
          <div className="empty-state">Cargando…</div>
        ) : isError || !data ? (
          <div className="empty-state">No se pudo cargar el horario.</div>
        ) : (
          <AlumnoHorarioView slots={data.horario_semana} recreo={data.recreo} title="Mi horario" />
        )}
      </div>
    </AlumnoScreen>
  )
}
