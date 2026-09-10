import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { downloadCsv } from '#/helpers/export-csv'
import { userMessageFromError } from '#/lib/api'
import {
  createSeccion,
  deleteSeccion,
  listGrados,
  listModalidades,
  listSecciones,
  updateSeccion,
  type Seccion,
  type SeccionCreate,
} from '#/services/catalogos'

export const Route = createFileRoute('/_app/catalogos/secciones')({ component: SeccionesPage })

const col = createColumnHelper<Seccion>()
const defaultForm: SeccionCreate = { nombre: '', grado_id: '', modalidad_id: '', status: 'ACTIVE' }

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

function SeccionesPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['secciones'], queryFn: listSecciones })
  const { data: grados = [] } = useQuery({ queryKey: ['grados'], queryFn: listGrados })
  const { data: modalidades = [] } = useQuery({ queryKey: ['modalidades'], queryFn: listModalidades })

  const gradoMap = useMemo(() => Object.fromEntries(grados.map((g) => [g.id, g.nombre])), [grados])
  const modalidadMap = useMemo(
    () => Object.fromEntries(modalidades.map((m) => [m.id, m.nombre])),
    [modalidades],
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [viewOnly, setViewOnly] = useState(false)
  const [editing, setEditing] = useState<Seccion | null>(null)
  const [form, setForm] = useState<SeccionCreate>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Seccion | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Seccion } | null>(null)

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

  const openEdit = (row: Seccion, view = false) => {
    setEditing(row)
    setViewOnly(view)
    setForm({
      nombre: row.nombre,
      grado_id: row.grado_id,
      modalidad_id: row.modalidad_id,
      status: row.status,
      codigo_sace: row.codigo_sace,
      detalles: row.detalles,
      cupo_maximo: row.cupo_maximo,
    })
    setModalOpen(true)
    closeCtx()
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) return updateSeccion(editing.id, form)
      return createSeccion(form)
    },
    onSuccess: () => {
      toast.success(editing ? 'Sección actualizada' : 'Sección creada')
      qc.invalidateQueries({ queryKey: ['secciones'] })
      setModalOpen(false)
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSeccion(id),
    onSuccess: () => {
      toast.success('Sección eliminada')
      qc.invalidateQueries({ queryKey: ['secciones'] })
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Código' }),
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('grado_id', { header: 'Grado', cell: (i) => gradoMap[i.getValue()] ?? i.getValue() }),
      col.accessor('modalidad_id', {
        header: 'Modalidad',
        cell: (i) => modalidadMap[i.getValue()] ?? i.getValue(),
      }),
      col.accessor('status', { header: 'Estado', cell: (i) => <span className="badge">{i.getValue()}</span> }),
    ],
    [gradoMap, modalidadMap],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'nombre', label: 'Nombre', getValue: (r: Seccion) => r.nombre },
      {
        id: 'grado',
        label: 'Grado',
        getValue: (r: Seccion) => r.grado_id,
        getLabel: (r: Seccion) => gradoMap[r.grado_id] ?? r.grado_id,
      },
      {
        id: 'modalidad',
        label: 'Modalidad',
        getValue: (r: Seccion) => r.modalidad_id,
        getLabel: (r: Seccion) => modalidadMap[r.modalidad_id] ?? r.modalidad_id,
      },
      { id: 'status', label: 'Estado', getValue: (r: Seccion) => r.status },
    ],
    [gradoMap, modalidadMap],
  )

  if (isLoading) return <div className="empty-state">Cargando secciones…</div>

  return (
    <RequirePermission permission="catalogos:get">
      <DataTable
        title="Secciones"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Agregar sección"
        canAdd={can('catalogos:post')}
        onAdd={openCreate}
        onExport={() =>
          downloadCsv(
            'secciones.csv',
            data.map((s) => ({
              codigo: s.codigo,
              nombre: s.nombre,
              grado: gradoMap[s.grado_id],
              modalidad: modalidadMap[s.modalidad_id],
              status: s.status,
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
        title={viewOnly ? 'Ver sección' : editing ? 'Editar sección' : 'Nueva sección'}
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
        <Field label="Nombre" htmlFor="seccion-nombre">
          <input
            id="seccion-nombre"
            className="field__input"
            data-testid="seccion-nombre-input"
            disabled={viewOnly}
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Field>
        <Field label="Grado" htmlFor="seccion-grado">
          <Combobox
            id="seccion-grado"
            data-testid="seccion-grado-select"
            disabled={viewOnly}
            value={form.grado_id}
            onChange={(v) => setForm((f) => ({ ...f, grado_id: v }))}
            options={grados.map((g) => ({ value: g.id, label: g.nombre, keywords: g.codigo }))}
            placeholder="Seleccione un grado"
          />
        </Field>
        <Field label="Modalidad" htmlFor="seccion-modalidad">
          <Combobox
            id="seccion-modalidad"
            data-testid="seccion-modalidad-select"
            disabled={viewOnly}
            value={form.modalidad_id}
            onChange={(v) => setForm((f) => ({ ...f, modalidad_id: v }))}
            options={modalidades.map((m) => ({ value: m.id, label: m.nombre, keywords: m.codigo }))}
            placeholder="Seleccione una modalidad"
          />
        </Field>
        <Field label="Cupo máximo">
          <input
            type="number"
            className="field__input"
            disabled={viewOnly}
            value={form.cupo_maximo ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                cupo_maximo: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          />
        </Field>
        <Field label="Estado">
          <Combobox
            disabled={viewOnly}
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={STATUS_OPTIONS}
            placeholder="Buscar estado…"
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar guardado"
        message="¿Guardar los datos de la sección?"
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar sección"
        message={`¿Eliminar "${confirmDelete?.nombre}"?`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </RequirePermission>
  )
}
