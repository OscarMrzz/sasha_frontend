import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import type { ComboboxOption } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { fechaCorta, lempiras, mesAnio } from '#/lib/fechas-padre'
import {
  ESTADO_MENSUALIDAD_LABEL,
  anularMensualidad,
  buscarAlumnosPago,
  cobrarMeses,
  getMensualidadesAlumno,
  listMensualidades,
} from '#/services/pagos'
import type { AlumnoBusqueda, EstadoMensualidad, MensualidadFila } from '#/services/pagos'

export const Route = createFileRoute('/_app/pagos')({
  component: PagosPage,
  validateSearch: (s: Record<string, unknown>): { alumno?: string } =>
    s.alumno === undefined || s.alumno === '' ? {} : { alumno: String(s.alumno) },
})

const col = createColumnHelper<MensualidadFila>()

const ESTADO_BADGE: Record<EstadoMensualidad, string> = {
  pendiente: 'badge badge--muted',
  pagado: 'badge badge--ok',
  mora: 'badge badge--danger',
}

const ORIGEN_LABEL = { caja: 'Caja', recibo: 'Recibo del padre' } as const

function EstadoBadge({ estado }: { estado: EstadoMensualidad }) {
  return <span className={ESTADO_BADGE[estado]}>{ESTADO_MENSUALIDAD_LABEL[estado]}</span>
}

function refrescarPagos(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['mensualidades'] })
  void qc.invalidateQueries({ queryKey: ['mensualidades-alumno'] })
  void qc.invalidateQueries({ queryKey: ['mora'] })
  void qc.invalidateQueries({ queryKey: ['recibos'] })
  void qc.invalidateQueries({ queryKey: ['liberacion-bloqueados'] })
}

