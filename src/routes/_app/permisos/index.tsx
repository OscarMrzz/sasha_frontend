import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import {
  claseEstadoPermiso,
  etiquetaEstadoPermiso,
  etiquetaTipoSolicitud,
  rangoPermiso,
} from '#/helpers/permisos'
import { userMessageFromError } from '#/lib/api'
import { aprobarPermiso, listSolicitudesPermiso, rechazarPermiso } from '#/services/permisos'
import type { SolicitudPermiso } from '#/services/permisos'

export const Route = createFileRoute('/_app/permisos/')({
  component: PermisosPage,
})

const col = createColumnHelper<SolicitudPermiso>()

function PermisosPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({
    queryKey: ['permisos-staff'],
    queryFn: () => listSolicitudesPermiso(),
  })
  const [detalle, setDetalle] = useState<SolicitudPermiso | null>(null)
  const [aprobar, setAprobar] = useState<SolicitudPermiso | null>(null)
  const [rechazar, setRechazar] = useState<SolicitudPermiso | null>(null)
  const [motivo, setMotivo] = useState('')

  const aprobarMut = useMutation({
    mutationFn: (s: SolicitudPermiso) => aprobarPermiso(s.id),
    onSuccess: () => {
      toast.success('Permiso aprobado; la asistencia quedó justificada')
      qc.invalidateQueries({ queryKey: ['permisos-staff'] })
      setAprobar(null)
      setDetalle(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const rechazarMut = useMutation({
    mutationFn: ({ id, motivo: texto }: { id: string; motivo: string }) => rechazarPermiso(id, texto),
    onSuccess: () => {
      toast.success('Permiso rechazado')
      qc.invalidateQueries({ queryKey: ['permisos-staff'] })
      setRechazar(null)
      setMotivo('')
      setDetalle(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('alumno_nombre', { header: 'Alumno' }),
      col.accessor((r) => rangoPermiso(r.fecha_inicio, r.fecha_fin), {
        id: 'fechas',
        header: 'Fechas',
      }),
      col.accessor((r) => r.tipos.map((t) => t.nombre).join(', '), {
        id: 'motivos',
        header: 'Motivos',
      }),
      col.accessor((r) => etiquetaEstadoPermiso(r.estado), {
        id: 'estado',
        header: 'Estado',
        cell: (i) => <span className={`estado-pill ${claseEstadoPermiso(i.row.original.estado)}`}>{i.getValue()}</span>,
      }),
      col.accessor('creado_en', { header: 'Registrada' }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      {
        id: 'estado',
        label: 'Estado',
        getValue: (r: SolicitudPermiso) => etiquetaEstadoPermiso(r.estado),
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando permisos…</div>

  return (
    <RequirePermission permission="permisos_admin:get">
      <div data-testid="permisos-page">
        <DataTable
          title="Permisos"
          data={data}
          columns={columns}
          filters={filters}
          exportFilename="permisos"
          exportRows={data.map((s) => ({
            alumno: s.alumno_nombre,
            fechas: rangoPermiso(s.fecha_inicio, s.fecha_fin),
            motivos: s.tipos.map((t) => t.nombre).join(', '),
            estado: etiquetaEstadoPermiso(s.estado),
          }))}
          onRowDoubleClick={(row) => setDetalle(row)}
        />
        {can('tipos_permiso:get') ? (
          <div style={{ marginTop: '1rem' }}>
            <Link to="/permisos/tipos" className="btn btn--ghost">
              Tipos de permiso
            </Link>
          </div>
        ) : null}
      </div>

      {detalle ? (
        <Modal
          open
          title="Solicitud de permiso"
          wide
          testId="permiso-detalle"
          onClose={() => setDetalle(null)}
          footer={
            detalle.estado === 'pendiente' ? (
              <>
                <button
                  type="button"
                  className="btn btn--ghost"
                  data-testid="permiso-rechazar"
                  onClick={() => setRechazar(detalle)}
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  data-testid="permiso-aprobar"
                  onClick={() => setAprobar(detalle)}
                >
                  Aprobar
                </button>
              </>
            ) : (
              <button type="button" className="btn btn--ghost" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            )
          }
        >
          <div className="expediente">
            <section className="expediente__seccion">
              <h3 className="expediente__titulo">Alumno</h3>
              <p style={{ margin: 0 }}>
                {detalle.alumno_nombre} · {detalle.alumno_codigo}
              </p>
              <p className="texto-muted" style={{ margin: 0 }}>
                {detalle.grado} sección {detalle.seccion}
              </p>
            </section>
            <section className="expediente__seccion">
              <h3 className="expediente__titulo">Solicitud</h3>
              <p style={{ margin: 0 }}>
                {etiquetaTipoSolicitud(detalle.tipo_solicitud)} · {rangoPermiso(detalle.fecha_inicio, detalle.fecha_fin)}
              </p>
              <p className="texto-muted" style={{ margin: 0 }}>
                Enviada por {detalle.solicitado_por}
              </p>
            </section>
            <section className="expediente__seccion">
              <h3 className="expediente__titulo">Motivos</h3>
              <p style={{ margin: 0 }}>{detalle.tipos.map((t) => t.nombre).join(', ')}</p>
            </section>
            <section className="expediente__seccion">
              <h3 className="expediente__titulo">Detalle</h3>
              <p style={{ margin: 0 }}>{detalle.detalle}</p>
            </section>
            {detalle.adjunto_object_key ? (
              <section className="expediente__seccion">
                <h3 className="expediente__titulo">Adjunto</h3>
                <a
                  href={`/api/boveda/object?key=${encodeURIComponent(detalle.adjunto_object_key)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--ghost btn--sm"
                >
                  Ver adjunto
                </a>
              </section>
            ) : null}
            {detalle.motivo_rechazo ? (
              <section className="expediente__seccion">
                <h3 className="expediente__titulo">Motivo del rechazo</h3>
                <p style={{ margin: 0 }}>{detalle.motivo_rechazo}</p>
              </section>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {rechazar ? (
        <Modal
          open
          title="Rechazar permiso"
          testId="permiso-rechazo-modal"
          onClose={() => {
            setRechazar(null)
            setMotivo('')
          }}
          footer={
            <>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setRechazar(null)
                  setMotivo('')
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                data-testid="permiso-rechazo-confirmar"
                disabled={!motivo.trim() || rechazarMut.isPending}
                onClick={() => rechazarMut.mutate({ id: rechazar.id, motivo })}
              >
                Rechazar
              </button>
            </>
          }
        >
          <Field label="Motivo del rechazo" htmlFor="permiso-motivo">
            <textarea
              id="permiso-motivo"
              className="field__input"
              rows={3}
              data-testid="permiso-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Field>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(aprobar)}
        title="Aprobar permiso"
        message={`¿Aprobar el permiso de ${aprobar?.alumno_nombre ?? ''}? La asistencia de esos días quedará justificada.`}
        confirmLabel="Aprobar"
        confirmDisabled={aprobarMut.isPending}
        testId="permiso-aprobar-confirmar"
        onConfirm={() => aprobar && aprobarMut.mutate(aprobar)}
        onCancel={() => setAprobar(null)}
      />
    </RequirePermission>
  )
}
