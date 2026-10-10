import { createFileRoute } from '@tanstack/react-router'
import { AlumnoHorarioView } from '#/components/horarios/AlumnoHorarioView'
import { AlumnoScreen } from '#/components/portal/AlumnoScreen'
import { usePortalInicio } from '#/hooks/use-portal'

export const Route = createFileRoute('/_app/alumno/horario')({
  component: AlumnoHorarioPage,
})

function AlumnoHorarioPage() {
  const { data, isLoading, isError } = usePortalInicio()

  return (
    <AlumnoScreen title="Mi horario" testId="alumno-horario-page">
      {isLoading ? (
        <div className="empty-state">Cargando…</div>
      ) : isError || !data ? (
        <div className="empty-state">No se pudo cargar el horario.</div>
      ) : (
        <AlumnoHorarioView slots={data.horario_semana} recreo={data.recreo} title="Mi horario" />
      )}
    </AlumnoScreen>
  )
}
