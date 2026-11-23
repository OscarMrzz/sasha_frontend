import { createFileRoute } from '@tanstack/react-router'
import { PrematriculaPortal } from '#/components/prematricula/PrematriculaPortal'

export const Route = createFileRoute('/prematricula')({
  ssr: false,
  component: PrematriculaPortal,
})
