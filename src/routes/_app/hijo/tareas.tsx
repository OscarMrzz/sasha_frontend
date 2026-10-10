import { createFileRoute } from '@tanstack/react-router'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'
import { TareasLista } from '#/components/portal/TareasLista'

export const Route = createFileRoute('/_app/hijo/tareas')({
  component: () => (
    <PadreScreen title="Tareas" testId="padre-tareas">
      {(alumnoId) => <TareasLista alumnoId={alumnoId} prefix="padre" />}
    </PadreScreen>
  ),
})
