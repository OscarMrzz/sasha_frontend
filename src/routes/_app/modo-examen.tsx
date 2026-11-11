import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { ExamenSemanaPanel } from '#/components/examenes/ExamenSemanaPanel'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { useSession } from '#/hooks/use-session'
import { userMessageFromError } from '#/lib/api'
import { puedeSupervisarExamenes } from '#/lib/examenes-supervision'
import { getExamenesSupervisionSemana } from '#/services/examenes'

export const Route = createFileRoute('/_app/modo-examen')({
  component: ModoExamenRoute,
})

function ModoExamenRoute() {
  const { roles } = useCan()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (!puedeSupervisarExamenes(roles)) {
    return (
      <div className="empty-state" role="alert">
        No tienes acceso al modo examen de supervisión.
      </div>
    )
  }
  return (
    <RequirePermission permission="examenes:get">
      {pathname.replace(/\/$/, '') === '/modo-examen' ? (
        <ModoExamenSemanaPage />
      ) : (
        <Outlet />
      )}
    </RequirePermission>
  )
}

function ModoExamenSemanaPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const consulta = useQuery({
    queryKey: [
      'examenes',
      'supervision',
      'semana',
      session?.code,
      session?.knownRoles[0],
    ],
    queryFn: () => getExamenesSupervisionSemana(),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  return (
    <div className="maestro-examenes" data-testid="supervision-examenes-page">
      <header className="maestro-examenes__header">
        <h1 className="page-title" style={{ margin: 0 }}>
          Semana de exámenes
        </h1>
      </header>
      <button
        type="button"
        className="btn btn--primary examen-ahora__boton-grande"
        onClick={() => void navigate({ to: '/modo-examen/ahora' })}
        data-testid="supervision-examenes-ahora"
      >
        <Clock size={20} aria-hidden />
        Ahora
      </button>
      {consulta.isLoading ? (
        <div className="empty-state">Cargando exámenes…</div>
      ) : consulta.isError ? (
        <div className="empty-state" role="alert">
          {userMessageFromError(consulta.error)}
        </div>
      ) : (
        <ExamenSemanaPanel horarios={consulta.data?.horarios ?? []} />
      )}
    </div>
  )
}
