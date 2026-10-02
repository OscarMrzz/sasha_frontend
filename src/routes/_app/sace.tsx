import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RequirePermission } from '#/components/gates/Can'
import { SaceMaestroModal } from '#/components/sace/SaceMaestroModal'
import { DataTable } from '#/components/ui/DataTable'
import { listMaestrosSace } from '#/services/sace'
import type { MaestroSaceResumen } from '#/services/sace'

export const Route = createFileRoute('/_app/sace')({ component: SacePage })

const col = createColumnHelper<MaestroSaceResumen>()

function SacePage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['sace-maestros'], queryFn: listMaestrosSace })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: MaestroSaceResumen } | null>(null)
  const [ver, setVer] = useState<MaestroSaceResumen | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Código' }),
      col.accessor('nombre', { header: 'Maestro' }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'materia',
        label: 'Materia',
        getValue: (r: MaestroSaceResumen) => r.materias[0] ?? '',
        getOptionValues: (r: MaestroSaceResumen) => r.materias,
        matches: (r: MaestroSaceResumen, v: string) => r.materias.includes(v),
      },
      {
        id: 'grado',
        label: 'Grado',
        getValue: (r: MaestroSaceResumen) => r.grados[0] ?? '',
        getOptionValues: (r: MaestroSaceResumen) => r.grados,
        matches: (r: MaestroSaceResumen, v: string) => r.grados.includes(v),
      },
      {
        id: 'seccion',
        label: 'Sección',
        getValue: (r: MaestroSaceResumen) => r.secciones[0] ?? '',
        getOptionValues: (r: MaestroSaceResumen) => r.secciones,
        matches: (r: MaestroSaceResumen, v: string) => r.secciones.includes(v),
      },
    ],
    [],
  )

  return (
    <RequirePermission permission="sace:get">
      {isLoading ? (
        <div className="empty-state">Cargando maestros…</div>
      ) : (
        <DataTable
          title="Export SACE"
          data={data}
          columns={columns}
          filters={tableFilters}
          canAdd={false}
          onRowDoubleClick={(row) => setVer(row)}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      )}

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="sace-ctx-menu">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="sace-ctx-ver"
            onClick={() => {
              setVer(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
        </div>
      ) : null}

      {ver ? <SaceMaestroModal maestro={ver} onClose={() => setVer(null)} /> : null}
    </RequirePermission>
  )
}
