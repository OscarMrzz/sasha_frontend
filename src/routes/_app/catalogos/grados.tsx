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

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

/** Nivel académico 1.º–12.º; se persiste como `orden` en API. */
const NIVELES_ACADEMICOS = [
  { nivel: 1, label: 'Primer grado' },
  { nivel: 2, label: 'Segundo grado' },
  { nivel: 3, label: 'Tercer grado' },
  { nivel: 4, label: 'Cuarto grado' },
  { nivel: 5, label: 'Quinto grado' },
  { nivel: 6, label: 'Sexto grado' },
  { nivel: 7, label: 'Séptimo grado' },
  { nivel: 8, label: 'Octavo grado' },
  { nivel: 9, label: 'Noveno grado' },
  { nivel: 10, label: 'Décimo grado' },
  { nivel: 11, label: 'Undécimo grado' },
  { nivel: 12, label: 'Duodécimo grado' },
] as const

function labelNivel(orden: number) {
  return NIVELES_ACADEMICOS.find((n) => n.nivel === orden)?.label ?? `Nivel ${orden}`
}

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
      col.accessor('orden', {
        header: 'Nivel académico',
        cell: (i) => labelNivel(i.getValue()),
      }),
      col.accessor('status', {
        header: 'Estado',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'nombre', label: 'Nombre', getValue: (r: Grado) => r.nombre },
      { id: 'status', label: 'Estado', getValue: (r: Grado) => r.status },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando grados…</div>

  return (
    <RequirePermission permission="catalogos:get">
      <DataTable
        title="Grados"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Agregar grado"
        canAdd={can('catalogos:post')}
        onAdd={openCreate}
        onExport={() =>
          downloadCsv(
            'grados.csv',
            data.map((g) => ({
              codigo: g.codigo,
              nombre: g.nombre,
              nivel_academico: labelNivel(g.orden),
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
        <Field label="Nivel académico">
          <div className="nivel-check" role="radiogroup" aria-label="Nivel académico">
            {NIVELES_ACADEMICOS.map((n) => {
              const taken = data.some((g) => g.orden === n.nivel && g.id !== editing?.id)
              const selected = form.orden === n.nivel
              return (
                <label
                  key={n.nivel}
                  className={`nivel-check__item${selected ? ' nivel-check__item--on' : ''}${
                    taken ? ' nivel-check__item--taken' : ''
                  }`}
                  title={taken ? `${n.label} (ya registrado)` : n.label}
                >
                  <input
                    type="radio"
                    name="grado-nivel"
                    disabled={viewOnly || taken}
                    checked={selected}
                    aria-label={n.label}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        orden: n.nivel,
                        nombre:
                          !f.nombre.trim() || NIVELES_ACADEMICOS.some((x) => x.label === f.nombre)
                            ? n.label
                            : f.nombre,
                      }))
                    }
                  />
                  <span className="nivel-check__mark" aria-hidden />
                  <span className="nivel-check__num">{n.nivel}.º</span>
                </label>
              )
            })}
          </div>
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
        <Field label="Estado" htmlFor="grado-status">
          <Combobox
            id="grado-status"
            disabled={viewOnly}
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={STATUS_OPTIONS}
            placeholder="Buscar estado…"
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
