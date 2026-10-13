import { createFileRoute } from '@tanstack/react-router'
import { AlumnoScreen } from '#/components/portal/AlumnoScreen'
import { FichasLista } from '#/components/portal/FichasLista'
import { usePortal } from '#/hooks/use-portal'

export const Route = createFileRoute('/_app/alumno/fichas')({
  component: AlumnoFichasPage,
})

function AlumnoFichasPage() {
  const { alumnoId } = usePortal()
  return (
    <AlumnoScreen title="Fichas disciplinarias" testId="alumno-fichas">
      <FichasLista alumnoId={alumnoId} esAlumno />
    </AlumnoScreen>
  )
}
