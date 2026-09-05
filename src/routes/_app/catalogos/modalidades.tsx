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
  createModalidad,
  deleteModalidad,
  listModalidades,
  updateModalidad,
  type Modalidad,
  type ModalidadCreate,
} from '#/services/catalogos'

export const Route = createFileRoute('/_app/catalogos/modalidades')({ component: ModalidadesPage })

const col = createColumnHelper<Modalidad>()
const DIAS = [
  { n: 1, label: 'Lunes' },
  { n: 2, label: 'Martes' },
  { n: 3, label: 'Miércoles' },
  { n: 4, label: 'Jueves' },
  { n: 5, label: 'Viernes' },
]

const defaultForm: ModalidadCreate = {
  nombre: '',
  hora_inicio: '07:00',
  hora_fin: '12:00',
  status: 'ACTIVE',
  dias: [1, 2, 3, 4, 5],
}

function ModalidadesPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['modalidades'], queryFn: listModalidades })

  const [modalOpen, setModalOpen] = useState(false)
  const [viewOnly, setViewOnly] = useState(false)
  const [editing, setEditing] = useState<Modalidad | null>(null)
  const [form, setForm] = useState<ModalidadCreate>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Modalidad | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Modalidad } | null>(null)

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

  const openEdit = (row: Modalidad, view = false) => {
    setEditing(row)
    setViewOnly(view)
    setForm({
      nombre: row.nombre,
      hora_inicio: row.hora_inicio,
      hora_fin: row.hora_fin,
      status: row.status,
      dias: [1, 2, 3, 4, 5],
      detalles: row.detalles,
    })
    setModalOpen(true)
    closeCtx()
  }

  const toggleDia = (n: number) => {
    setForm((f) => ({
      ...f,
      dias: f.dias.includes(n) ? f.dias.filter((d) => d !== n) : [...f.dias, n].sort(),
    }))
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) return updateModalidad(editing.id, form)
      return createModalidad(form)
    },
    onSuccess: () => {
      toast.success(editing ? 'Modalidad actualizada' : 'Modalidad creada')
      qc.invalidateQueries({ queryKey: ['modalidades'] })
      setModalOpen(false)
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteModalidad(id),
    onSuccess: () => {
      toast.success('Modalidad eliminada')
      qc.invalidateQueries({ queryKey: ['modalidades'] })
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Código' }),
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('hora_inicio', { header: 'Inicio' }),
      col.accessor('hora_fin', { header: 'Fin' }),
      col.accessor('status', { header: 'Estado', cell: (i) => <span className="badge">{i.getValue()}</span> }),
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando modalidades…</div>

  return (
    <RequirePermission permission="catalogos:get">
      <h1 className="page-title">Modalidades</h1>
      <DataTable
        data={data}
        columns={columns}
        addLabel="Agregar modalidad"
        canAdd={can('catalogos:post')}
        onAdd={openCreate}
        onExport={() =>
          downloadCsv(
            'modalidades.csv',
            data.map((m) => ({
              codigo: m.codigo,
              nombre: m.nombre,
              hora_inicio: m.hora_inicio,
              hora_fin: m.hora_fin,
              status: m.status,
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
        title={viewOnly ? 'Ver modalidad' : editing ? 'Editar modalidad' : 'Nueva modalidad'}
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
                <button type="button" className="btn btn--primary" onClick={() => setConfirmSave(true)}>
                  Guardar
                </button>
              </Can>
            </>
          )
        }
      >
        <Field label="Nombre" htmlFor="modalidad-nombre">
          <input
            id="modalidad-nombre"
            className="field__input"
            data-testid="modalidad-nombre-input"
            disabled={viewOnly}
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Hora inicio">
            <input
              type="time"
              className="field__input"
              disabled={viewOnly}
              value={form.hora_inicio}
              onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
            />
          </Field>
          <Field label="Hora fin">
            <input
              type="time"
              className="field__input"
              disabled={viewOnly}
              value={form.hora_fin}
              onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))}
            />
          </Field>
        </div>
        <Field label="Días de clase">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {DIAS.map(({ n, label }) => (
              <label key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  data-testid={`modalidad-dia-${n}`}
                  disabled={viewOnly}
                  checked={form.dias.includes(n)}
                  onChange={() => toggleDia(n)}
                />
                {label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Estado">
          <select
            className="field__select"
            disabled={viewOnly}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar guardado"
        message="¿Guardar los datos de la modalidad?"
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar modalidad"
        message={`¿Eliminar "${confirmDelete?.nombre}"?`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </RequirePermission>
  )
}
