import { RegistrarPagoModal } from '#/components/pagos/RegistrarPagoModal'
import { refrescarPagos } from '#/components/pagos/refrescar-pagos'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { fechaCorta, lempiras } from '#/lib/fechas-padre'
import {
  ESTADO_MENSUALIDAD_LABEL,
  anularMensualidad,
  listMensualidades,
} from '#/services/pagos'
import type { EstadoMensualidad, MensualidadFila } from '#/services/pagos'

export const Route = createFileRoute('/_app/pagos')({
  component: PagosPage,
  validateSearch: (s: Record<string, unknown>): { alumno?: string } =>
    s.alumno === undefined || s.alumno === ''
      ? {}
      : { alumno: String(s.alumno) },
})

const col = createColumnHelper<MensualidadFila>()

const ESTADO_BADGE: Record<EstadoMensualidad, string> = {
  pendiente: 'badge badge--muted',
  pagado: 'badge badge--ok',
  mora: 'badge badge--danger',
}

const ORIGEN_LABEL = { caja: 'Caja', recibo: 'Recibo del padre' } as const

function EstadoBadge({ estado }: { estado: EstadoMensualidad }) {
  return (
    <span className={ESTADO_BADGE[estado]}>
      {ESTADO_MENSUALIDAD_LABEL[estado]}
    </span>
  )
}

