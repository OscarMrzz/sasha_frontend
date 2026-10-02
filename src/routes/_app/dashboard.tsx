import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useCan } from '#/components/gates/Can'
import { CoordinasAviso } from '#/components/coordinaciones/CoordinasAviso'
import { AvisoBanner } from '#/components/layout/AvisoBanner'
import { homePathForRoles, isPortalRole } from '#/lib/home-path'
import { getConfiguracion } from '#/services/configuracion'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { roles } = useCan()
  const { data } = useQuery({
    queryKey: ['configuracion'],
    queryFn: getConfiguracion,
    enabled: !isPortalRole(roles),
  })
  if (isPortalRole(roles)) return <Navigate to={homePathForRoles(roles)} replace />
  const institucion = data?.nombre_institucion?.trim() || 'Institución'

  return (
    <div>
      <h1 className="page-title">Inicio</h1>
      <AvisoBanner />
      <h2 className="texto-title" style={{ marginTop: 0, fontSize: '1.5rem' }}>
        Bienvenido a Sasha — {institucion}
      </h2>
      <div style={{ marginTop: '1rem', maxWidth: '48rem' }}>
        <CoordinasAviso />
      </div>
    </div>
  )
}
