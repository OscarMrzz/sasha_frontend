import { createFileRoute } from '@tanstack/react-router'
import { FichasLista } from '#/components/portal/FichasLista'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'

export const Route = createFileRoute('/_app/hijo/fichas')({
  component: () => (
    <PadreScreen title="Fichas disciplinarias" testId="padre-fichas">
      {(alumnoId) => <FichasLista alumnoId={alumnoId} />}
    </PadreScreen>
  ),
})
