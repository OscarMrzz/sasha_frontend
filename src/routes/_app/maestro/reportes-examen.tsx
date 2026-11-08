import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ReporteModal } from '#/components/examenes/ReporteModal'
import type { ExamenReporteOpcion } from '#/components/examenes/ReporteModal'
import { ReportesExamenTable } from '#/components/examenes/ReportesExamenTable'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { fechaCorta, horaRango, labelGradoSeccion } from '#/lib/examenes'
import { useSession } from '#/hooks/use-session'
import {
  eliminarExamenReporte,
  getMisExamenes,
  listExamenReportes,
} from '#/services/examenes'
import type { ExamenReporte } from '#/services/examenes'

export const Route = createFileRoute('/_app/maestro/reportes-examen')({
  component: () => (
    <RequirePermission permission="examenes:get">
      <MaestroReportesExamenPage />
    </RequirePermission>
  ),
})

function MaestroReportesExamenPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { can } = useCan()
  const { session } = useSession()

  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [editando, setEditando] = useState<ExamenReporte | null>(null)
  const [ver, setVer] = useState<ExamenReporte | null>(null)
  const [eliminar, setEliminar] = useState<ExamenReporte | null>(null)

  const reportesQuery = useQuery({
    queryKey: ['examenes', 'reportes'],
    queryFn: () => listExamenReportes(),
  })
  const miosQuery = useQuery({
    queryKey: ['examenes', 'mios', true],
    queryFn: () => getMisExamenes(true),
  })

  const examenes = useMemo<ExamenReporteOpcion[]>(() => {
    const map = new Map<string, ExamenReporteOpcion>()
    for (const horario of miosQuery.data?.horarios ?? []) {
      for (const asignacion of horario.asignaciones) {
        if (!asignacion.id) continue
        map.set(asignacion.id, {
          examen_asignacion_id: asignacion.id,
          etiqueta: [
            asignacion.curso_nombre,
            labelGradoSeccion(asignacion.grado_nombre, asignacion.seccion_nombre),
            fechaCorta(asignacion.fecha),
            horaRango(asignacion.hora_inicio, asignacion.hora_fin),
          ]
            .filter(Boolean)
            .join(' · '),
        })
      }
    }
    return [...map.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'))
  }, [miosQuery.data])

  function invalidar() {
    void qc.invalidateQueries({ queryKey: ['examenes', 'reportes'] })
  }

  async function confirmarEliminar() {
    if (!eliminar) return
    try {
      await eliminarExamenReporte(eliminar.id)
      toast.success('Reporte eliminado')
      setEliminar(null)
      invalidar()
    } catch (error) {
      toast.error(userMessageFromError(error))
    }
  }

  const reportes = reportesQuery.data ?? []

  return (
    <div className="maestro-examenes" data-testid="maestro-reportes-examen-page">
      <header className="maestro-examenes__header">
        <div className="maestro-examenes__titulo">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void navigate({ to: '/maestro/examenes' })}
            data-testid="maestro-reportes-volver"
          >
            <ArrowLeft size={16} aria-hidden />
            Semana
          </button>
          <h1 className="page-title" style={{ margin: '0.75rem 0 0' }}>
            Reportes de examen
          </h1>
          <p className="texto-muted" style={{ margin: '0.35rem 0 0' }}>
            Incidencias de alumnos durante los exámenes de tus materias.
          </p>
        </div>

        <div className="maestro-examenes__acciones">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setNuevoOpen(true)}
            disabled={!can('examenes:reportar')}
            data-testid="maestro-reportes-nuevo"
          >
            <Plus size={16} aria-hidden />
            Nuevo reporte
          </button>
        </div>
      </header>

      {reportesQuery.isLoading ? (
        <div className="empty-state">Cargando reportes…</div>
      ) : reportesQuery.isError ? (
        <div className="empty-state" role="alert">
          {userMessageFromError(reportesQuery.error)}
        </div>
      ) : (
        <ReportesExamenTable
          reportes={reportes}
          codigoActual={session?.code}
          onVer={setVer}
          onEditar={setEditando}
          onEliminar={setEliminar}
          onNuevo={() => setNuevoOpen(true)}
          canCreate={can('examenes:reportar')}
        />
      )}

      <ReporteModal
        open={nuevoOpen || Boolean(editando)}
        onClose={() => {
          setNuevoOpen(false)
          setEditando(null)
        }}
        onSaved={() => {
          setNuevoOpen(false)
          setEditando(null)
          invalidar()
        }}
        examenes={examenes}
        reporte={editando}
      />

      <ConfirmDialog
        open={Boolean(eliminar)}
        title="Eliminar reporte"
        message={
          eliminar
            ? `¿Eliminar el reporte de ${eliminar.nombre} en ${eliminar.curso_nombre}?`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={() => void confirmarEliminar()}
        onCancel={() => setEliminar(null)}
      />

      <Modal
        open={Boolean(ver)}
        title="Reporte de examen"
        onClose={() => setVer(null)}
        testId="reporte-examen-ver-modal"
        footer={
          <button type="button" className="btn btn--ghost" onClick={() => setVer(null)}>
            Cerrar
          </button>
        }
      >
        {ver ? (
          <div className="reporte-modal__resumen">
            <p>
              <strong>{ver.nombre}</strong> · Código {ver.codigo}
            </p>
            <p className="texto-muted">
              {ver.curso_nombre} · {labelGradoSeccion(ver.grado, ver.seccion)}
            </p>
            <p className="texto-muted">
              {fechaCorta(ver.fecha)} · {horaRango(ver.hora_inicio, ver.hora_fin)}
            </p>
            <p className="texto-muted">Supervisor: {ver.supervisor || '—'}</p>
            <p className="texto-muted">
              Reportó: {ver.autor_nombre || ver.autor_codigo}
            </p>
            <p style={{ marginTop: '1rem' }}>
              {ver.detalle || 'Sin detalle.'}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
