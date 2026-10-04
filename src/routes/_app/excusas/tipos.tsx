import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { TipoExcusaModal } from '#/components/excusas/TipoExcusaModal'
import { Can, RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { userMessageFromError } from '#/lib/api'
import { listTiposExcusa, updateTipoExcusa } from '#/services/excusas'
import type { TipoExcusa } from '#/services/excusas'

export const Route = createFileRoute('/_app/excusas/tipos')({ component: TiposExcusaPage })

const col = createColumnHelper<TipoExcusa>()

const estadoLabel = (s: string) => (s === 'ACTIVE' ? 'Activo' : 'Inactivo')

function TiposExcusaPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({
    queryKey: ['excusas-tipos', 'todos'],
    queryFn: () => listTiposExcusa(true),
  })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: TipoExcusa } | null>(null)
  const [editar, setEditar] = useState<{ tipo: TipoExcusa | null } | null>(null)
  const [toggle, setToggle] = useState<TipoExcusa | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const toggleMut = useMutation({
    mutationFn: (t: TipoExcusa) =>
      updateTipoExcusa(t.id, { nombre: t.nombre, status: t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    onSuccess: (t) => {
      toast.success(t.status === 'ACTIVE' ? 'Tipo activado' : 'Tipo desactivado')
      qc.invalidateQueries({ queryKey: ['excusas-tipos'] })
      setToggle(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('nombre', { header: 'Tipo de excusa' }),
      col.accessor('usos', { header: 'Excusas registradas' }),
      col.accessor((r) => estadoLabel(r.status), {
        id: 'status',
        header: 'Estado',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [{ id: 'status', label: 'Estado', getValue: (r: TipoExcusa) => estadoLabel(r.status) }],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando tipos de excusa…</div>

  return (
    <RequirePermission permission="tipos_excusa:post">
      <div data-testid="tipos-excusa-page">
        <DataTable
          title="Tipos de excusa"
          data={data}
          columns={columns}
          filters={filters}
          addLabel="Agregar"
          canAdd={can('tipos_excusa:post')}
          onAdd={() => setEditar({ tipo: null })}
          exportFilename="tipos-de-excusa"
          exportRows={data.map((t) => ({ nombre: t.nombre, excusas: t.usos, estado: estadoLabel(t.status) }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          onRowDoubleClick={(row) => can('tipos_excusa:post') && setEditar({ tipo: row })}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="tipos-excusa-ctx">
          <Can permission="tipos_excusa:post">
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="tipos-excusa-ctx-editar"
              onClick={() => {
                setEditar({ tipo: ctx.row })
                closeCtx()
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className={`ctx-menu__item${ctx.row.status === 'ACTIVE' ? ' ctx-menu__item--danger' : ''}`}
              onClick={() => {
                setToggle(ctx.row)
                closeCtx()
              }}
            >
              {ctx.row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
            </button>
          </Can>
        </div>
      ) : null}

      {editar ? <TipoExcusaModal tipo={editar.tipo} onClose={() => setEditar(null)} /> : null}

      <ConfirmDialog
        open={Boolean(toggle)}
        title={toggle?.status === 'ACTIVE' ? 'Desactivar tipo' : 'Activar tipo'}
        message={
          toggle?.status === 'ACTIVE'
            ? `«${toggle.nombre}» ya no se podrá elegir al registrar excusas. Las excusas ya registradas no cambian.`
            : `«${toggle?.nombre ?? ''}» volverá a estar disponible al registrar excusas.`
        }
        danger={toggle?.status === 'ACTIVE'}
        confirmLabel={toggle?.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
        onConfirm={() => toggle && toggleMut.mutate(toggle)}
        onCancel={() => setToggle(null)}
      />
    </RequirePermission>
  )
}
