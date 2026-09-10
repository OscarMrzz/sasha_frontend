import { createFileRoute, redirect } from '@tanstack/react-router'

/** Panel unificado en Usuarios: al crear con rol alumno/maestro/responsable se crea el perfil. */
export const Route = createFileRoute('/_app/personas')({
  beforeLoad: () => {
    throw redirect({ to: '/usuarios' })
  },
})
