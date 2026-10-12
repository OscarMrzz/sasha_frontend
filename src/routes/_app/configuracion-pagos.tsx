import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Can, RequirePermission } from '#/components/gates/Can'
import { ConfiguracionPagosModal } from '#/components/pagos/ConfiguracionPagosModal'
import { DataTable } from '#/components/ui/DataTable'
import { periodoEstadoPalabra } from '#/helpers/periodos'
import { listPeriodosConfig } from '#/services/pagos-config'
import type { PeriodoConfigLista } from '#/services/pagos-config'

export const Route = createFileRoute('/_app/configuracion-pagos')({
  component: ConfiguracionPagosPage,
})

const col = createColumnHelper<PeriodoConfigLista>()

function ConfiguracionPagosPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['pagos-config-periodos'],
    queryFn: listPeriodosConfig,
  })
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoConfigLista | null>(null)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: PeriodoConfigLista } | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const handler = () => closeCtx()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [ctx, closeCtx])

  const columns = useMemo(
    () => [
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('anio_lectivo', { header: 'Año lectivo' }),
      col.accessor('status', {
        header: 'Estado',
        cell: (i) => {
          const v = String(i.getValue())
          const cls = v === 'ACTIVE' ? '' : v === 'FINALIZED' ? ' badge--warn' : ' badge--muted'
          return <span className={`badge${cls}`}>{periodoEstadoPalabra(v)}</span>
        },
      }),
      col.display({
        id: 'acciones',
        header: 'Acciones',
        cell: (i) => {
          const row = i.row.original
          return (
            <span data-testid={`config-pagos-row-${row.id}`}>
              <Can permission="pagos_config:get">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  data-testid={`config-pagos-btn-${row.id}`}
                  onClick={() => setPeriodoActivo(row)}
                >
                  Configurar pagos
                </button>
              </Can>
            </span>
          )
        },
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'anio_lectivo',
        label: 'Año lectivo',
        getValue: (r: PeriodoConfigLista) => String(r.anio_lectivo),
      },
      {
        id: 'status',
        label: 'Estado',
        getValue: (r: PeriodoConfigLista) => r.status,
        getLabel: (r: PeriodoConfigLista) => periodoEstadoPalabra(r.status),
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando periodos…</div>

  return (
    <RequirePermission permission="pagos_config:get">
      <DataTable
        title="Configuración de pagos"
        data={data}
        columns={columns}
        filters={tableFilters}
        exportFilename="configuracion-pagos"
        exportRows={data.map((p) => ({
          nombre: p.nombre,
          anio: p.anio_lectivo,
          estado: periodoEstadoPalabra(p.status),
        }))}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="config-pagos-ctx">
          <Can permission="pagos_config:get">
            <button
              type="button"
              className="ctx-menu__item"
              data-testid={`config-pagos-ctx-${ctx.row.id}`}
              onClick={() => {
                setPeriodoActivo(ctx.row)
                closeCtx()
              }}
            >
              Configurar pagos
            </button>
          </Can>
        </div>
      ) : null}

      {periodoActivo ? (
        <ConfiguracionPagosModal
          periodo={periodoActivo}
          onClose={() => setPeriodoActivo(null)}
        />
      ) : null}
    </RequirePermission>
  )
}
