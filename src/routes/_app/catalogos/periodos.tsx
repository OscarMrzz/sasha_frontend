import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { ParcialesPeriodoModal } from '#/components/catalogos/ParcialesPeriodoModal'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  createPeriodo,
  deletePeriodo,
  listPeriodos,
  updatePeriodo,
  type Periodo,
  type PeriodoCreate,
} from '#/services/catalogos'
import { periodoEstadoPalabra } from '#/helpers/periodos'

export const Route = createFileRoute('/_app/catalogos/periodos')({ component: PeriodosPage })

const col = createColumnHelper<Periodo>()
const defaultForm: PeriodoCreate = {
  nombre: '',
  anio_lectivo: new Date().getFullYear(),
  fecha_inicio: '',
  fecha_fin: '',
  status: 'INACTIVE',
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
]

function PeriodosPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })

  const [modalOpen, setModalOpen] = useState(false)
  const [viewOnly, setViewOnly] = useState(false)
  const [editing, setEditing] = useState<Periodo | null>(null)
  const [form, setForm] = useState<PeriodoCreate>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Periodo | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Periodo } | null>(null)
  const [parcialesDe, setParcialesDe] = useState<Periodo | null>(null)

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

  const openEdit = (row: Periodo, view = false) => {
    setEditing(row)
    setViewOnly(view)
    setForm({
      nombre: row.nombre,
      anio_lectivo: row.anio_lectivo,
      fecha_inicio: row.fecha_inicio.slice(0, 10),
      fecha_fin: row.fecha_fin.slice(0, 10),
      status: row.status,
    })
    setModalOpen(true)
    closeCtx()
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) return updatePeriodo(editing.id, form)
      return createPeriodo(form)
    },
    onSuccess: () => {
      toast.success(editing ? 'Periodo actualizado' : 'Periodo creado')
      qc.invalidateQueries({ queryKey: ['periodos'] })
      setModalOpen(false)
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePeriodo(id),
    onSuccess: () => {
      toast.success('Periodo eliminado')
      qc.invalidateQueries({ queryKey: ['periodos'] })
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('anio_lectivo', { header: 'Año lectivo' }),
      col.accessor('fecha_inicio', {
        header: 'Inicio',
        cell: (i) => String(i.getValue()).slice(0, 10),
      }),
      col.accessor('fecha_fin', {
        header: 'Fin',
        cell: (i) => String(i.getValue()).slice(0, 10),
      }),
      col.accessor('status', {
        header: 'Estado',
        cell: (i) => {
          const activo = i.getValue() === 'ACTIVE'
          return (
            <span className={`badge${activo ? '' : ' badge--muted'}`}>
              {periodoEstadoPalabra(String(i.getValue()))}
            </span>
          )
        },
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'nombre', label: 'Nombre', getValue: (r: Periodo) => r.nombre },
      { id: 'anio_lectivo', label: 'Año lectivo', getValue: (r: Periodo) => String(r.anio_lectivo) },
      {
        id: 'status',
        label: 'Estado',
        getValue: (r: Periodo) => r.status,
        getLabel: (r: Periodo) => periodoEstadoPalabra(r.status),
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando periodos…</div>

  return (
    <RequirePermission permission="catalogos:get">
      <DataTable
        title="Periodos académicos"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Agregar periodo"
        canAdd={can('catalogos:post')}
        onAdd={openCreate}
        exportFilename="periodos"
        exportRows={data.map((p) => ({
          nombre: p.nombre,
          anio: p.anio_lectivo,
          inicio: p.fecha_inicio,
          fin: p.fecha_fin,
          status: p.status,
        }))}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button type="button" className="ctx-menu__item" onClick={() => openEdit(ctx.row, true)}>
            Ver
          </button>
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="periodo-ctx-parciales"
            onClick={() => {
              setParcialesDe(ctx.row)
              closeCtx()
            }}
          >
            Parciales
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
        title={viewOnly ? 'Ver periodo' : editing ? 'Editar periodo' : 'Nuevo periodo'}
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
        <Field label="Nombre" htmlFor="periodo-nombre">
          <input
            id="periodo-nombre"
            className="field__input"
            data-testid="periodo-nombre-input"
            disabled={viewOnly}
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Field>
        <Field label="Año lectivo">
          <input
            type="number"
            className="field__input"
            disabled={viewOnly}
            value={form.anio_lectivo}
            onChange={(e) => setForm((f) => ({ ...f, anio_lectivo: Number(e.target.value) }))}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Fecha inicio">
            <input
              type="date"
              className="field__input"
              disabled={viewOnly}
              value={form.fecha_inicio}
              onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
            />
          </Field>
          <Field label="Fecha fin">
            <input
              type="date"
              className="field__input"
              disabled={viewOnly}
              value={form.fecha_fin}
              onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
            />
          </Field>
        </div>
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
        message={
          form.status === 'ACTIVE'
            ? '¿Guardar el periodo como activo? Si había otro activo, pasará a inactivo.'
            : '¿Guardar los datos del periodo?'
        }
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar periodo"
        message={`¿Eliminar "${confirmDelete?.nombre}"?`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
      <ParcialesPeriodoModal periodo={parcialesDe} onClose={() => setParcialesDe(null)} />
    </RequirePermission>
  )
}
