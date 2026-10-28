import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BloqueaNotasBadge } from '#/components/pagos/BloqueaNotasBadge'
import { TipoPagoAdicionalModal } from '#/components/pagos/TipoPagoAdicionalModal'
import { TipoPagoFijoModal } from '#/components/pagos/TipoPagoFijoModal'
import { TipoPagoVerModal } from '#/components/pagos/TipoPagoVerModal'
import { ChevronDown } from 'lucide-react'
import { useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import type { RowAction } from '#/components/ui/RowMenu'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  eliminarTipoPago,
  getTiposPagoOpciones,
  getTiposPagoPeriodo,
} from '#/services/pagos-tipos'
import type { PeriodoTiposPago, TipoPagoDetalle } from '#/services/pagos-tipos'

type Props = {
  periodo: PeriodoTiposPago
  onClose: () => void
}

const col = createColumnHelper<TipoPagoDetalle>()

const money = (v: number) =>
  new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(v)

/** Modal con los conceptos fijos y adicionales del periodo, en tabla de registros. */
export function TiposPagoPeriodoModal({ periodo, onClose }: Props) {
  const qc = useQueryClient()
  const { can } = useCan()
  const { open, dismiss } = useDismiss(onClose)
  const periodoId = periodo.id

  const [crear, setCrear] = useState<'basico' | 'avanzado' | null>(null)
  const agregarRef = useRef<HTMLDetailsElement>(null)
  const [editar, setEditar] = useState<TipoPagoDetalle | null>(null)
  const [fijo, setFijo] = useState<TipoPagoDetalle | null>(null)
  const [borrar, setBorrar] = useState<TipoPagoDetalle | null>(null)
  const [ver, setVer] = useState<TipoPagoDetalle | null>(null)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: TipoPagoDetalle } | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = agregarRef.current
      if (el && !el.contains(e.target as Node)) el.removeAttribute('open')
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => {
    if (!ctx) return
    const handler = () => closeCtx()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [ctx, closeCtx])

  const detalleQuery = useQuery({
    queryKey: ['pagos-tipos', periodoId],
    queryFn: () => getTiposPagoPeriodo(periodoId),
    enabled: open && Boolean(periodoId),
    retry: false,
  })

  const opcionesQuery = useQuery({
    queryKey: ['pagos-tipos-opciones', periodoId],
    queryFn: () => getTiposPagoOpciones(periodoId),
    enabled: open && (Boolean(crear) || Boolean(editar) || Boolean(ver)),
    retry: false,
  })

  const deleteMut = useMutation({
    mutationFn: (tipo: TipoPagoDetalle) => eliminarTipoPago(periodoId, tipo.id),
    onSuccess: () => {
      toast.success('Tipo de pago eliminado')
      setBorrar(null)
      void qc.invalidateQueries({ queryKey: ['pagos-tipos', periodoId] })
      void qc.invalidateQueries({ queryKey: ['pagos-tipos-periodos'] })
    },
    onError: (e) => {
      setBorrar(null)
      toast.error(userMessageFromError(e))
    },
  })

  const recargar = () => {
    void qc.invalidateQueries({ queryKey: ['pagos-tipos', periodoId] })
    void qc.invalidateQueries({ queryKey: ['pagos-tipos-periodos'] })
  }

  const detalle = detalleQuery.data
  const tipos = detalle?.tipos ?? []
  const opciones = opcionesQuery.data

  const abrirEdicion = (t: TipoPagoDetalle) => {
    if (t.es_fijo) setFijo(t)
    else setEditar(t)
  }

  const columns = useMemo(
    () => [
      col.accessor('nombre', {
        header: 'Concepto',
        cell: (i) => {
          const t = i.row.original
          return (
            <span data-testid={`tipos-pago-tipo-${t.codigo}`}>
              <strong>{t.nombre}</strong>
              {t.descripcion ? (
                <span className="texto-muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                  {t.descripcion}
                </span>
              ) : null}
            </span>
          )
        },
      }),
      col.accessor((t) => (t.es_fijo ? 'Fijo' : 'Adicional'), {
        id: 'clase',
        header: 'Clase',
        cell: (i) => (
          <span className={`badge${i.row.original.es_fijo ? ' badge--muted' : ''}`}>
            {i.getValue()}
          </span>
        ),
      }),
      col.accessor((t) => (t.es_periodico ? 'Periódico' : 'Único'), {
        id: 'periodicidad',
        header: 'Periodicidad',
        cell: (i) => <span className="badge badge--muted">{i.getValue()}</span>,
      }),
      col.accessor((t) => t.monto ?? 0, {
        header: 'Monto',
        cell: (i) =>
          i.row.original.es_fijo ? (
            <span className="texto-muted">Por grado</span>
          ) : (
            money(i.getValue())
          ),
      }),
      col.accessor((t) => (t.bloquea_notas ? 'Sí' : 'No'), {
        id: 'bloquea_notas',
        header: 'Bloquea notas',
        cell: (i) => <BloqueaNotasBadge bloquea={i.row.original.bloquea_notas} />,
      }),
      col.accessor((t) => t.resumen.obligaciones, {
        id: 'obligaciones',
        header: 'Obligaciones',
        cell: (i) => {
          const r = i.row.original.resumen
          return (
            <span>
              {r.obligaciones}
              <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
                {r.pendientes + r.mora} pendientes · {money(r.monto_pendiente)}
              </span>
            </span>
          )
        },
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      {
        id: 'clase',
        label: 'Clase',
        getValue: (t: TipoPagoDetalle) => (t.es_fijo ? 'Fijo' : 'Adicional'),
      },
      {
        id: 'periodicidad',
        label: 'Periodicidad',
        getValue: (t: TipoPagoDetalle) => (t.es_periodico ? 'Periódico' : 'Único'),
      },
      {
        id: 'bloquea_notas',
        label: 'Bloquea notas',
        getValue: (t: TipoPagoDetalle) => (t.bloquea_notas ? 'Sí' : 'No'),
      },
    ],
    [],
  )

  return (
    <>
      <Modal
        open={open}
        xl
        title={`Tipos de pago · ${periodo.nombre}`}
        onClose={dismiss}
        testId="tipos-pago-modal"
        footer={
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Cerrar
          </button>
        }
      >
        <div data-testid="tipos-pago-detalle">
          <div className="tipos-pago__cabecera" data-testid="tipos-pago-cabecera">
            <span className="badge">Año lectivo {periodo.anio_lectivo}</span>
            <span className="badge badge--muted">
              {detalle?.meses.seleccionados.length ?? periodo.meses_cobro} meses de cobro
            </span>
            <span className="badge badge--muted">
              {detalle?.meses.modo === 'manual' ? 'Meses manuales' : 'Meses automáticos'}
            </span>
          </div>

          {detalleQuery.isError ? (
            <div data-testid="tipos-pago-error">
              <p className="field__error">
                No se pudo cargar: {userMessageFromError(detalleQuery.error)}
              </p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void detalleQuery.refetch()}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <DataTable
              title="Conceptos del periodo"
              data={tipos}
              columns={columns}
              filters={filters}
              canAdd={false}
              toolbarExtra={
                can('pagos_config:put') ? (
                  <details
                    className="export-menu"
                    ref={agregarRef}
                    data-testid="tipos-pago-agregar-menu"
                  >
                    <summary className="btn btn--primary" data-testid="tipos-pago-agregar">
                      Agregar
                      <ChevronDown size={14} />
                    </summary>
                    <div className="export-menu__list" role="menu">
                      <button
                        type="button"
                        className="ctx-menu__item"
                        role="menuitem"
                        data-testid="tipos-pago-agregar-simple"
                        onClick={(e) => {
                          e.currentTarget.closest('details')?.removeAttribute('open')
                          setCrear('basico')
                        }}
                      >
                        Agregar simple
                      </button>
                      <button
                        type="button"
                        className="ctx-menu__item"
                        role="menuitem"
                        data-testid="tipos-pago-agregar-avanzado"
                        onClick={(e) => {
                          e.currentTarget.closest('details')?.removeAttribute('open')
                          setCrear('avanzado')
                        }}
                      >
                        Agregar avanzado
                      </button>
                    </div>
                  </details>
                ) : null
              }
              searchText={(t) => `${t.nombre} ${t.descripcion} ${t.codigo}`}
              onRowDoubleClick={(t) => setVer(t)}
              onRowContextMenu={(t, e) => setCtx({ x: e.clientX, y: e.clientY, row: t })}
              card={{
                title: (t) => t.nombre,
                fields: (t) => [
                  { label: 'Clase', value: t.es_fijo ? 'Fijo' : 'Adicional' },
                  { label: 'Periodicidad', value: t.es_periodico ? 'Periódico' : 'Único' },
                  {
                    label: 'Monto',
                    value: t.es_fijo ? 'Por grado' : money(t.monto ?? 0),
                  },
                  {
                    label: 'Bloquea notas',
                    value: t.bloquea_notas ? 'Sí' : 'No',
                  },
                  {
                    label: 'Obligaciones',
                    value: `${t.resumen.obligaciones} · ${t.resumen.pendientes + t.resumen.mora} pendientes`,
                  },
                ],
                status: (t) => ({
                  label: t.bloquea_notas ? 'Bloquea notas' : 'No bloquea',
                  tone: t.bloquea_notas ? 'mal' : 'ok',
                }),
                testId: (t) => `tipos-pago-card-${t.codigo}`,
              }}
              rowActions={(t) => {
                const acciones: RowAction[] = [
                  {
                    label: 'Ver',
                    onClick: () => setVer(t),
                    testId: `tipos-pago-row-ver-${t.codigo}`,
                  },
                  {
                    label: 'Editar',
                    onClick: () => abrirEdicion(t),
                    testId: `tipos-pago-row-editar-${t.codigo}`,
                  },
                ]
                if (!t.es_fijo) {
                  acciones.push({
                    label: 'Eliminar',
                    onClick: () => setBorrar(t),
                    danger: true,
                    testId: `tipos-pago-row-eliminar-${t.codigo}`,
                  })
                }
                return acciones
              }}
            />
          )}

          {detalleQuery.isLoading ? (
            <p className="texto-muted" data-testid="tipos-pago-cargando">
              Cargando tipos de pago…
            </p>
          ) : null}
        </div>
      </Modal>

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          data-testid="tipos-pago-ctx"
        >
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="tipos-pago-ctx-ver"
            onClick={() => {
              setVer(ctx.row)
              setCtx(null)
            }}
          >
            Ver
          </button>
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="tipos-pago-ctx-editar"
            onClick={() => {
              abrirEdicion(ctx.row)
              setCtx(null)
            }}
          >
            Editar
          </button>
          {ctx.row.es_fijo ? null : (
            <button
              type="button"
              className="ctx-menu__item ctx-menu__item--danger"
              data-testid="tipos-pago-ctx-eliminar"
              onClick={() => {
                setBorrar(ctx.row)
                setCtx(null)
              }}
            >
              Eliminar
            </button>
          )}
        </div>
      ) : null}

      {ver ? (
        <TipoPagoVerModal tipo={ver} opciones={opciones} onClose={() => setVer(null)} />
      ) : null}

      {crear && opciones && detalle ? (
        <TipoPagoAdicionalModal
          periodoId={periodoId}
          modo={crear}
          diaPagoPeriodo={detalle.dia_pago}
          meses={detalle.meses}
          opciones={opciones}
          onClose={() => setCrear(null)}
          onSaved={() => {
            setCrear(null)
            recargar()
          }}
        />
      ) : null}

      {editar && opciones && detalle ? (
        <TipoPagoAdicionalModal
          periodoId={periodoId}
          modo={
            editar.desglose === 'por_grado' || editar.meses_modo === 'por_grado'
              ? 'basico'
              : editar.reglas.length > 0
                ? 'avanzado'
                : 'basico'
          }
          diaPagoPeriodo={detalle.dia_pago}
          meses={detalle.meses}
          opciones={opciones}
          tipo={editar}
          onClose={() => setEditar(null)}
          onSaved={() => {
            setEditar(null)
            recargar()
          }}
        />
      ) : null}

      {fijo && detalle ? (
        <TipoPagoFijoModal
          periodoId={periodoId}
          tipo={fijo}
          meses={detalle.meses}
          onClose={() => setFijo(null)}
          onSaved={() => {
            setFijo(null)
            recargar()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(borrar)}
        title="Eliminar tipo de pago"
        message={`¿Eliminar «${borrar?.nombre ?? ''}»? Solo se permite si no tiene pagos registrados; sus obligaciones pendientes quedarán inactivas.`}
        danger
        confirmLabel="Eliminar"
        testId="tipos-pago-confirmar-eliminar"
        confirmDisabled={deleteMut.isPending}
        onConfirm={() => borrar && deleteMut.mutate(borrar)}
        onCancel={() => setBorrar(null)}
      />
    </>
  )
}
