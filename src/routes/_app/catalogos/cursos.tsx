import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AsignacionFormModal } from '#/components/asignacion/AsignacionFormModal'
import { CursoVerModal } from '#/components/catalogos/CursoVerModal'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  createCurso,
  deleteCurso,
  listCursos,
  updateCurso,
  type Curso,
  type CursoCreate,
} from '#/services/catalogos'

export const Route = createFileRoute('/_app/catalogos/cursos')({ component: CursosPage })

const col = createColumnHelper<Curso>()
const defaultForm: CursoCreate = { nombre: '', horas_semana_minimas: 2, status: 'ACTIVE' }

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

function CursosPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['cursos'], queryFn: listCursos })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Curso | null>(null)
  const [form, setForm] = useState<CursoCreate>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Curso | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Curso } | null>(null)
  const [verCurso, setVerCurso] = useState<Curso | null>(null)
  const [asignarCurso, setAsignarCurso] = useState<Curso | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const openCreate = () => {
    setEditing(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = (row: Curso) => {
    setEditing(row)
    setForm({
      nombre: row.nombre,
      horas_semana_minimas: row.horas_semana_minimas,
      status: row.status,
      codigo_sace: row.codigo_sace,
      detalles: row.detalles,
    })
    setModalOpen(true)
    closeCtx()
  }

  const openVer = (row: Curso) => {
    setVerCurso(row)
    closeCtx()
  }

  const openAsignar = (row: Curso) => {
    setAsignarCurso(row)
    closeCtx()
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) return updateCurso(editing.id, form)
      return createCurso(form)
    },
    onSuccess: () => {
      toast.success(editing ? 'Curso actualizado' : 'Curso creado')
      qc.invalidateQueries({ queryKey: ['cursos'] })
      setModalOpen(false)
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCurso(id),
    onSuccess: () => {
      toast.success('Curso eliminado')
      qc.invalidateQueries({ queryKey: ['cursos'] })
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Código' }),
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('horas_semana_minimas', { header: 'Horas/semana' }),
      col.accessor('status', { header: 'Estado', cell: (i) => <span className="badge">{i.getValue()}</span> }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'nombre', label: 'Nombre', getValue: (r: Curso) => r.nombre },
      { id: 'status', label: 'Estado', getValue: (r: Curso) => r.status },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando cursos…</div>

  return (
    <RequirePermission permission="catalogos:get">
      <DataTable
        title="Cursos"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Agregar curso"
        canAdd={can('catalogos:post')}
        onAdd={openCreate}
        exportFilename="cursos"
        exportRows={data.map((c) => ({
          codigo: c.codigo,
          nombre: c.nombre,
          horas: c.horas_semana_minimas,
          status: c.status,
        }))}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button type="button" className="ctx-menu__item" onClick={() => openVer(ctx.row)}>
            Ver
          </button>
          <Can permission="asignacion:post">
            <button type="button" className="ctx-menu__item" onClick={() => openAsignar(ctx.row)}>
              Asignar maestro
            </button>
          </Can>
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
        title={editing ? 'Editar curso' : 'Nuevo curso'}
        onClose={() => setModalOpen(false)}
        footer={
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
        }
      >
        <Field label="Nombre" htmlFor="curso-nombre">
          <input
            id="curso-nombre"
            className="field__input"
            data-testid="curso-nombre-input"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Field>
        <Field label="Horas semana mínimas">
          <input
            type="number"
            className="field__input"
            value={form.horas_semana_minimas}
            onChange={(e) => setForm((f) => ({ ...f, horas_semana_minimas: Number(e.target.value) }))}
          />
        </Field>
        <Field label="Estado">
          <Combobox
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={STATUS_OPTIONS}
            placeholder="Buscar estado…"
          />
        </Field>
        <Field label="Código SACE">
          <input
            className="field__input"
            value={form.codigo_sace ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, codigo_sace: e.target.value }))}
          />
        </Field>
      </Modal>

      <CursoVerModal
        open={Boolean(verCurso)}
        curso={verCurso}
        onClose={() => setVerCurso(null)}
        onAsignar={
          verCurso
            ? () => {
                setAsignarCurso(verCurso)
                setVerCurso(null)
              }
            : undefined
        }
      />

      <AsignacionFormModal
        open={Boolean(asignarCurso)}
        cursoId={asignarCurso?.id}
        cursoNombre={asignarCurso?.nombre}
        onClose={() => setAsignarCurso(null)}
      />

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar guardado"
        message="¿Guardar los datos del curso?"
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar curso"
        message={`¿Eliminar "${confirmDelete?.nombre}"?`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </RequirePermission>
  )
}