function PagosPage() {
  const { can } = useCan()
  const navigate = useNavigate()
  const { alumno } = Route.useSearch()
  const { data = [], isLoading } = useQuery({
    queryKey: ['mensualidades'],
    queryFn: () => listMensualidades(),
  })

  const [ctx, setCtx] = useState<{
    x: number
    y: number
    row: MensualidadFila
  } | null>(null)
  const [ver, setVer] = useState<MensualidadFila | null>(null)
  const [editar, setEditar] = useState<MensualidadFila | null>(null)
  const [anular, setAnular] = useState<MensualidadFila | null>(null)
  const [registrar, setRegistrar] = useState<{ code?: string } | null>(null)

  useEffect(() => {
    if (alumno) setRegistrar({ code: alumno })
  }, [alumno])

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const columns = useMemo(
    () => [
      col.accessor((r) => `${r.alumno_nombre} ${r.alumno_codigo}`, {
        id: 'alumno_nombre',
        header: 'Alumno',
        cell: (i) => (
          <>
            {i.row.original.alumno_nombre}
            <span
              className="texto-muted"
              style={{ display: 'block', fontSize: '0.78rem' }}
            >
              {i.row.original.alumno_codigo}
            </span>
          </>
        ),
      }),
      col.accessor(
        (r) => [r.grado, r.seccion].filter(Boolean).join(' · ') || '—',
        { id: 'grado', header: 'Grado' },
      ),
      col.accessor('tipo_nombre', {
        header: 'Tipo',
        cell: (i) => (
          <span
            className="badge badge--muted"
            data-testid={`pago-tipo-${i.row.original.obligacion_id}`}
          >
            {i.getValue()}
          </span>
        ),
      }),
      col.accessor((r) => r.etiqueta, { id: 'mes', header: 'Concepto' }),
      col.accessor('total', {
        header: 'Monto',
        cell: (i) => lempiras(i.getValue()),
      }),
      col.accessor('fecha_vencimiento', {
        header: 'Vence',
        cell: (i) => fechaCorta(i.getValue()),
      }),
      col.accessor('estado', {
        header: 'Estado',
        cell: (i) => <EstadoBadge estado={i.getValue()} />,
      }),
      col.accessor((r) => (r.fecha_pagado ? fechaCorta(r.fecha_pagado) : '—'), {
        id: 'fecha_pagado',
        header: 'Pagado el',
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      {
        id: 'estado',
        label: 'Estado',
        getValue: (r: MensualidadFila) => ESTADO_MENSUALIDAD_LABEL[r.estado],
      },
      {
        id: 'tipo',
        label: 'Tipo',
        getValue: (r: MensualidadFila) => r.tipo_nombre,
      },
      {
        id: 'mes',
        label: 'Concepto',
        getValue: (r: MensualidadFila) => r.etiqueta,
      },
      {
        id: 'grado',
        label: 'Grado',
        getValue: (r: MensualidadFila) => r.grado,
      },
      {
        id: 'seccion',
        label: 'Sección',
        getValue: (r: MensualidadFila) => r.seccion,
      },
    ],
    [],
  )

  const cerrarRegistrar = () => {
    setRegistrar(null)
    if (alumno) void navigate({ to: '/pagos', search: {}, replace: true })
  }

  if (isLoading) return <div className="empty-state">Cargando pagos…</div>

  return (
    <RequirePermission permission="pagos:get">
      <div data-testid="pagos-page">
        <DataTable
          title="Pagos"
          data={data}
          columns={columns}
          filters={filters}
          addLabel="Registrar pago"
          canAdd={can('pagos:post')}
          onAdd={() => setRegistrar({})}
          exportFilename="pagos"
          exportRows={data.map((r) => ({
            codigo: r.alumno_codigo,
            alumno: r.alumno_nombre,
            grado: r.grado,
            seccion: r.seccion,
            tipo: r.tipo_nombre,
            concepto: r.etiqueta,
            monto: r.total,
            vence: r.fecha_vencimiento,
            estado: ESTADO_MENSUALIDAD_LABEL[r.estado],
            pagado_el: r.fecha_pagado ?? '',
            origen: r.origen ? ORIGEN_LABEL[r.origen] : '',
          }))}
          onRowContextMenu={(row, e) =>
            setCtx({ x: e.clientX, y: e.clientY, row })
          }
          onRowDoubleClick={(row) => setVer(row)}
        />
      </div>

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          data-testid="pagos-ctx"
        >
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="pagos-ctx-ver"
            onClick={() => {
              setVer(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
          <Can permission="pagos:put">
            {ctx.row.es_mensualidad ? (
              <button
                type="button"
                className="ctx-menu__item"
                data-testid="pagos-ctx-editar"
                onClick={() => {
                  setEditar(ctx.row)
                  closeCtx()
                }}
              >
                Editar
              </button>
            ) : null}
            {ctx.row.es_mensualidad && ctx.row.estado === 'pagado' ? (
              <button
                type="button"
                className="ctx-menu__item ctx-menu__item--danger"
                data-testid="pagos-ctx-anular"
                onClick={() => {
                  setAnular(ctx.row)
                  closeCtx()
                }}
              >
                Anular pago
              </button>
            ) : null}
          </Can>
          <Can permission="pagos:post">
            {ctx.row.estado !== 'pagado' ? (
              <button
                type="button"
                className="ctx-menu__item"
                data-testid="pagos-ctx-cobrar"
                onClick={() => {
                  setRegistrar({ code: ctx.row.alumno_codigo })
                  closeCtx()
                }}
              >
                Registrar pago
              </button>
            ) : null}
          </Can>
        </div>
      ) : null}

      {ver ? (
        <VerMensualidadModal fila={ver} onClose={() => setVer(null)} />
      ) : null}
      {editar ? (
        <EditarMensualidadModal fila={editar} onClose={() => setEditar(null)} />
      ) : null}
      {anular ? (
        <AnularPagoModal fila={anular} onClose={() => setAnular(null)} />
      ) : null}
      {registrar ? (
        <RegistrarPagoModal
          initialCode={registrar.code}
          filas={data}
          onClose={cerrarRegistrar}
        />
      ) : null}
    </RequirePermission>
  )
}

function DatosMensualidad({ f }: { f: MensualidadFila }) {
  return (
    <dl className="ficha__grid">
      <div>
        <dt className="field__label">Alumno</dt>
        <dd>
          {f.alumno_nombre} · {f.alumno_codigo}
        </dd>
      </div>
      <div>
        <dt className="field__label">Grado</dt>
        <dd>{[f.grado, f.seccion].filter(Boolean).join(' · ') || '—'}</dd>
      </div>
      <div>
        <dt className="field__label">Tipo</dt>
        <dd>{f.tipo_nombre}</dd>
      </div>
      <div>
        <dt className="field__label">Concepto</dt>
        <dd>{f.etiqueta}</dd>
      </div>
      <div>
        <dt className="field__label">Monto</dt>
        <dd>
          {lempiras(f.monto)}
          {f.mora_monto > 0 ? (
            <span className="texto-muted">
              {' '}
              + {lempiras(f.mora_monto)} de mora = {lempiras(f.total)}
            </span>
          ) : null}
        </dd>
      </div>
      <div>
        <dt className="field__label">Vence</dt>
        <dd>{fechaCorta(f.fecha_vencimiento)}</dd>
      </div>
      <div>
        <dt className="field__label">Estado</dt>
        <dd>
          <EstadoBadge estado={f.estado} />
        </dd>
      </div>
      {f.estado === 'pagado' ? (
        <>
          <div>
            <dt className="field__label">Pagado el</dt>
            <dd>{f.fecha_pagado ? fechaCorta(f.fecha_pagado) : '—'}</dd>
          </div>
          <div>
            <dt className="field__label">Monto pagado</dt>
            <dd>{f.monto_pagado != null ? lempiras(f.monto_pagado) : '—'}</dd>
          </div>
          <div>
            <dt className="field__label">Origen</dt>
            <dd>{f.origen ? ORIGEN_LABEL[f.origen] : '—'}</dd>
          </div>
          <div>
            <dt className="field__label">Registrado por</dt>
            <dd>{f.cobrador || '—'}</dd>
          </div>
          {f.observaciones ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <dt className="field__label">Observaciones</dt>
              <dd>{f.observaciones}</dd>
            </div>
          ) : null}
        </>
      ) : null}
    </dl>
  )
}

function VerMensualidadModal({
  fila,
  onClose,
}: {
  fila: MensualidadFila
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  return (
    <Modal
      open={open}
      title={`Pago · ${fila.etiqueta}`}
      onClose={dismiss}
      wide
      footer={
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          Cerrar
        </button>
      }
    >
      <div data-testid="pago-ver">
        <DatosMensualidad f={fila} />
      </div>
    </Modal>
  )
}

function EditarMensualidadModal({
  fila,
  onClose,
}: {
  fila: MensualidadFila
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const [anularOpen, setAnularOpen] = useState(false)
  const pagado = fila.estado === 'pagado'

  return (
    <>
      <Modal
        open={open}
        title={`Editar · ${fila.alumno_nombre} · ${fila.etiqueta}`}
        onClose={dismiss}
        wide
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cerrar
            </button>
            {pagado ? (
              <button
                type="button"
                className="btn btn--danger"
                data-testid="pago-editar-anular"
                onClick={() => setAnularOpen(true)}
              >
                Anular pago
              </button>
            ) : null}
          </>
        }
      >
        <DatosMensualidad f={fila} />
        {pagado ? (
          <p className="texto-muted" style={{ fontSize: '0.85rem' }}>
            Si el pago se registró por error, anúlalo: el mes vuelve a pendiente
            (o en mora si ya venció)
            {fila.origen === 'recibo'
              ? ' y el recibo del padre vuelve a "Sin revisar"'
              : ''}
            .
          </p>
        ) : (
          <p
            className="texto-muted"
            style={{ fontSize: '0.85rem' }}
            data-testid="pago-editar-sin-pago"
          >
            Este mes no tiene pago registrado; no hay nada que corregir.
          </p>
        )}
      </Modal>

      {anularOpen ? (
        <AnularPagoModal
          fila={fila}
          onClose={() => setAnularOpen(false)}
          onAnulado={() => {
            setAnularOpen(false)
            onClose()
          }}
        />
      ) : null}
    </>
  )
}

function AnularPagoModal({
  fila,
  onClose,
  onAnulado,
}: {
  fila: MensualidadFila
  onClose: () => void
  onAnulado?: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const qc = useQueryClient()
  const [motivo, setMotivo] = useState('')
  const [confirmar, setConfirmar] = useState(false)

  const anular = useMutation({
    mutationFn: () => anularMensualidad(fila.obligacion_id, motivo.trim()),
    onSuccess: (r) => {
      toast.success(
        r.recibos_reabiertos
          ? `Pago anulado. El recibo del padre volvió a "Sin revisar".`
          : `Pago anulado. ${fila.etiqueta} quedó ${ESTADO_MENSUALIDAD_LABEL[r.estado].toLowerCase()}.`,
      )
      refrescarPagos(qc)
      setConfirmar(false)
      dismiss()
      onAnulado?.()
    },
    onError: (e) => {
      setConfirmar(false)
      toast.error(userMessageFromError(e))
    },
  })

  return (
    <>
      <Modal
        open={open}
        title={`Anular pago · ${fila.alumno_nombre} · ${fila.etiqueta}`}
        onClose={dismiss}
        wide
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cerrar
            </button>
            <button
              type="button"
              className="btn btn--danger"
              data-testid="pago-anular"
              disabled={!motivo.trim() || anular.isPending}
              onClick={() => setConfirmar(true)}
            >
              Anular pago
            </button>
          </>
        }
      >
        <DatosMensualidad f={fila} />
        <p className="texto-muted" style={{ fontSize: '0.85rem' }}>
          Si el pago se registró por error, anúlalo: el mes vuelve a pendiente
          (o en mora si ya venció)
          {fila.origen === 'recibo'
            ? ' y el recibo del padre vuelve a "Sin revisar"'
            : ''}
          .
        </p>
        <Field label="Motivo de la anulación" htmlFor="pago-anular-motivo">
          <textarea
            id="pago-anular-motivo"
            className="field__textarea"
            rows={2}
            data-testid="pago-anular-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Anular pago"
        message={`¿Anular el pago de ${fila.etiqueta} de ${fila.alumno_nombre}? Las calificaciones de ese mes volverán a bloquearse si corresponde.`}
        confirmLabel="Anular"
        danger
        onCancel={() => setConfirmar(false)}
        onConfirm={() => anular.mutate()}
      />
    </>
  )
}
