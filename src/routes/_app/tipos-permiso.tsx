import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { useAccionPalette } from '#/hooks/use-accion-palette'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  actualizarTipoPermiso,
  crearTipoPermiso,
  desactivarTipoPermiso,
  listTiposPermiso,
} from '#/services/permisos'
import type { TipoPermiso } from '#/services/permisos'

export const Route = createFileRoute('/_app/tipos-permiso')({
  component: TiposPermisoPage,
})

const col = createColumnHelper<TipoPermiso>()

function TiposPermisoPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({
    queryKey: ['permisos-tipos', 'todos'],
    queryFn: () => listTiposPermiso(true),
  })
  const [editar, setEditar] = useState<{ tipo: TipoPermiso | null } | null>(null)
  const [desactivar, setDesactivar] = useState<TipoPermiso | null>(null)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: TipoPermiso } | null>(null)

  useAccionPalette('nuevo-tipo-permiso', () => setEditar({ tipo: null }))

  const cerrarCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', cerrarCtx)
    return () => window.removeEventListener('click', cerrarCtx)
  }, [ctx, cerrarCtx])

  const desactivarMut = useMutation({
    mutationFn: (t: TipoPermiso) => desactivarTipoPermiso(t.id),
    onSuccess: () => {
      toast.success('Tipo desactivado')
      qc.invalidateQueries({ queryKey: ['permisos-tipos'] })
      setDesactivar(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('nombre', { header: 'Tipo de permiso' }),
      col.accessor('orden', { header: 'Orden' }),
      col.accessor((r) => (r.status === 'ACTIVE' ? 'Activo' : 'Inactivo'), {
        id: 'status',
        header: 'Estado',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: 'Estado',
        getValue: (r: TipoPermiso) => (r.status === 'ACTIVE' ? 'Activo' : 'Inactivo'),
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando tipos de permiso…</div>

  return (
    <RequirePermission permission="tipos_permiso:get">
      <div data-testid="tipos-permiso-page">
        <DataTable
          title="Tipos de permiso"
          data={data}
          columns={columns}
          filters={filters}
          addLabel="Agregar"
          canAdd={can('tipos_permiso:post')}
          onAdd={() => setEditar({ tipo: null })}
          exportFilename="tipos-de-permiso"
          exportRows={data.map((t) => ({
            nombre: t.nombre,
            orden: t.orden,
            estado: t.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
          }))}
          onRowDoubleClick={(row) => can('tipos_permiso:post') && setEditar({ tipo: row })}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="tipos-permiso-ctx">
          <button
            type="button"
            className="ctx-menu__item"
            onClick={() => {
              setEditar({ tipo: ctx.row })
              cerrarCtx()
            }}
          >
            Editar
          </button>
          {ctx.row.status === 'ACTIVE' ? (
            <button
              type="button"
              className="ctx-menu__item ctx-menu__item--danger"
              data-testid="tipo-permiso-desactivar"
              onClick={() => {
                setDesactivar(ctx.row)
                cerrarCtx()
              }}
            >
              Desactivar
            </button>
          ) : null}
        </div>
      ) : null}

      {editar ? <TipoPermisoModal tipo={editar.tipo} onClose={() => setEditar(null)} /> : null}

      <ConfirmDialog
        open={Boolean(desactivar)}
        title="Desactivar tipo de permiso"
        message={`«${desactivar?.nombre ?? ''}» dejará de aparecer en el wizard del padre. Los permisos ya enviados no cambian.`}
        confirmLabel="Desactivar"
        danger
        confirmDisabled={desactivarMut.isPending}
        testId="tipo-permiso-confirmar-desactivar"
        onConfirm={() => desactivar && desactivarMut.mutate(desactivar)}
        onCancel={() => setDesactivar(null)}
      />
    </RequirePermission>
  )
}

function TipoPermisoModal({ tipo, onClose }: { tipo: TipoPermiso | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState(tipo?.nombre ?? '')
  const [orden, setOrden] = useState(String(tipo?.orden ?? 0))
  const [status, setStatus] = useState(tipo?.status ?? 'ACTIVE')

  const mut = useMutation({
    mutationFn: () =>
      tipo
        ? actualizarTipoPermiso(tipo.id, { nombre: nombre.trim(), orden: Number(orden) || 0, status })
        : crearTipoPermiso({ nombre: nombre.trim(), orden: Number(orden) || 0, status }),
    onSuccess: () => {
      toast.success(tipo ? 'Tipo actualizado' : 'Tipo creado')
      qc.invalidateQueries({ queryKey: ['permisos-tipos'] })
      onClose()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  return (
    <Modal
      open
      title={tipo ? 'Editar tipo de permiso' : 'Nuevo tipo de permiso'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="tipo-permiso-guardar"
            disabled={!nombre.trim() || mut.isPending}
            onClick={() => mut.mutate()}
          >
            Guardar
          </button>
        </>
      }
    >
      <Field label="Nombre" htmlFor="tipo-permiso-nombre">
        <input
          id="tipo-permiso-nombre"
          className="field__input"
          data-testid="tipo-permiso-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </Field>
      <Field label="Orden" htmlFor="tipo-permiso-orden">
        <input
          id="tipo-permiso-orden"
          type="number"
          min={0}
          className="field__input"
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
        />
      </Field>
      <Field label="Estado" htmlFor="tipo-permiso-status">
        <select
          id="tipo-permiso-status"
          className="field__input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
      </Field>
    </Modal>
  )
}
