import { createFileRoute } from '@tanstack/react-router'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'
import { PortalPlanView } from '#/components/portal/PortalPlanView'
import { usePortalInicio } from '#/hooks/use-portal'

export const Route = createFileRoute('/_app/hijo/plan/$asignacionId')({
  component: PlanMateria,
})

function PlanMateria() {
  const { asignacionId } = Route.useParams()
  const { data } = usePortalInicio()
  const curso = data?.clases.find((c) => c.asignacion_docente_id === asignacionId)?.curso_nombre ?? 'Materia'

  return (
    <PadreScreen title={curso} testId="padre-plan-materia" backTo="/hijo/plan">
      {(alumnoId) => (
        <PortalPlanView asignacionId={asignacionId} cursoNombre={curso} alumnoId={alumnoId} sinTitulo />
      )}
    </PadreScreen>
  )
}