function PagosPage() {
  const { can } = useCan()
  const navigate = useNavigate()
  const { alumno } = Route.useSearch()
  const { data = [], isLoading } = useQuery({ queryKey: ['mensualidades'], queryFn: () => listMensualidades() })

  const [ctx, setCtx] = useState<{ x: number; y: number; row: MensualidadFila } | null>(null)
  const [ver, setVer] = useState<MensualidadFila | null>(null)
  const [editar, setEditar] = useState<MensualidadFila | null>(null)
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
            <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
              {i.row.original.alumno_codigo}
            </span>
          </>
        ),
      }),
      col.accessor((r) => [r.grado, r.seccion].filter(Boolean).join(' · ') || '—', { id: 'grado', header: 'Grado' }),
      col.accessor((r) => mesAnio(r.anio, r.mes), { id: 'mes', header: 'Mes' }),
      col.accessor('monto', { header: 'Monto', cell: (i) => lempiras(i.getValue()) }),
      col.accessor('fecha_vencimiento', { header: 'Vence', cell: (i) => fechaCorta(i.getValue()) }),
      col.accessor('estado', { header: 'Estado', cell: (i) => <EstadoBadge estado={i.getValue()} /> }),
      col.accessor((r) => (r.fecha_pagado ? fechaCorta(r.fecha_pagado) : '—'), { id: 'fecha_pagado', header: 'Pagado el' }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      { id: 'estado', label: 'Estado', getValue: (r: MensualidadFila) => ESTADO_MENSUALIDAD_LABEL[r.estado] },
      { id: 'mes', label: 'Mes', getValue: (r: MensualidadFila) => mesAnio(r.anio, r.mes) },
      { id: 'grado', label: 'Grado', getValue: (r: MensualidadFila) => r.grado },
      { id: 'seccion', label: 'Sección', getValue: (r: MensualidadFila) => r.seccion },
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
            mes: mesAnio(r.anio, r.mes),
            monto: r.monto,
            vence: r.fecha_vencimiento,
            estado: ESTADO_MENSUALIDAD_LABEL[r.estado],
            pagado_el: r.fecha_pagado ?? '',
            origen: r.origen ? ORIGEN_LABEL[r.origen] : '',
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          onRowDoubleClick={(row) => setVer(row)}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="pagos-ctx">
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

      {ver ? <VerMensualidadModal fila={ver} onClose={() => setVer(null)} /> : null}
      {editar ? <EditarMensualidadModal fila={editar} onClose={() => setEditar(null)} /> : null}
      {registrar ? <RegistrarPagoModal initialCode={registrar.code} onClose={cerrarRegistrar} /> : null}
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
        <dt className="field__label">Mes</dt>
        <dd>{mesAnio(f.anio, f.mes)}</dd>
      </div>
      <div>
        <dt className="field__label">Monto</dt>
        <dd>{lempiras(f.monto)}</dd>
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

function VerMensualidadModal({ fila, onClose }: { fila: MensualidadFila; onClose: () => void }) {
  const { open, dismiss } = useDismiss(onClose)
  return (
    <Modal
      open={open}
      title={`Mensualidad · ${mesAnio(fila.anio, fila.mes)}`}
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

function EditarMensualidadModal({ fila, onClose }: { fila: MensualidadFila; onClose: () => void }) {
  const { open, dismiss } = useDismiss(onClose)
  const qc = useQueryClient()
  const [motivo, setMotivo] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const pagado = fila.estado === 'pagado'

  const anular = useMutation({
    mutationFn: () => anularMensualidad(fila.obligacion_id, motivo.trim()),
    onSuccess: (r) => {
      toast.success(
        r.recibos_reabiertos
          ? `Pago anulado. El recibo del padre volvió a "Sin revisar".`
          : `Pago anulado. ${mesAnio(fila.anio, fila.mes)} quedó ${ESTADO_MENSUALIDAD_LABEL[r.estado].toLowerCase()}.`,
      )
      refrescarPagos(qc)
      setConfirmar(false)
      dismiss()
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
        title={`Editar · ${fila.alumno_nombre} · ${mesAnio(fila.anio, fila.mes)}`}
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
                data-testid="pago-anular"
                disabled={!motivo.trim() || anular.isPending}
                onClick={() => setConfirmar(true)}
              >
                Anular pago
              </button>
            ) : null}
          </>
        }
      >
        <DatosMensualidad f={fila} />
        {pagado ? (
          <>
            <p className="texto-muted" style={{ fontSize: '0.85rem' }}>
              Si el pago se registró por error, anúlalo: el mes vuelve a pendiente (o en mora si ya venció)
              {fila.origen === 'recibo' ? ' y el recibo del padre vuelve a "Sin revisar"' : ''}.
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
          </>
        ) : (
          <p className="texto-muted" style={{ fontSize: '0.85rem' }} data-testid="pago-editar-sin-pago">
            Este mes no tiene pago registrado; no hay nada que corregir.
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Anular pago"
        message={`¿Anular el pago de ${mesAnio(fila.anio, fila.mes)} de ${fila.alumno_nombre}? Las calificaciones de ese mes volverán a bloquearse si corresponde.`}
        confirmLabel="Anular"
        onCancel={() => setConfirmar(false)}
        onConfirm={() => anular.mutate()}
      />
    </>
  )
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return v
}

const opcionAlumno = (a: AlumnoBusqueda): ComboboxOption => ({
  value: a.codigo,
  label: `${a.codigo} · ${a.nombre}${a.grado ? ` (${a.grado})` : ''}`,
  keywords: a.nombre,
})

function RegistrarPagoModal({ initialCode, onClose }: { initialCode?: string; onClose: () => void }) {
  const { open, dismiss } = useDismiss(onClose)
  const qc = useQueryClient()
  const [code, setCode] = useState(initialCode ?? '')
  const [elegido, setElegido] = useState<AlumnoBusqueda | null>(null)
  const [query, setQuery] = useState('')
  const [mesesSel, setMesesSel] = useState<string[]>([])
  const [observaciones, setObservaciones] = useState('')
  const [confirmar, setConfirmar] = useState(false)

  const q = useDebounced(query.trim(), 300)
  const busqueda = useQuery({
    queryKey: ['pago-buscar-alumno', q],
    queryFn: () => buscarAlumnosPago(q),
    enabled: q.length > 0,
    staleTime: 30_000,
  })
  const cuenta = useQuery({
    queryKey: ['mensualidades-alumno', code],
    queryFn: () => getMensualidadesAlumno(code),
    enabled: Boolean(code),
    retry: false,
  })
  const c = cuenta.data

  const options = useMemo(() => {
    const list = (busqueda.data ?? []).map(opcionAlumno)
    const actual = elegido ?? (c ? { codigo: c.codigo, nombre: c.nombre, grado: c.grado } : null)
    if (actual && !list.some((o) => o.value === actual.codigo)) list.unshift(opcionAlumno(actual))
    return list
  }, [busqueda.data, elegido, c])

  const elegir = (v: string) => {
    setCode(v)
    setElegido(busqueda.data?.find((a) => a.codigo === v) ?? null)
    setMesesSel([])
  }

  const pendientes = c?.meses.filter((m) => m.estado !== 'pagado') ?? []
  const seleccionados = pendientes.filter((m) => mesesSel.includes(m.obligacion_id))
  const totalSel = seleccionados.reduce((s, m) => s + m.monto, 0)
  const toggleMes = (id: string) => setMesesSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const cobrar = useMutation({
    mutationFn: () => cobrarMeses(code, mesesSel, observaciones.trim() || undefined),
    onSuccess: (r) => {
      toast.success(`Se registraron ${r.pagos.length} mensualidad(es) por ${lempiras(r.total)}`)
      refrescarPagos(qc)
      setConfirmar(false)
      dismiss()
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
        title="Registrar pago"
        onClose={dismiss}
        wide
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cancelar
            </button>
            <Can permission="pagos:post">
              <button
                type="button"
                className="btn btn--primary"
                data-testid="pago-meses-cobrar"
                disabled={!seleccionados.length || cobrar.isPending}
                onClick={() => setConfirmar(true)}
              >
                Cobrar {seleccionados.length ? `${seleccionados.length} mes(es) · L ${totalSel.toFixed(2)}` : 'meses'}
              </button>
            </Can>
          </>
        }
      >
        <Field label="Alumno (código o nombre)" htmlFor="pago-alumno">
          <Combobox
            id="pago-alumno"
            data-testid="pago-alumno-combobox"
            value={code}
            onChange={elegir}
            onQueryChange={setQuery}
            options={options}
            placeholder="Escribe el código o el nombre…"
            emptyLabel={q ? (busqueda.isFetching ? 'Buscando…' : 'Sin resultados') : 'Escribe para buscar'}
          />
        </Field>

        {code && cuenta.isLoading ? <p className="texto-muted">Cargando estado de cuenta…</p> : null}
        {cuenta.isError ? <p className="texto-muted">{userMessageFromError(cuenta.error)}</p> : null}

        {c ? (
          <div data-testid="pago-meses-card">
            <dl className="ficha__grid">
              <div>
                <dt className="field__label">Alumno</dt>
                <dd>
                  <strong>{c.nombre}</strong> · {c.codigo}
                </dd>
              </div>
              <div>
                <dt className="field__label">Grado</dt>
                <dd>{[c.grado, c.seccion].filter(Boolean).join(' · ') || 'Sin matrícula activa'}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt className="field__label">Responsables</dt>
                <dd data-testid="pago-responsables">
                  {c.responsables.length
                    ? c.responsables.map((r) => (
                        <span key={r.codigo} style={{ display: 'block' }}>
                          {r.nombre}
                          {r.parentesco ? ` (${r.parentesco})` : ''}
                          {r.telefono ? ` · ${r.telefono}` : ''}
                          {r.es_principal ? ' · principal' : ''}
                        </span>
                      ))
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="field__label">Toca pagar</dt>
                <dd data-testid="pago-mes-actual">
                  {c.mes_actual ? (
                    <>
                      {mesAnio(c.mes_actual.anio, c.mes_actual.mes)} · {lempiras(c.mes_actual.monto)}
                    </>
                  ) : (
                    'Al día'
                  )}
                </dd>
              </div>
              <div>
                <dt className="field__label">Pagado / pendiente</dt>
                <dd>
                  {lempiras(c.total_pagado)} / {lempiras(c.total_pendiente)}
                </dd>
              </div>
            </dl>

            {c.meses.length === 0 ? (
              <p className="texto-muted">Este alumno no tiene mensualidades en el periodo activo.</p>
            ) : (
              <div className="cobro-meses">
                {c.meses.map((m) => {
                  const pagado = m.estado === 'pagado'
                  const actual = c.mes_actual?.obligacion_id === m.obligacion_id
                  return (
                    <label
                      key={m.obligacion_id}
                      className={`cobro-meses__item${pagado ? ' cobro-meses__item--pagado' : ''}${
                        actual ? ' cobro-meses__item--actual' : ''
                      }`}
                      data-testid={`pago-mes-${m.anio}-${m.mes}`}
                    >
                      <input
                        type="checkbox"
                        disabled={pagado}
                        checked={pagado || mesesSel.includes(m.obligacion_id)}
                        onChange={() => toggleMes(m.obligacion_id)}
                      />
                      <span>{mesAnio(m.anio, m.mes)}</span>
                      <EstadoBadge estado={m.estado} />
                      {pagado && m.fecha_pagado ? (
                        <span className="texto-muted" style={{ fontSize: '0.8rem' }}>
                          {fechaCorta(m.fecha_pagado)}
                        </span>
                      ) : null}
                      {actual ? <span className="badge badge--warn">Toca ahora</span> : null}
                      <span className="cobro-meses__monto">{lempiras(m.monto)}</span>
                    </label>
                  )
                })}
              </div>
            )}

            <Field label="Observaciones" htmlFor="pago-observaciones">
              <textarea
                id="pago-observaciones"
                className="field__textarea"
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Cobrar mensualidades"
        message={`¿Registrar el pago de ${seleccionados.map((m) => mesAnio(m.anio, m.mes)).join(', ')} (${lempiras(totalSel)}) para ${c?.nombre ?? ''}? Las calificaciones de los parciales de esos meses se habilitarán automáticamente.`}
        onConfirm={() => cobrar.mutate()}
        onCancel={() => setConfirmar(false)}
      />
    </>
  )
}
