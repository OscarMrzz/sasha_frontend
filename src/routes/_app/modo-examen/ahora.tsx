import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { ExamenAhoraAlertas } from '#/components/examenes/ExamenAhoraAlertas'
import { ExamenAhoraStaffPanel } from '#/components/examenes/ExamenAhoraStaffPanel'
import { useSession } from '#/hooks/use-session'
import { userMessageFromError } from '#/lib/api'
import { fechaCorta } from '#/lib/examenes'
import { getExamenesSupervisionAhora } from '#/services/examenes'
import { localConsulta } from '#/services/personas'

export const Route = createFileRoute('/_app/modo-examen/ahora')({
  component: ModoExamenAhoraPage,
})

function ModoExamenAhoraPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const consulta = useQuery({
    queryKey: [
      'examenes',
      'supervision',
      'ahora',
      session?.code,
      session?.knownRoles[0],
    ],
    queryFn: () => getExamenesSupervisionAhora(localConsulta()),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: 'always',
    retry: false,
  })
  return (
    <div
      className="maestro-examenes"
      data-testid="supervision-examenes-ahora-page"
    >
      <header className="maestro-examenes__header">
        <div className="maestro-examenes__titulo">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void navigate({ to: '/modo-examen' })}
          >
            <ArrowLeft size={16} aria-hidden />
            Semana
          </button>
          <h1 className="page-title" style={{ margin: '0.75rem 0 0' }}>
            Ahora
          </h1>
          <p className="texto-muted" style={{ margin: '0.35rem 0 0' }}>
            {consulta.data
              ? `${fechaCorta(consulta.data.fecha)} · ${consulta.data.hora}`
              : 'Exámenes del bloque actual.'}
          </p>
        </div>
      </header>
      <button
        type="button"
        className="btn btn--primary examen-ahora__boton-grande"
        onClick={() => void consulta.refetch()}
        disabled={consulta.isFetching}
        data-testid="supervision-ahora-boton"
      >
        <RefreshCw size={20} aria-hidden />
        {consulta.isFetching ? 'Actualizando…' : 'Ahora'}
      </button>
      <ExamenAhoraAlertas examenes={consulta.data?.examenes ?? []} />
      {consulta.isLoading ? (
        <div className="empty-state">Buscando los exámenes actuales…</div>
      ) : consulta.isError ? (
        <div className="empty-state" role="alert">
          {userMessageFromError(consulta.error)}
        </div>
      ) : consulta.data ? (
        <ExamenAhoraStaffPanel data={consulta.data} />
      ) : null}
    </div>
  )
}
