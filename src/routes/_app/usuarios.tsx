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
import { UserFichaModal } from '#/components/usuarios/UserFichaModal'
import { ROLES, roleLabel, type RoleName } from '#/helpers/permissions'
import { userMessageFromError } from '#/lib/api'
import {
  createUser,
  listUsers,
  softDelete,
  updateRoles,
  updateStatus,
  type CreateUserRequest,
  type ResponseUser,
} from '#/services/users'
import { createAlumno, createMaestro, createResponsable } from '#/services/personas'

export const Route = createFileRoute('/_app/usuarios')({ component: UsuariosPage })

const col = createColumnHelper<ResponseUser>()
const ASSIGNABLE = ROLES.filter((r) => r !== 'developer')

const defaultForm: CreateUserRequest = {
  roles: ['alumno'],
  statususer: 'ACTIVE',
  primer_nombre: '',
  primer_apellido: '',
}

type EditForm = {
  roles: string[]
  statususer: string
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

function UsuariosPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<ResponseUser | null>(null)
  const [createForm, setCreateForm] = useState<CreateUserRequest>(defaultForm)
  const [editForm, setEditForm] = useState<EditForm>({ roles: [], statususer: 'ACTIVE' })
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ResponseUser | null>(null)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [viewCode, setViewCode] = useState<string | null>(null)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: ResponseUser } | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest('.ctx-menu')) return
      closeCtx()
    }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [ctx, closeCtx])

  const openCreate = () => {
    setMode('create')
    setEditing(null)
    setCreateForm(defaultForm)
    setCreatedCode(null)
    setModalOpen(true)
  }

  const openEdit = (row: ResponseUser) => {
    setMode('edit')
    setEditing(row)
    setEditForm({ roles: [...row.roles], statususer: row.statususer })
    setModalOpen(true)
    closeCtx()
  }

  const toggleCreateRole = (role: RoleName) => {
    setCreateForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }))
  }

  const toggleEditRole = (role: RoleName) => {
    setEditForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }))
  }

  const createMut = useMutation({
    mutationFn: async () => {
      const result = await createUser(createForm)
      const names = {
        user_id: result.userId,
        primer_nombre: createForm.primer_nombre,
        segundo_nombre: createForm.segundo_nombre,
        primer_apellido: createForm.primer_apellido,
        segundo_apellido: createForm.segundo_apellido,
        status: 'ACTIVE',
      }
      const roles = createForm.roles.map((r) => r.toLowerCase())
      if (result.userId) {
        if (roles.includes('alumno')) await createAlumno(names)
        if (roles.includes('maestro')) await createMaestro(names)
        if (roles.includes('responsable')) await createResponsable(names)
      }
      return result
    },
    onSuccess: ({ code, pdfBlob, userId }) => {
      setCreatedCode(code)
      toast.success(
        userId
          ? `Usuario creado. Código: ${code}. Perfil(es) de persona creados según roles.`
          : `Usuario creado. Código: ${code}`,
      )
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usuario-${code}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setConfirmSave(false)
      setCreateForm(defaultForm)
      setModalOpen(false)
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['alumnos'] })
      qc.invalidateQueries({ queryKey: ['maestros'] })
      qc.invalidateQueries({ queryKey: ['responsables'] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const saveEditMut = useMutation({
    mutationFn: async () => {
      if (!editing) return
      await updateRoles(editing.code, editForm.roles)
      await updateStatus(editing.code, editForm.statususer)
    },
    onSuccess: () => {
      toast.success('Usuario actualizado')
      setConfirmSave(false)
      setModalOpen(false)
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (code: string) => softDelete(code),
    onSuccess: () => {
      toast.success('Usuario eliminado')
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('code', { header: 'Código' }),
      col.accessor('username', { header: 'Username' }),
      col.accessor('roles', {
        header: 'Roles',
        cell: (i) => i.getValue().map((r) => roleLabel(r)).join(', ') || '—',
      }),
      col.accessor('statususer', {
        header: 'Estado',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'username', label: 'Username', getValue: (r: ResponseUser) => r.username },
      {
        id: 'rol',
        label: 'Rol',
        getValue: (r: ResponseUser) => r.roles[0] ?? '',
        getOptionValues: (r: ResponseUser) => r.roles,
        getLabel: (r: ResponseUser) => roleLabel(r.roles[0] ?? ''),
        matches: (r: ResponseUser, selected: string) => r.roles.includes(selected),
        options: ASSIGNABLE.map((r) => ({ value: r, label: roleLabel(r) })),
      },
      { id: 'status', label: 'Estado', getValue: (r: ResponseUser) => r.statususer },
    ],
    [],
  )

  const isCreate = mode === 'create'

  if (isLoading) return <div className="empty-state">Cargando usuarios…</div>

  if (isError) {
    return (
      <RequirePermission permission="users:get">
        <h1 className="page-title">Usuarios</h1>
        <div className="empty-state" role="alert">
          <p>No se pudo cargar la lista: {userMessageFromError(error)}</p>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void refetch()}>
            Reintentar
          </button>
        </div>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="users:get">
      <DataTable
        title="Usuarios"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Agregar usuario"
        canAdd={can('users:post')}
        onAdd={openCreate}
        exportFilename="usuarios"
        exportRows={data.map((u) => ({
          codigo: u.code,
          username: u.username,
          roles: u.roles.join('|'),
          status: u.statususer,
        }))}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button
            type="button"
            className="ctx-menu__item"
            onClick={(e) => {
              e.stopPropagation()
              setViewCode(ctx.row.code)
              closeCtx()
            }}
          >
            Ver
          </button>
          <Can permission="users:put">
            <button
              type="button"
              className="ctx-menu__item"
              onClick={(e) => {
                e.stopPropagation()
                openEdit(ctx.row)
              }}
            >
              Editar
            </button>
          </Can>
          <Can permission="users:delete">
            <button
              type="button"
              className="ctx-menu__item ctx-menu__item--danger"
              onClick={(e) => {
                e.stopPropagation()
                setConfirmDelete(ctx.row)
                closeCtx()
              }}
            >
              Eliminar
            </button>
          </Can>
        </div>
      ) : null}

      <UserFichaModal code={viewCode} onClose={() => setViewCode(null)} />

      <Modal
        open={modalOpen}
        title={isCreate ? 'Nuevo usuario' : `Editar usuario ${editing?.code ?? ''}`}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <Can permission={isCreate ? 'users:post' : 'users:put'}>
              <button
                type="button"
                className="btn btn--primary"
                data-testid={isCreate ? 'create-user-button' : 'save-user-button'}
                disabled={
                  isCreate
                    ? createMut.isPending || createForm.roles.length === 0
                    : saveEditMut.isPending || editForm.roles.length === 0
                }
                onClick={() => setConfirmSave(true)}
              >
                {isCreate
                  ? createMut.isPending
                    ? 'Creando…'
                    : 'Crear y descargar PDF'
                  : saveEditMut.isPending
                    ? 'Guardando…'
                    : 'Guardar'}
              </button>
            </Can>
          </>
        }
      >
        {isCreate ? (
          <>
            {createdCode ? (
              <div
                className="badge badge--ok"
                style={{ marginBottom: '1rem', padding: '0.75rem', display: 'block' }}
                data-testid="user-code-display"
              >
                Último código generado: <strong>{createdCode}</strong>
              </div>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Primer nombre" htmlFor="user-pn">
                <input
                  id="user-pn"
                  className="field__input"
                  data-testid="user-primer-nombre-input"
                  value={createForm.primer_nombre}
                  onChange={(e) => setCreateForm((f) => ({ ...f, primer_nombre: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Segundo nombre">
                <input
                  className="field__input"
                  value={createForm.segundo_nombre ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, segundo_nombre: e.target.value }))}
                />
              </Field>
              <Field label="Primer apellido" htmlFor="user-pa">
                <input
                  id="user-pa"
                  className="field__input"
                  data-testid="user-primer-apellido-input"
                  value={createForm.primer_apellido}
                  onChange={(e) => setCreateForm((f) => ({ ...f, primer_apellido: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Segundo apellido">
                <input
                  className="field__input"
                  value={createForm.segundo_apellido ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, segundo_apellido: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Roles">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {ASSIGNABLE.map((role) => (
                  <label
                    key={role}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
                  >
                    <input
                      type="checkbox"
                      data-testid={`user-role-${role}`}
                      checked={createForm.roles.includes(role)}
                      onChange={() => toggleCreateRole(role)}
                    />
                    {roleLabel(role)}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Estado">
              <Combobox
                value={createForm.statususer}
                onChange={(v) => setCreateForm((f) => ({ ...f, statususer: v }))}
                options={STATUS_OPTIONS}
                placeholder="Buscar estado…"
              />
            </Field>
          </>
        ) : (
          <>
            <p className="texto-muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
              Código: <strong data-testid="user-view-code">{editing?.code}</strong>
              {editing?.username ? (
                <>
                  {' '}
                  · Username: <strong>{editing.username}</strong>
                </>
              ) : null}
            </p>
            <Field label="Roles">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {ASSIGNABLE.map((role) => (
                  <label
                    key={role}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
                  >
                    <input
                      type="checkbox"
                      checked={editForm.roles.includes(role)}
                      onChange={() => toggleEditRole(role)}
                    />
                    {roleLabel(role)}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Estado">
              <Combobox
                value={editForm.statususer}
                onChange={(v) => setEditForm((f) => ({ ...f, statususer: v }))}
                options={STATUS_OPTIONS}
                placeholder="Buscar estado…"
              />
            </Field>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title={isCreate ? 'Crear usuario' : 'Guardar usuario'}
        message={
          isCreate
            ? '¿Confirmas la creación? Se descargará el PDF y, si el rol es alumno/maestro/responsable, se creará también el perfil de persona.'
            : '¿Guardar roles y estado del usuario?'
        }
        onConfirm={() => (isCreate ? createMut.mutate() : saveEditMut.mutate())}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar usuario"
        message={`¿Dar de baja al usuario ${confirmDelete?.code} (${confirmDelete?.username})? Es una eliminación lógica: el registro no se borra, queda inactivo.`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.code)}
        onCancel={() => setConfirmDelete(null)}
      />
    </RequirePermission>
  )
}
