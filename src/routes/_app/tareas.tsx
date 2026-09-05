import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { listAsignaciones } from '#/services/asignacion'
import { createTarea, listTareasByAlumno, type TareaCreate } from '#/services/tareas'

export const Route = createFileRoute('/_app/tareas')({ component: TareasPage })

const col = createColumnHelper<{ tarea_id: string; titulo: string; entregado: boolean; puntos?: number; liberado: boolean }>()

function TareasPage() {
  const { data: asignaciones = [] } = useQuery({ queryKey: ['asignaciones'], queryFn: listAsignaciones })
  const [alumnoId, setAlumnoId] = useState('')
  const [searchId, setSearchId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [form, setForm] = useState<TareaCreate>({
    asignacion_docente_id: '',
    titulo: '',
    fecha_asignacion: new Date().toISOString().slice(0, 10),
    fecha_entrega: '',
  })

  const { data: tareas = [], isFetching, refetch } = useQuery({
    queryKey: ['tareas-alumno', searchId],
    queryFn: () => listTareasByAlumno(searchId),
    enabled: Boolean(searchId),
  })

  const createMut = useMutation({
    mutationFn: () => createTarea(form),
    onSuccess: () => {
      toast.success('Tarea creada')
      setModalOpen(false)
      setConfirmSave(false)
      if (searchId) refetch()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('titulo', { header: 'Título' }),
      col.accessor('entregado', { header: 'Entregado', cell: (i) => (i.getValue() ? 'Sí' : 'No') }),
      col.accessor('puntos', { header: 'Puntos', cell: (i) => i.getValue() ?? '—' }),
      col.accessor('liberado', { header: 'Liberado', cell: (i) => (i.getValue() ? 'Sí' : 'No') }),
    ],
    [],
  )

  return (
    <RequirePermission permission="tareas:get">
      <h1 className="page-title">Tareas</h1>

      <div className="panel-toolbar" style={{ maxWidth: 720 }}>
        <div className="panel-toolbar__search">
          <Field label="Buscar por alumno ID">
            <input
              className="field__input"
              data-testid="tareas-alumno-search"
              value={alumnoId}
              onChange={(e) => setAlumnoId(e.target.value)}
              placeholder="UUID del alumno"
            />
          </Field>
        </div>
        <div className="panel-toolbar__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              if (!alumnoId.trim()) {
                toast.error('Ingresa un ID de alumno')
                return
              }
              setSearchId(alumnoId)
            }}
          >
            Buscar
          </button>
          <Can permission="tareas:post">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="add-tarea-button"
              onClick={() => setModalOpen(true)}
            >
              Nueva tarea
            </button>
          </Can>
        </div>
      </div>

      {searchId ? (
        isFetching ? (
          <div className="empty-state">Cargando tareas…</div>
        ) : (
          <DataTable data={tareas} columns={columns} searchPlaceholder="Filtrar tareas…" />
        )
      ) : (
        <div className="empty-state">Busca tareas por ID de alumno.</div>
      )}

      <Modal
        open={modalOpen}
        title="Nueva tarea"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <Can permission="tareas:post">
              <button type="button" className="btn btn--primary" onClick={() => setConfirmSave(true)}>
                Guardar
              </button>
            </Can>
          </>
        }
      >
        <Field label="Asignación docente">
          <select
            className="field__select"
            value={form.asignacion_docente_id}
            onChange={(e) => setForm((f) => ({ ...f, asignacion_docente_id: e.target.value }))}
          >
            <option value="">Seleccionar…</option>
            {asignaciones.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id.slice(0, 8)}…
              </option>
            ))}
          </select>
        </Field>
        <Field label="Título" htmlFor="tarea-titulo">
          <input
            id="tarea-titulo"
            className="field__input"
            data-testid="tarea-titulo-input"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
          />
        </Field>
        <Field label="Descripción">
          <textarea
            className="field__textarea"
            rows={2}
            value={form.descripcion ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Fecha asignación">
            <input
              type="date"
              className="field__input"
              value={form.fecha_asignacion}
              onChange={(e) => setForm((f) => ({ ...f, fecha_asignacion: e.target.value }))}
            />
          </Field>
          <Field label="Fecha entrega">
            <input
              type="date"
              className="field__input"
              value={form.fecha_entrega}
              onChange={(e) => setForm((f) => ({ ...f, fecha_entrega: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Crear tarea"
        message="¿Registrar esta tarea?"
        onConfirm={() => createMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
