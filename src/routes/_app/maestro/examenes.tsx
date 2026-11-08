import { createFileRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, Flag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ExamenMorososModal } from '#/components/examenes/ExamenMorososModal'
import { ReporteModal } from '#/components/examenes/ReporteModal'
import type { ExamenReporteOpcion } from '#/components/examenes/ReporteModal'
import { ExamenSemanaPanel } from '#/components/examenes/ExamenSemanaPanel'
import { RequirePermission } from '#/components/gates/Can'
import { userMessageFromError } from '#/lib/api'
import { useSession } from '#/hooks/use-session'
import { getExamenOpciones, getMisExamenes } from '#/services/examenes'

export const Route = createFileRoute('/_app/maestro/examenes')({
  component: MaestroExamenesRoute,
})

/**
 * `examenes.tsx` es la ruta padre de `/maestro/examenes/ahora`. Cuando se entra
 * a la hija se renderiza solo el `Outlet`; en la ruta exacta se muestra la semana.
 */
function MaestroExamenesRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (pathname.replace(/\/$/, '') !== '/maestro/examenes') return <Outlet />

  return (
    <RequirePermission permission="examenes:get">
      <MaestroExamenesSemanaPage />
    </RequirePermission>
  )
}

function MaestroExamenesSemanaPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const [todas, setTodas] = useState(false)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [moraOpen, setMoraOpen] = useState(false)

  const mios = useQuery({
    queryKey: ['examenes', 'mios', todas],
    queryFn: () => getMisExamenes(todas),
  })
  const opciones = useQuery({
    queryKey: ['examenes', 'opciones'],
    queryFn: () => getExamenOpciones(),
  })

  const horarios = mios.data?.horarios ?? []

  const reporteOptions = useMemo<ExamenReporteOpcion[]>(() => {
    const out: ExamenReporteOpcion[] = []
    for (const horario of horarios) {
      for (const asignacion of horario.asignaciones) {
        if (!asignacion.id) continue
        out.push({
          examen_asignacion_id: asignacion.id,
          etiqueta: `${asignacion.curso_nombre} · ${asignacion.grado_nombre} ${asignacion.seccion_nombre} · ${asignacion.fecha} ${asignacion.hora_inicio}–${asignacion.hora_fin}`,
        })
      }
    }
    return out
  }, [horarios])

  return (
    <div className="maestro-examenes" data-testid="maestro-examenes-page">
      <header className="maestro-examenes__header">
        <div className="maestro-examenes__titulo">
          <h1 className="page-title" style={{ margin: 0 }}>
            Semana de exámenes
          </h1>
        </div>

        <div className="maestro-examenes__acciones">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setReporteOpen(true)}
            data-testid="maestro-examenes-reportar"
          >
            <Flag size={16} aria-hidden />
            Reportar
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setMoraOpen(true)}
            data-testid="maestro-examenes-mora"
          >
            <AlertTriangle size={16} aria-hidden />
            Mora
          </button>
        </div>
      </header>

      <button
        type="button"
        className="btn btn--primary examen-ahora__boton-grande"
        onClick={() => void navigate({ to: '/maestro/examenes/ahora' })}
        data-testid="maestro-examenes-ahora"
      >
        <Clock size={20} aria-hidden />
        Ahora
      </button>

      {mios.isLoading ? (
        <div className="empty-state">Cargando exámenes…</div>
      ) : mios.isError ? (
        <div className="empty-state" role="alert">
          {userMessageFromError(mios.error)}
        </div>
      ) : (
        <ExamenSemanaPanel
          horarios={horarios}
          grados={opciones.data?.grados ?? []}
          secciones={opciones.data?.secciones ?? []}
          codigoMaestro={session?.code}
          todas={todas}
          onTodasChange={setTodas}
        />
      )}

      <ReporteModal
        open={reporteOpen}
        onClose={() => setReporteOpen(false)}
        onSaved={() => {
          void mios.refetch()
        }}
        examenes={reporteOptions}
      />

      <ExamenMorososModal open={moraOpen} onClose={() => setMoraOpen(false)} />
    </div>
  )
}
