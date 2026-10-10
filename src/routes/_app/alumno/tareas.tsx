import { createFileRoute } from '@tanstack/react-router'
import { AlumnoScreen } from '#/components/portal/AlumnoScreen'
import { TareasLista } from '#/components/portal/TareasLista'
import { usePortal } from '#/hooks/use-portal'

export const Route = createFileRoute('/_app/alumno/tareas')({
  component: AlumnoTareasPage,
})

function AlumnoTareasPage() {
  const { alumnoId } = usePortal()
  return (
    <AlumnoScreen title="Tareas" testId="alumno-tareas">
      <TareasLista alumnoId={alumnoId} prefix="alumno" />
    </AlumnoScreen>
  )
}
