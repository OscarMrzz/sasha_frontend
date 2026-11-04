import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import {
  claseEstadoPermiso,
  diasPermiso,
  etiquetaEstadoPermiso,
  etiquetaTipoSolicitud,
  formatearFechaPermiso,
  rangoPermiso,
} from '#/helpers/permisos'
import { userMessageFromError } from '#/lib/api'
import { aprobarPermiso, listSolicitudesPermiso, rechazarPermiso } from '#/services/permisos'
import type { SolicitudPermiso } from '#/services/permisos'

export const Route = createFileRoute('/_app/solicitud-permisos')({
  component: SolicitudesPermisoPage,
})

const col = createColumnHelper<SolicitudPermiso>()

type Detalle = { solicitud: SolicitudPermiso; modo: 'ver' | 'validar' }

function SolicitudesPermisoPage() {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['permisos-staff'],
    queryFn: () => listSolicitudesPermiso(),
  })
  const [detalle, setDetalle] = useState<Detalle | null>(null)
  const [aprobar, setAprobar] = useState<SolicitudPermiso | null>(null)
  const [rechazar, setRechazar] = useState<SolicitudPermiso | null>(null)
  const [motivo, setMotivo] = useState('')
  const [ctx, setCtx] = useState<{ x: number; y: number; row: SolicitudPermiso } | null>(null)

  const cerrarCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', cerrarCtx)
    return () => window.removeEventListener('click', cerrarCtx)
  }, [ctx, cerrarCtx])

  const abrir = (solicitud: SolicitudPermiso, modo: Detalle['modo']) => {
    setDetalle({ solicitud, modo })
    cerrarCtx()
  }

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
        cell: (i) => (
          <span className={`estado-pill ${claseEstadoPermiso(i.row.original.estado)}`}>
            {i.getValue()}
          </span>
        ),
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

  if (isLoading) return <div className="empty-state">Cargando solicitudes…</div>

  return (
    <RequirePermission permission="permisos_admin:get">
      <div data-testid="solicitud-permisos-page">
        <DataTable
          title="Solicitudes de permiso"
          data={data}
          columns={columns}
          filters={filters}
          exportFilename="solicitudes-de-permiso"
          exportRows={data.map((s) => ({
            alumno: s.alumno_nombre,
            fechas: rangoPermiso(s.fecha_inicio, s.fecha_fin),
            motivos: s.tipos.map((t) => t.nombre).join(', '),
            estado: etiquetaEstadoPermiso(s.estado),
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          onRowDoubleClick={(row) => abrir(row, 'ver')}
        />
        <p className="texto-muted" style={{ marginTop: '0.85rem' }}>
          Clic derecho sobre una fila para ver o validar.
        </p>
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="permisos-ctx">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="permisos-ctx-ver"
            onClick={() => abrir(ctx.row, 'ver')}
          >
            Ver
          </button>
          {ctx.row.estado === 'pendiente' ? (
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="permisos-ctx-validar"
              onClick={() => abrir(ctx.row, 'validar')}
            >
              Validar
            </button>
          ) : null}
        </div>
      ) : null}

      {detalle ? (
        <DetallePermiso
          solicitud={detalle.solicitud}
          modo={detalle.modo}
          onCerrar={() => setDetalle(null)}
          onAprobar={() => setAprobar(detalle.solicitud)}
          onRechazar={() => setRechazar(detalle.solicitud)}
        />
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

function DetallePermiso({
  solicitud,
  modo,
  onCerrar,
  onAprobar,
  onRechazar,
}: {
  solicitud: SolicitudPermiso
  modo: 'ver' | 'validar'
  onCerrar: () => void
  onAprobar: () => void
  onRechazar: () => void
}) {
  const pendiente = solicitud.estado === 'pendiente'
  const puedeValidar = modo === 'validar' && pendiente

  return (
    <Modal
      open
      title={puedeValidar ? 'Validar solicitud' : 'Detalle de la solicitud'}
      wide
      testId="permiso-detalle"
      onClose={onCerrar}
      footer={
        puedeValidar ? (
          <>
            <button
              type="button"
              className="btn btn--ghost"
              data-testid="permiso-rechazar"
              onClick={onRechazar}
            >
              Rechazar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="permiso-aprobar"
              onClick={onAprobar}
            >
              Aprobar
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={onCerrar}>
            Cerrar
          </button>
        )
      }
    >
      <div className="permiso-detalle">
        <div className="permiso-detalle__resumen">
          <span className={`estado-pill ${claseEstadoPermiso(solicitud.estado)}`}>
            {etiquetaEstadoPermiso(solicitud.estado)}
          </span>
          <h3>{solicitud.tipos.map((t) => t.nombre).join(' + ')}</h3>
          <p>
            Del <strong>{formatearFechaPermiso(solicitud.fecha_inicio)}</strong> al{' '}
            <strong>{formatearFechaPermiso(solicitud.fecha_fin)}</strong>
          </p>
          <p className="texto-muted">
            {diasPermiso(solicitud.fecha_inicio, solicitud.fecha_fin)} día
            {diasPermiso(solicitud.fecha_inicio, solicitud.fecha_fin) === 1 ? '' : 's'} ·{' '}
            {etiquetaTipoSolicitud(solicitud.tipo_solicitud)}
          </p>
        </div>

        <div className="permiso-detalle__grid">
          <section>
            <h4>Alumno</h4>
            <p>{solicitud.alumno_nombre}</p>
            <p className="texto-muted">
              {solicitud.alumno_codigo} · {solicitud.grado} sección {solicitud.seccion}
            </p>
          </section>
          <section>
            <h4>Responsable</h4>
            <p>{solicitud.solicitado_por}</p>
            <p className="texto-muted">Código {solicitud.solicitado_por_codigo || '—'}</p>
          </section>
        </div>

        <section>
          <h4>Motivo</h4>
          <div className="permiso-detalle__chips">
            {solicitud.tipos.map((t) => (
              <span key={t.id} className="badge">
                {t.nombre}
              </span>
            ))}
          </div>
          <p>{solicitud.detalle}</p>
        </section>

        {solicitud.adjunto_object_key ? (
          <section>
            <h4>Adjunto</h4>
            <a
              href={`/api/boveda/object?key=${encodeURIComponent(solicitud.adjunto_object_key)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn--ghost btn--sm"
            >
              Ver adjunto
            </a>
          </section>
        ) : null}

        {solicitud.motivo_rechazo ? (
          <section>
            <h4>Motivo del rechazo</h4>
            <p>{solicitud.motivo_rechazo}</p>
          </section>
        ) : null}
      </div>
    </Modal>
  )
}
