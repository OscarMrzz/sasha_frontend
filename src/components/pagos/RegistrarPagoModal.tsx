import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Can } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import type { ComboboxOption } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { refrescarPagos } from '#/components/pagos/refrescar-pagos'
import { userMessageFromError } from '#/lib/api'
import { fechaCorta, lempiras, mesAnio } from '#/lib/fechas-padre'
import {
  buscarAlumnosPago,
  cobrarMeses,
  getMensualidadesAlumno,
  ESTADO_MENSUALIDAD_LABEL,
} from '#/services/pagos'
import type {
  AlumnoBusqueda,
  EstadoMensualidad,
  MensualidadFila,
} from '#/services/pagos'

function EstadoBadge({ estado }: { estado: EstadoMensualidad }) {
  const classes = {
    pendiente: 'badge badge--muted',
    pagado: 'badge badge--ok',
    mora: 'badge badge--danger',
  }
  return (
    <span className={classes[estado]}>{ESTADO_MENSUALIDAD_LABEL[estado]}</span>
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

export function RegistrarPagoModal({
  initialCode,
  filas,
  onClose,
  onSaved,
}: {
  initialCode?: string
  filas: MensualidadFila[]
  onClose: () => void
  onSaved?: () => void
}) {
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
    const actual =
      elegido ??
      (c ? { codigo: c.codigo, nombre: c.nombre, grado: c.grado } : null)
    if (actual && !list.some((o) => o.value === actual.codigo))
      list.unshift(opcionAlumno(actual))
    return list
  }, [busqueda.data, elegido, c])

  const elegir = (v: string) => {
    setCode(v)
    setElegido(busqueda.data?.find((a) => a.codigo === v) ?? null)
    setMesesSel([])
  }

  const pendientes = c?.meses.filter((m) => m.estado !== 'pagado') ?? []
  const seleccionados = pendientes.filter((m) =>
    mesesSel.includes(m.obligacion_id),
  )
  // Matrícula y tipos adicionales del alumno (cualquier obligación que no sea mensualidad).
  const otros = filas.filter(
    (f) =>
      f.alumno_codigo === code && f.estado !== 'pagado' && !f.es_mensualidad,
  )
  const otrosSeleccionados = otros.filter((f) =>
    mesesSel.includes(f.obligacion_id),
  )
  const totalSel =
    seleccionados.reduce((s, m) => s + m.monto, 0) +
    otrosSeleccionados.reduce((s, f) => s + f.total, 0)
  const totalConceptos = seleccionados.length + otrosSeleccionados.length
  const toggleMes = (id: string) =>
    setMesesSel((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    )

  const cobrar = useMutation({
    mutationFn: () =>
      cobrarMeses(code, mesesSel, observaciones.trim() || undefined),
    onSuccess: (r) => {
      toast.success(
        `Se registraron ${r.pagos.length} mensualidad(es) por ${lempiras(r.total)}`,
      )
      refrescarPagos(qc)
      onSaved?.()
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
                disabled={totalConceptos === 0 || cobrar.isPending}
                onClick={() => setConfirmar(true)}
              >
                Cobrar{' '}
                {totalConceptos
                  ? `${totalConceptos} concepto(s) · L ${totalSel.toFixed(2)}`
                  : 'conceptos'}
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
            emptyLabel={
              q
                ? busqueda.isFetching
                  ? 'Buscando…'
                  : 'Sin resultados'
                : 'Escribe para buscar'
            }
          />
        </Field>

        {code && cuenta.isLoading ? (
          <p className="texto-muted">Cargando estado de cuenta…</p>
        ) : null}
        {cuenta.isError ? (
          <p className="texto-muted">{userMessageFromError(cuenta.error)}</p>
        ) : null}

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
                <dd>
                  {[c.grado, c.seccion].filter(Boolean).join(' · ') ||
                    'Sin matrícula activa'}
                </dd>
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
                      {mesAnio(c.mes_actual.anio, c.mes_actual.mes)} ·{' '}
                      {lempiras(c.mes_actual.monto)}
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
              <p className="texto-muted">
                Este alumno no tiene mensualidades en el periodo activo.
              </p>
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
                        <span
                          className="texto-muted"
                          style={{ fontSize: '0.8rem' }}
                        >
                          {fechaCorta(m.fecha_pagado)}
                        </span>
                      ) : null}
                      {actual ? (
                        <span className="badge badge--warn">Toca ahora</span>
                      ) : null}
                      <span className="cobro-meses__monto">
                        {lempiras(m.monto)}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}

            {otros.length > 0 ? (
              <div className="pago-otros" data-testid="pago-otros-conceptos">
                <h4 className="expediente__titulo">
                  Matrícula y otros conceptos
                </h4>
                <div className="cobro-meses">
                  {otros.map((f) => (
                    <label
                      key={f.obligacion_id}
                      className="cobro-meses__item"
                      data-testid={`pago-obligacion-${f.obligacion_id}`}
                    >
                      <input
                        type="checkbox"
                        checked={mesesSel.includes(f.obligacion_id)}
                        onChange={() => toggleMes(f.obligacion_id)}
                      />
                      <span>{f.etiqueta}</span>
                      <EstadoBadge estado={f.estado} />
                      <span
                        className="texto-muted"
                        style={{ fontSize: '0.8rem' }}
                      >
                        {fechaCorta(f.fecha_vencimiento)}
                      </span>
                      <span className="cobro-meses__monto">
                        {lempiras(f.total)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

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
        title="Cobrar conceptos"
        message={`¿Registrar el pago de ${[...seleccionados.map((m) => mesAnio(m.anio, m.mes)), ...otrosSeleccionados.map((f) => f.etiqueta)].join(', ')} (${lempiras(totalSel)}) para ${c?.nombre ?? ''}? Las calificaciones se habilitarán si correspondía un bloqueo.`}
        onConfirm={() => cobrar.mutate()}
        onCancel={() => setConfirmar(false)}
      />
    </>
  )
}
