import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ReportesExamenTable } from '#/components/examenes/ReportesExamenTable'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { fechaCorta, horaRango, labelGradoSeccion } from '#/lib/examenes'
import { eliminarExamenReporte, listExamenReportes } from '#/services/examenes'
import type { ExamenReporte } from '#/services/examenes'

export const Route = createFileRoute('/_app/reportes-examen')({
  component: () => (
    <RequirePermission permission="examenes:get">
      <ReportesExamenStaffPage />
    </RequirePermission>
  ),
})

/**
 * Página general de reportes de examen para admin, admin temporal, director y
 * consejería. Solo lectura y eliminación; no crea ni edita.
 */
function ReportesExamenStaffPage() {
  const qc = useQueryClient()
  const { roles } = useCan()
  const permitido = roles.some((rol) =>
    ['admin', 'admin_temporal', 'director', 'consejeria'].includes(rol),
  )
  const [ver, setVer] = useState<ExamenReporte | null>(null)
  const [eliminar, setEliminar] = useState<ExamenReporte | null>(null)

  const reportesQuery = useQuery({
    queryKey: ['examenes', 'reportes', 'staff'],
    queryFn: () => listExamenReportes(),
  })

  async function confirmarEliminar() {
    if (!eliminar) return
    try {
      await eliminarExamenReporte(eliminar.id)
      toast.success('Reporte eliminado')
      setEliminar(null)
      void qc.invalidateQueries({ queryKey: ['examenes', 'reportes'] })
    } catch (error) {
      toast.error(userMessageFromError(error))
    }
  }

  const reportes = reportesQuery.data ?? []

  if (!permitido) {
    return (
      <div className="empty-state" data-testid="reportes-examen-staff-sin-permiso">
        No tienes permiso para ver todos los reportes de examen.
      </div>
    )
  }

  return (
    <div className="reportes-examen-staff" data-testid="reportes-examen-staff-page">
      <header className="reportes-examen-staff__header">
        <h1 className="page-title" style={{ margin: 0 }}>
          Reportes de examen
        </h1>
        <p className="texto-muted" style={{ margin: '0.35rem 0 0' }}>
          Todos los reportes de examen de la institución. Solo lectura y eliminación.
        </p>
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
          onVer={setVer}
          onEliminar={setEliminar}
          onNuevo={() => {}}
          canCreate={false}
          puedeEliminarTodos
        />
      )}

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
        testId="reporte-examen-staff-ver-modal"
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
            <p style={{ marginTop: '1rem' }}>{ver.detalle || 'Sin detalle.'}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
