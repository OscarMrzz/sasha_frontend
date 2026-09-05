import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getConfiguracion } from '#/services/configuracion'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data } = useQuery({
    queryKey: ['configuracion'],
    queryFn: getConfiguracion,
  })
  const institucion = data?.nombre_institucion?.trim() || 'Institución'

  return (
    <div>
      <h1 className="page-title">Inicio</h1>
      <h2 className="texto-title" style={{ marginTop: 0, fontSize: '1.5rem' }}>
        Bienvenido a Sasha — {institucion}
      </h2>
    </div>
  )
}
