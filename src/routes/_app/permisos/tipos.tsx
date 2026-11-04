import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { actualizarTipoPermiso, crearTipoPermiso, listTiposPermiso } from '#/services/permisos'
import type { TipoPermiso } from '#/services/permisos'

export const Route = createFileRoute('/_app/permisos/tipos')({
  component: TiposPermisoPage,
})

const col = createColumnHelper<TipoPermiso>()

function TiposPermisoPage() {
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({
    queryKey: ['permisos-tipos', 'todos'],
    queryFn: () => listTiposPermiso(true),
  })
  const [editar, setEditar] = useState<{ tipo: TipoPermiso | null } | null>(null)

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
        />
      </div>

      {editar ? <TipoPermisoModal tipo={editar.tipo} onClose={() => setEditar(null)} /> : null}
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
