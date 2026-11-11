import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ExamenAhoraPanel } from '#/components/examenes/ExamenAhoraPanel'
import { ExamenAhoraAlertas } from '#/components/examenes/ExamenAhoraAlertas'
import { ReporteModal } from '#/components/examenes/ReporteModal'
import { RequirePermission } from '#/components/gates/Can'
import { userMessageFromError } from '#/lib/api'
import { fechaCorta, horaRango, labelGradoSeccion } from '#/lib/examenes'
import { getExamenesAhora } from '#/services/examenes'
import type { ExamenAhora } from '#/services/examenes'
import { localConsulta } from '#/services/personas'

export const Route = createFileRoute('/_app/maestro/examenes/ahora')({
  component: () => (
    <RequirePermission permission="examenes:get">
      <MaestroExamenAhoraPage />
    </RequirePermission>
  ),
})

type ReporteDesdeAhora = {
  examen: ExamenAhora
  codigo?: string
}

function MaestroExamenAhoraPage() {
  const navigate = useNavigate()
  const [reporte, setReporte] = useState<ReporteDesdeAhora | null>(null)

  const consulta = useQuery({
    queryKey: ['examenes', 'ahora'],
    queryFn: () => getExamenesAhora(localConsulta()),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: 'always',
    retry: false,
  })

  const examenesReporte = useMemo(
    () =>
      reporte
        ? [
            {
              examen_asignacion_id: reporte.examen.examen_asignacion_id,
              etiqueta: [
                reporte.examen.curso_nombre,
                labelGradoSeccion(
                  reporte.examen.grado_nombre,
                  reporte.examen.seccion_nombre,
                ),
                fechaCorta(reporte.examen.fecha),
                horaRango(reporte.examen.hora_inicio, reporte.examen.hora_fin),
              ]
                .filter(Boolean)
                .join(' · '),
            },
          ]
        : [],
    [reporte],
  )

  return (
    <div className="maestro-examenes" data-testid="maestro-examenes-ahora-page">
      <header className="maestro-examenes__header">
        <div className="maestro-examenes__titulo">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void navigate({ to: '/maestro/examenes' })}
            data-testid="maestro-ahora-volver"
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
              : 'Examen del bloque actual de tus secciones.'}
          </p>
        </div>
      </header>

      <button
        type="button"
        className="btn btn--primary examen-ahora__boton-grande"
        onClick={() => void consulta.refetch()}
        disabled={consulta.isFetching}
        data-testid="maestro-ahora-boton"
      >
        <RefreshCw size={20} aria-hidden />
        {consulta.isFetching ? 'Actualizando…' : 'Ahora'}
      </button>

      <ExamenAhoraAlertas examenes={consulta.data?.examenes ?? []} />

      {consulta.isLoading ? (
        <div className="empty-state">Buscando el examen actual…</div>
      ) : consulta.isError ? (
        <div className="empty-state" role="alert">
          {userMessageFromError(consulta.error)}
        </div>
      ) : (
        <ExamenAhoraPanel
          data={consulta.data ?? null}
          loading={consulta.isFetching}
          onReportar={(examen, codigo) => setReporte({ examen, codigo })}
        />
      )}

      <ReporteModal
        open={Boolean(reporte)}
        onClose={() => setReporte(null)}
        onSaved={() => setReporte(null)}
        examenes={examenesReporte}
        defaultExamenId={reporte?.examen.examen_asignacion_id}
        defaultCodigo={reporte?.codigo}
      />
    </div>
  )
}
