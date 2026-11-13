import {
  ValidarReciboModal,
  VerReciboModal,
} from '#/components/pagos/ReciboModales'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Can, RequirePermission } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { fechaCorta, lempiras, mesAnio } from '#/lib/fechas-padre'
import { ESTADO_RECIBO_LABEL, listRecibos } from '#/services/pagos'
import type { EstadoRecibo, Recibo } from '#/services/pagos'

export const Route = createFileRoute('/_app/recibos')({
  component: RecibosPage,
})

const col = createColumnHelper<Recibo>()

const ESTADO_BADGE: Record<EstadoRecibo, string> = {
  sin_revisar: 'badge badge--warn',
  aprobado: 'badge badge--ok',
  denegado: 'badge badge--danger',
}

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-HN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function RecibosPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['recibos'],
    queryFn: () => listRecibos(),
  })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Recibo } | null>(
    null,
  )
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
      col.accessor('created_at', {
        header: 'Enviado',
        cell: (i) => fechaHora(i.getValue()),
      }),
      col.accessor('responsable_nombre', {
        header: 'Padre',
        cell: (i) => i.getValue() || '—',
      }),
      col.accessor('alumno_nombre', {
        header: 'Alumno',
        cell: (i) => (
          <>
            {i.getValue()}
            <span
              className="texto-muted"
              style={{ display: 'block', fontSize: '0.78rem' }}
            >
              {i.row.original.alumno_codigo}
            </span>
          </>
        ),
      }),
      col.accessor((r) => r.etiqueta, { id: 'mes', header: 'Concepto' }),
      col.accessor((r) => r.tipo_nombre ?? '', {
        id: 'tipo',
        header: 'Tipo',
        cell: (i) =>
          i.getValue() ? (
            <span className="badge badge--muted">{i.getValue()}</span>
          ) : (
            '—'
          ),
      }),
      col.accessor('monto', {
        header: 'Cantidad',
        cell: (i) => lempiras(i.getValue()),
      }),
      col.accessor((r) => (r.fecha_pago ? fechaCorta(r.fecha_pago) : '—'), {
        id: 'fecha_pago',
        header: 'Fecha de pago',
      }),
      col.accessor('estado', {
        header: 'Estado',
        cell: (i) => (
          <span className={ESTADO_BADGE[i.getValue()]}>
            {ESTADO_RECIBO_LABEL[i.getValue()]}
          </span>
        ),
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      {
        id: 'estado',
        label: 'Estado',
        getValue: (r: Recibo) => ESTADO_RECIBO_LABEL[r.estado],
      },
      {
        id: 'mes',
        label: 'Mes',
        getValue: (r: Recibo) => mesAnio(r.anio, r.mes),
      },
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
          onRowContextMenu={(row, e) =>
            setCtx({ x: e.clientX, y: e.clientY, row })
          }
        />
      </div>

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          data-testid="recibos-ctx"
        >
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

      {ver ? (
        <VerReciboModal recibo={ver} onClose={() => setVer(null)} />
      ) : null}
      {validar ? (
        <ValidarReciboModal recibo={validar} onClose={() => setValidar(null)} />
      ) : null}
    </RequirePermission>
  )
}
