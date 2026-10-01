import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Can, RequirePermission } from '#/components/gates/Can'
import { ReciboVisor } from '#/components/pagos/ReciboVisor'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { fechaCorta, lempiras, mesAnio, nombreMes } from '#/lib/fechas-padre'
import { ESTADO_RECIBO_LABEL, listRecibos, validarRecibo } from '#/services/pagos'
import type { EstadoRecibo, Recibo, ValidarReciboRequest } from '#/services/pagos'

export const Route = createFileRoute('/_app/recibos')({ component: RecibosPage })

const col = createColumnHelper<Recibo>()

const ESTADO_BADGE: Record<EstadoRecibo, string> = {
  sin_revisar: 'badge badge--warn',
  aprobado: 'badge badge--ok',
  denegado: 'badge badge--danger',
}

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })
}

function RecibosPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['recibos'], queryFn: () => listRecibos() })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Recibo } | null>(null)
  const [ver, setVer] = useState<Recibo | null>(null)
  const [validar, setValidar] = useState<Recibo | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const columns = useMemo(
    () => [
      col.accessor('created_at', { header: 'Enviado', cell: (i) => fechaHora(i.getValue()) }),
      col.accessor('responsable_nombre', { header: 'Padre', cell: (i) => i.getValue() || '—' }),
      col.accessor('alumno_nombre', {
        header: 'Alumno',
        cell: (i) => (
          <>
            {i.getValue()}
            <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
              {i.row.original.alumno_codigo}
            </span>
          </>
        ),
      }),
      col.accessor((r) => mesAnio(r.anio, r.mes), { id: 'mes', header: 'Mes' }),
      col.accessor('monto', { header: 'Cantidad', cell: (i) => lempiras(i.getValue()) }),
      col.accessor((r) => (r.fecha_pago ? fechaCorta(r.fecha_pago) : '—'), { id: 'fecha_pago', header: 'Fecha de pago' }),
      col.accessor('estado', {
        header: 'Estado',
        cell: (i) => <span className={ESTADO_BADGE[i.getValue()]}>{ESTADO_RECIBO_LABEL[i.getValue()]}</span>,
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      { id: 'estado', label: 'Estado', getValue: (r: Recibo) => ESTADO_RECIBO_LABEL[r.estado] },
      { id: 'mes', label: 'Mes', getValue: (r: Recibo) => mesAnio(r.anio, r.mes) },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando recibos…</div>

  return (
    <RequirePermission permission="pagos:put">
      <div data-testid="recibos-page">
        <DataTable
          title="Recibos de pago"
          data={data}
          columns={columns}
          filters={filters}
          canAdd={false}
          exportFilename="recibos"
          exportRows={data.map((r) => ({
            enviado: fechaHora(r.created_at),
            padre: r.responsable_nombre,
            alumno: r.alumno_nombre,
            codigo: r.alumno_codigo,
            mes: mesAnio(r.anio, r.mes),
            cantidad: r.monto,
            fecha_pago: r.fecha_pago ?? '',
            estado: ESTADO_RECIBO_LABEL[r.estado],
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="recibos-ctx">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="recibos-ctx-ver"
            onClick={() => {
              setVer(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
          <Can permission="pagos:put">
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="recibos-ctx-validar"
              onClick={() => {
                setValidar(ctx.row)
                closeCtx()
              }}
            >
              Validar
            </button>
          </Can>
        </div>
      ) : null}

      {ver ? <VerReciboModal recibo={ver} onClose={() => setVer(null)} /> : null}
      {validar ? <ValidarReciboModal recibo={validar} onClose={() => setValidar(null)} /> : null}
    </RequirePermission>
  )
}

function DatosRecibo({ r }: { r: Recibo }) {
  return (
    <dl className="ficha__grid" style={{ marginTop: '1rem' }}>
      <div>
        <dt className="field__label">Padre</dt>
        <dd>{r.responsable_nombre || '—'}</dd>
      </div>
      <div>
        <dt className="field__label">Alumno</dt>
        <dd>
          {r.alumno_nombre} · {r.alumno_codigo}
        </dd>
      </div>
      <div>
        <dt className="field__label">Mes</dt>
        <dd>{mesAnio(r.anio, r.mes)}</dd>
      </div>
      <div>
        <dt className="field__label">Cantidad</dt>
        <dd>{lempiras(r.monto)}</dd>
      </div>
      <div>
        <dt className="field__label">Enviado</dt>
        <dd>{fechaHora(r.created_at)}</dd>
      </div>
      <div>
        <dt className="field__label">Estado</dt>
        <dd>
          <span className={ESTADO_BADGE[r.estado]}>{ESTADO_RECIBO_LABEL[r.estado]}</span>
        </dd>
      </div>
      {r.observaciones ? (
        <div style={{ gridColumn: '1 / -1' }}>
          <dt className="field__label">Observaciones</dt>
          <dd>{r.observaciones}</dd>
        </div>
      ) : null}
    </dl>
  )
}

function VerReciboModal({ recibo, onClose }: { recibo: Recibo; onClose: () => void }) {
  const { open, dismiss } = useDismiss(onClose)
  return (
    <Modal
      open={open}
      title={`Recibo · ${recibo.alumno_nombre}`}
      onClose={dismiss}
      wide
      footer={
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          Cerrar
        </button>
      }
    >
      <ReciboVisor recibo={recibo} />
      <DatosRecibo r={recibo} />
    </Modal>
  )
}

function ValidarReciboModal({ recibo, onClose }: { recibo: Recibo; onClose: () => void }) {
  const { open, dismiss } = useDismiss(onClose)
  const qc = useQueryClient()
  const [confirmar, setConfirmar] = useState(false)
  const [cancelar, setCancelar] = useState(false)
  const [form, setForm] = useState<ValidarReciboRequest>({
    estado: recibo.estado,
    anio: recibo.anio,
    mes: recibo.mes,
    monto: recibo.monto,
    fecha_pago: recibo.fecha_pago ?? '',
    observaciones: recibo.observaciones ?? '',
  })

  const guardar = useMutation({
    mutationFn: () =>
      validarRecibo(recibo.id, {
        ...form,
        fecha_pago: form.fecha_pago || null,
        observaciones: form.observaciones?.trim() || null,
      }),
    onSuccess: (r) => {
      toast.success(`Recibo ${ESTADO_RECIBO_LABEL[r.estado].toLowerCase()}`)
      void qc.invalidateQueries({ queryKey: ['recibos'] })
      void qc.invalidateQueries({ queryKey: ['mora'] })
      void qc.invalidateQueries({ queryKey: ['mensualidades'] })
      void qc.invalidateQueries({ queryKey: ['mensualidades-alumno'] })
      void qc.invalidateQueries({ queryKey: ['liberacion-bloqueados'] })
      setConfirmar(false)
      dismiss()
    },
    onError: (e) => {
      setConfirmar(false)
      toast.error(userMessageFromError(e))
    },
  })

  const set = <TKey extends keyof ValidarReciboRequest>(k: TKey, v: ValidarReciboRequest[TKey]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const cambioMes = form.anio !== recibo.anio || form.mes !== recibo.mes

  return (
    <>
      <Modal
        open={open}
        title="Validar recibo"
        onClose={() => setCancelar(true)}
        xl
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setCancelar(true)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="recibo-validar-guardar"
              disabled={guardar.isPending}
              onClick={() => setConfirmar(true)}
            >
              Guardar
            </button>
          </>
        }
      >
        <div className="recibo-validar">
          <div>
            <ReciboVisor recibo={recibo} />
            <p className="texto-muted" style={{ fontSize: '0.85rem' }}>
              Enviado por {recibo.responsable_nombre || 'el padre'} el {fechaHora(recibo.created_at)} para{' '}
              {recibo.alumno_nombre} ({recibo.alumno_codigo}). El padre indicó {mesAnio(recibo.anio, recibo.mes)}.
            </p>
          </div>
          <div>
            <Field label="Estado" htmlFor="recibo-estado">
              <select
                id="recibo-estado"
                className="field__select"
                data-testid="recibo-validar-estado"
                value={form.estado}
                onChange={(e) => set('estado', e.target.value as EstadoRecibo)}
              >
                {(Object.keys(ESTADO_RECIBO_LABEL) as EstadoRecibo[]).map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_RECIBO_LABEL[e]}
                  </option>
                ))}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <Field label="Mes del pago" htmlFor="recibo-mes-validar">
                <select
                  id="recibo-mes-validar"
                  className="field__select"
                  data-testid="recibo-validar-mes"
                  value={form.mes}
                  onChange={(e) => set('mes', Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {nombreMes(m).charAt(0).toUpperCase() + nombreMes(m).slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Año" htmlFor="recibo-anio">
                <input
                  id="recibo-anio"
                  type="number"
                  className="field__input"
                  value={form.anio}
                  onChange={(e) => set('anio', Number(e.target.value))}
                />
              </Field>
            </div>
            {cambioMes ? (
              <p className="texto-muted" style={{ margin: '-0.25rem 0 0.75rem', fontSize: '0.82rem' }}>
                Se corregirá el mes: {mesAnio(recibo.anio, recibo.mes)} → {mesAnio(form.anio, form.mes)}.
              </p>
            ) : null}
            <Field label="Cantidad (L)" htmlFor="recibo-monto">
              <input
                id="recibo-monto"
                type="number"
                min={0}
                step="0.01"
                className="field__input"
                data-testid="recibo-validar-monto"
                value={form.monto}
                onChange={(e) => set('monto', Number(e.target.value))}
              />
            </Field>
            <Field label="Fecha de pago (según el recibo)" htmlFor="recibo-fecha">
              <input
                id="recibo-fecha"
                type="date"
                className="field__input"
                data-testid="recibo-validar-fecha"
                value={form.fecha_pago ?? ''}
                onChange={(e) => set('fecha_pago', e.target.value)}
              />
            </Field>
            <Field label="Observaciones (el padre las ve si se deniega)" htmlFor="recibo-obs">
              <textarea
                id="recibo-obs"
                className="field__textarea"
                rows={3}
                data-testid="recibo-validar-obs"
                value={form.observaciones ?? ''}
                onChange={(e) => set('observaciones', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Guardar validación"
        message={
          form.estado === 'aprobado'
            ? `¿Aprobar el recibo? ${mesAnio(form.anio, form.mes)} quedará como pagado (${lempiras(form.monto)}).`
            : form.estado === 'denegado'
              ? '¿Denegar el recibo? El padre verá que fue denegado.'
              : '¿Guardar los cambios del recibo?'
        }
        confirmLabel="Guardar"
        onCancel={() => setConfirmar(false)}
        onConfirm={() => guardar.mutate()}
      />
      <ConfirmDialog
        open={cancelar}
        title="Descartar cambios"
        message="¿Cerrar sin guardar?"
        confirmLabel="Cerrar"
        onCancel={() => setCancelar(false)}
        onConfirm={() => {
          setCancelar(false)
          dismiss()
        }}
      />
    </>
  )
}
