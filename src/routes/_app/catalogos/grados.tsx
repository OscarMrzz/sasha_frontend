import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { downloadCsv } from '#/helpers/export-csv'
import { userMessageFromError } from '#/lib/api'
import {
  createGrado,
  deleteGrado,
  listGrados,
  updateGrado,
  type Grado,
  type GradoCreate,
} from '#/services/catalogos'

export const Route = createFileRoute('/_app/catalogos/grados')({ component: GradosPage })

const col = createColumnHelper<Grado>()

const defaultForm: GradoCreate = { nombre: '', orden: 1, status: 'ACTIVE' }

function GradosPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['grados'], queryFn: listGrados })

  const [modalOpen, setModalOpen] = useState(false)
  const [viewOnly, setViewOnly] = useState(false)
  const [editing, setEditing] = useState<Grado | null>(null)
  const [form, setForm] = useState<GradoCreate>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Grado | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Grado } | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const openCreate = () => {
    setEditing(null)
    setViewOnly(false)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = (row: Grado, view = false) => {
    setEditing(row)
    setViewOnly(view)
    setForm({
      nombre: row.nombre,
      orden: row.orden,
      status: row.status,
      codigo_sace: row.codigo_sace,
      detalles: row.detalles,
    })
    setModalOpen(true)
    closeCtx()
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) return updateGrado(editing.id, form)
      return createGrado(form)
    },
    onSuccess: () => {
      toast.success(editing ? 'Grado actualizado' : 'Grado creado')
      qc.invalidateQueries({ queryKey: ['grados'] })
      setModalOpen(false)
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteGrado(id),
    onSuccess: () => {
      toast.success('Grado eliminado')
      qc.invalidateQueries({ queryKey: ['grados'] })
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Código' }),
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('orden', { header: 'Orden' }),
      col.accessor('status', {
        header: 'Estado',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando grados…</div>

  return (
    <RequirePermission permission="catalogos:get">
      <h1 className="page-title">Grados</h1>
      <DataTable
        data={data}
        columns={columns}
        addLabel="Agregar grado"
        canAdd={can('catalogos:post')}
        onAdd={openCreate}
        onExport={() =>
          downloadCsv(
            'grados.csv',
            data.map((g) => ({
              codigo: g.codigo,
              nombre: g.nombre,
              orden: g.orden,
              status: g.status,
            })),
          )
        }
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button type="button" className="ctx-menu__item" onClick={() => openEdit(ctx.row, true)}>
            Ver
          </button>
          <Can permission="catalogos:put">
            <button type="button" className="ctx-menu__item" onClick={() => openEdit(ctx.row)}>
              Editar
            </button>
          </Can>
          <Can permission="catalogos:delete">
            <button
              type="button"
              className="ctx-menu__item ctx-menu__item--danger"
              onClick={() => {
                setConfirmDelete(ctx.row)
                closeCtx()
              }}
            >
              Eliminar
            </button>
          </Can>
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        title={viewOnly ? 'Ver grado' : editing ? 'Editar grado' : 'Nuevo grado'}
        onClose={() => setModalOpen(false)}
        footer={
          viewOnly ? (
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              Cerrar
            </button>
          ) : (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <Can permission={editing ? 'catalogos:put' : 'catalogos:post'}>
                <button
                  type="button"
                  className="btn btn--primary"
                  data-testid="grado-save-button"
                  onClick={() => setConfirmSave(true)}
                >
                  Guardar
                </button>
              </Can>
            </>
          )
        }
      >
        <Field label="Nombre" htmlFor="grado-nombre">
          <input
            id="grado-nombre"
            className="field__input"
            data-testid="grado-nombre-input"
            disabled={viewOnly}
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Field>
        <Field label="Orden" htmlFor="grado-orden">
          <input
            id="grado-orden"
            type="number"
            className="field__input"
            disabled={viewOnly}
            value={form.orden}
            onChange={(e) => setForm((f) => ({ ...f, orden: Number(e.target.value) }))}
          />
        </Field>
        <Field label="Estado" htmlFor="grado-status">
          <select
            id="grado-status"
            className="field__select"
            disabled={viewOnly}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </Field>
        <Field label="Código SACE">
          <input
            className="field__input"
            disabled={viewOnly}
            value={form.codigo_sace ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, codigo_sace: e.target.value }))}
          />
        </Field>
        <Field label="Detalles">
          <textarea
            className="field__textarea"
            disabled={viewOnly}
            rows={2}
            value={form.detalles ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, detalles: e.target.value }))}
          />
        </Field>
        {editing ? (
          <p className="texto-muted" style={{ fontSize: '0.8rem' }}>
            Código: <strong>{editing.codigo}</strong>
          </p>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar guardado"
        message="¿Guardar los datos del grado?"
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar grado"
        message={`¿Eliminar el grado "${confirmDelete?.nombre}"?`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </RequirePermission>
  )
}
