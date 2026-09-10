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
import { ROLES, roleLabel } from '#/helpers/permissions'
import { userMessageFromError } from '#/lib/api'
import {
  createNotificacion,
  listNotificaciones,
  type Notificacion,
  type NotificacionCreate,
} from '#/services/notificaciones'

export const Route = createFileRoute('/_app/notificaciones-admin')({ component: NotificacionesAdminPage })

const col = createColumnHelper<Notificacion>()

const defaultForm: NotificacionCreate = {
  titulo: '',
  mensaje: '',
  tipo_codigo: 'general',
  role_names: [],
}

function NotificacionesAdminPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['notificaciones-admin'], queryFn: () => listNotificaciones() })

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<NotificacionCreate>(defaultForm)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Notificacion } | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const createMut = useMutation({
    mutationFn: () => createNotificacion(form),
    onSuccess: () => {
      toast.success('Notificación creada')
      qc.invalidateQueries({ queryKey: ['notificaciones-admin'] })
      setModalOpen(false)
      setConfirmSave(false)
      setForm(defaultForm)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      role_names: f.role_names?.includes(role)
        ? f.role_names.filter((r) => r !== role)
        : [...(f.role_names ?? []), role],
    }))
  }

  const columns = useMemo(
    () => [
      col.accessor('titulo', { header: 'Título' }),
      col.accessor('tipo_codigo', { header: 'Tipo', cell: (i) => i.getValue() ?? '—' }),
      col.accessor('status', { header: 'Estado', cell: (i) => <span className="badge">{i.getValue()}</span> }),
      col.accessor('leida', { header: 'Leída', cell: (i) => (i.getValue() ? 'Sí' : 'No') }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'tipo', label: 'Tipo', getValue: (r: Notificacion) => r.tipo_codigo ?? '' },
      { id: 'status', label: 'Estado', getValue: (r: Notificacion) => r.status },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando notificaciones…</div>

  return (
    <RequirePermission permission="notificaciones:post">
      <DataTable
        title="Notificaciones (admin)"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Nueva notificación"
        canAdd={can('notificaciones:post')}
        onAdd={() => setModalOpen(true)}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button
            type="button"
            className="ctx-menu__item"
            onClick={() => {
              toast.info(ctx.row.mensaje)
              closeCtx()
            }}
          >
            Ver
          </button>
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        title="Nueva notificación"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <Can permission="notificaciones:post">
              <button
                type="button"
                className="btn btn--primary"
                data-testid="notif-create-button"
                onClick={() => setConfirmSave(true)}
              >
                Publicar
              </button>
            </Can>
          </>
        }
      >
        <Field label="Título" htmlFor="notif-titulo">
          <input
            id="notif-titulo"
            className="field__input"
            data-testid="notif-titulo-input"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
          />
        </Field>
        <Field label="Mensaje">
          <textarea
            className="field__textarea"
            rows={3}
            data-testid="notif-mensaje-input"
            value={form.mensaje}
            onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
          />
        </Field>
        <Field label="Tipo código">
          <input
            className="field__input"
            value={form.tipo_codigo ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, tipo_codigo: e.target.value }))}
          />
        </Field>
        <Field label="Roles destino">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ROLES.filter((r) => r !== 'developer').map((role) => (
              <label key={role} style={{ fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={form.role_names?.includes(role) ?? false}
                  onChange={() => toggleRole(role)}
                />{' '}
                {roleLabel(role)}
              </label>
            ))}
          </div>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Vigencia inicio">
            <input
              type="datetime-local"
              className="field__input"
              onChange={(e) => setForm((f) => ({ ...f, vigencia_inicio: e.target.value }))}
            />
          </Field>
          <Field label="Vigencia fin">
            <input
              type="datetime-local"
              className="field__input"
              onChange={(e) => setForm((f) => ({ ...f, vigencia_fin: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Publicar notificación"
        message="¿Enviar esta notificación a los roles seleccionados?"
        onConfirm={() => createMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
