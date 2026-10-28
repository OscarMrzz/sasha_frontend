import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Can, RequirePermission } from '#/components/gates/Can'
import { TiposPagoPeriodoModal } from '#/components/pagos/TiposPagoPeriodoModal'
import { DataTable } from '#/components/ui/DataTable'
import { periodoEstadoPalabra } from '#/helpers/periodos'
import { listTiposPagoPeriodos } from '#/services/pagos-tipos'
import type { PeriodoTiposPago } from '#/services/pagos-tipos'

export const Route = createFileRoute('/_app/tipos-pagos')({
  component: TiposPagosPage,
})

const col = createColumnHelper<PeriodoTiposPago>()

const money = (v: number) =>
  new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(v)

function TiposPagosPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['pagos-tipos-periodos'],
    queryFn: listTiposPagoPeriodos,
  })
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoTiposPago | null>(null)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: PeriodoTiposPago } | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const handler = () => closeCtx()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [ctx, closeCtx])

  const columns = useMemo(
    () => [
      col.accessor('nombre', {
        header: 'Periodo',
        cell: (i) => (
          <span data-testid={`tipos-pagos-periodo-${i.row.original.id}`}>{i.getValue()}</span>
        ),
      }),
      col.accessor('anio_lectivo', { header: 'Año lectivo' }),
      col.accessor('status', {
        header: 'Estado',
        cell: (i) => {
          const v = String(i.getValue())
          const cls = v === 'ACTIVE' ? '' : v === 'FINALIZED' ? ' badge--warn' : ' badge--muted'
          return <span className={`badge${cls}`}>{periodoEstadoPalabra(v)}</span>
        },
      }),
      col.accessor('tipos_total', {
        header: 'Tipos',
        cell: (i) => (
          <span data-testid={`tipos-pagos-tipos-${i.row.original.id}`}>
            {i.getValue()} ({i.row.original.tipos_adicionales} adicionales)
          </span>
        ),
      }),
      col.accessor('meses_cobro', {
        header: 'Meses',
        cell: (i) => (
          <span data-testid={`tipos-pagos-meses-${i.row.original.id}`}>
            {i.getValue()} {i.getValue() === 1 ? 'mes' : 'meses'}
            {i.row.original.meses_modo === 'manual' ? ' · manual' : ' · automático'}
          </span>
        ),
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'anio_lectivo',
        label: 'Año lectivo',
        getValue: (r: PeriodoTiposPago) => String(r.anio_lectivo),
      },
      {
        id: 'status',
        label: 'Estado',
        getValue: (r: PeriodoTiposPago) => r.status,
        getLabel: (r: PeriodoTiposPago) => periodoEstadoPalabra(r.status),
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando periodos…</div>

  return (
    <RequirePermission permission="pagos_config:get">
      <DataTable
        title="Tipos pagos"
        data={data}
        columns={columns}
        filters={tableFilters}
        canAdd={false}
        exportFilename="tipos-pagos"
        exportRows={data.map((p) => ({
          periodo: p.nombre,
          anio: p.anio_lectivo,
          estado: periodoEstadoPalabra(p.status),
          tipos: p.tipos_total,
          adicionales: p.tipos_adicionales,
          meses: p.meses_cobro,
          modo_meses: p.meses_modo,
          pendientes: p.obligaciones_pendientes,
          monto_pendiente: money(p.monto_pendiente),
        }))}
        searchText={(p) =>
          `${p.nombre} ${p.anio_lectivo} ${p.meses_cobro} ${p.meses_modo}`
        }
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        onRowDoubleClick={(row) => setPeriodoActivo(row)}
        card={{
          title: (p) => p.nombre,
          fields: (p) => [
            { label: 'Año lectivo', value: p.anio_lectivo },
            { label: 'Tipos', value: `${p.tipos_total} (${p.tipos_adicionales} adicionales)` },
            { label: 'Meses', value: `${p.meses_cobro} · ${p.meses_modo}` },
          ],
          status: (p) => ({
            label: periodoEstadoPalabra(p.status),
            tone: p.status === 'ACTIVE' ? 'ok' : 'espera',
          }),
          testId: (p) => `tipos-pagos-card-${p.id}`,
        }}
        rowActions={(p) => [
          {
            label: 'Abrir',
            onClick: () => setPeriodoActivo(p),
            testId: `tipos-pagos-row-ver-${p.id}`,
          },
        ]}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="tipos-pagos-ctx">
          <Can permission="pagos_config:get">
            <button
              type="button"
              className="ctx-menu__item"
              data-testid={`tipos-pagos-ctx-ver-${ctx.row.id}`}
              onClick={() => {
                setPeriodoActivo(ctx.row)
                closeCtx()
              }}
            >
              Abrir
            </button>
          </Can>
        </div>
      ) : null}

      {periodoActivo ? (
        <TiposPagoPeriodoModal
          periodo={periodoActivo}
          onClose={() => setPeriodoActivo(null)}
        />
      ) : null}
    </RequirePermission>
  )
}
