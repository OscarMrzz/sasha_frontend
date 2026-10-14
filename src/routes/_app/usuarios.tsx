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
import { CoordinacionesSelect } from '#/components/coordinaciones/CoordinacionesSelect'
import { PersonaEditModal } from '#/components/personas/PersonaEditModal'
import { UserFichaModal } from '#/components/usuarios/UserFichaModal'
import { ROLES, roleLabel, type RoleName } from '#/helpers/permissions'
import { userMessageFromError, ApiError } from '#/lib/api'
import {
  createUser,
  listUsers,
  softDelete,
  type CreateUserRequest,
  type ResponseUser,
} from '#/services/users'
import { createAlumno, createMaestro, createResponsable } from '#/services/personas'
import { asignarCoordinaciones } from '#/services/coordinaciones'
import { useAccionPalette } from '#/hooks/use-accion-palette'

export const Route = createFileRoute('/_app/usuarios')({ component: UsuariosPage })

const col = createColumnHelper<ResponseUser>()
/** Roles asignables al crear. Alumno va por matrículas; Admin solo por seed. */
const ASSIGNABLE = ROLES.filter((r) => r !== 'developer' && r !== 'admin' && r !== 'alumno')
/** Filtro de tabla: incluye admin/alumno para listar existentes. */
const FILTERABLE_ROLES = ROLES.filter((r) => r !== 'developer')

const defaultForm: CreateUserRequest = {
  roles: ['maestro'],
  statususer: 'ACTIVE',
  primer_nombre: '',
  primer_apellido: '',
}

function hasAdminRole(roles: string[]) {
  return roles.some((r) => r.toLowerCase() === 'admin')
}

const esCoordinador = (roles: string[]) => roles[0] === 'coordinador'

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
  const [createForm, setCreateForm] = useState<CreateUserRequest>(defaultForm)
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ResponseUser | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [viewCode, setViewCode] = useState<string | null>(null)
  const [editarPersona, setEditarPersona] = useState<ResponseUser | null>(null)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: ResponseUser } | null>(null)
  const [coordSel, setCoordSel] = useState<string[]>([])
  const assignable = ASSIGNABLE.filter((r) => r !== 'coordinador' || can('coordinaciones:put'))

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
    setCreateForm(defaultForm)
    setCreatedCode(null)
    setCoordSel([])
    setModalOpen(true)
  }

  useAccionPalette('nuevo-usuario', openCreate)

  const setCreateRole = (role: RoleName) => {
    setCreateForm((f) => ({ ...f, roles: [role] }))
  }

  const createMut = useMutation({
    mutationFn: async () => {
      const result = await createUser({ ...createForm, roles: createForm.roles.slice(0, 1) })
      const names = {
        user_id: result.userId,
        primer_nombre: createForm.primer_nombre,
        segundo_nombre: createForm.segundo_nombre,
        primer_apellido: createForm.primer_apellido,
        segundo_apellido: createForm.segundo_apellido,
        status: 'ACTIVE',
      }
      const role = (createForm.roles[0] ?? '').toLowerCase()
      if (result.userId) {
        if (role === 'alumno') await createAlumno(names)
        else if (role === 'maestro') await createMaestro(names)
        else if (role === 'responsable') await createResponsable(names)
      }
      if (role === 'coordinador') await asignarCoordinaciones(result.code, coordSel)
      return result
    },
    onSuccess: ({ code, pdfBlob, userId }) => {
      setCreatedCode(code)
      toast.success(
        userId
          ? `Usuario creado. Código: ${code}. Perfil de persona creado según el rol.`
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

  const deleteMut = useMutation({
    mutationFn: (code: string) => softDelete(code),
    onSuccess: () => {
      toast.success('Usuario eliminado')
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e) => {
      setConfirmDelete(null)
      if (e instanceof ApiError && e.status === 409) {
        setAviso(e.message)
      } else {
        toast.error(userMessageFromError(e))
      }
    },
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
        options: FILTERABLE_ROLES.map((r) => ({ value: r, label: roleLabel(r) })),
      },
      { id: 'status', label: 'Estado', getValue: (r: ResponseUser) => r.statususer },
    ],
    [],
  )

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
            data-testid="ctx-ver"
            onClick={(e) => {
              e.stopPropagation()
              setViewCode(ctx.row.code)
              closeCtx()
            }}
          >
            Ver
          </button>
          {!hasAdminRole(ctx.row.roles) ? (
            <>
              <Can permission="personas:put">
                <button
                  type="button"
                  className="ctx-menu__item"
                  data-testid="ctx-editar"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditarPersona(ctx.row)
                    closeCtx()
                  }}
                >
                  Editar
                </button>
              </Can>
              <Can permission="users:delete">
                <button
                  type="button"
                  className="ctx-menu__item ctx-menu__item--danger"
                  data-testid="ctx-eliminar"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmDelete(ctx.row)
                    closeCtx()
                  }}
                >
                  Eliminar
                </button>
              </Can>
            </>
          ) : null}
        </div>
      ) : null}

      <UserFichaModal code={viewCode} onClose={() => setViewCode(null)} />

      {editarPersona ? (
        <PersonaEditModal
          code={editarPersona.code}
          onClose={() => setEditarPersona(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['users'] })
            qc.invalidateQueries({ queryKey: ['alumnos'] })
            qc.invalidateQueries({ queryKey: ['maestros'] })
            qc.invalidateQueries({ queryKey: ['responsables'] })
            qc.invalidateQueries({ queryKey: ['persona-ficha', editarPersona.code] })
          }}
        />
      ) : null}

      <Modal
        open={modalOpen}
        title="Nuevo usuario"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <Can permission="users:post">
              <button
                type="button"
                className="btn btn--primary"
                data-testid="create-user-button"
                disabled={
                  createMut.isPending ||
                  createForm.roles.length === 0 ||
                  (esCoordinador(createForm.roles) && coordSel.length === 0)
                }
                onClick={() => setConfirmSave(true)}
              >
                {createMut.isPending ? 'Creando…' : 'Crear y descargar PDF'}
              </button>
            </Can>
          </>
        }
      >
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
        <Field label="Rol">
          <Combobox
            data-testid="user-role-select"
            value={createForm.roles[0] ?? ''}
            onChange={(v) => setCreateRole(v as RoleName)}
            options={assignable.map((role) => ({ value: role, label: roleLabel(role) }))}
            placeholder="Elegir un rol…"
            emptyLabel="Sin roles asignables."
          />
        </Field>
        {esCoordinador(createForm.roles) ? <CoordinacionesSelect value={coordSel} onChange={setCoordSel} /> : null}
        <Field label="Estado">
          <Combobox
            value={createForm.statususer}
            onChange={(v) => setCreateForm((f) => ({ ...f, statususer: v }))}
            options={STATUS_OPTIONS}
            placeholder="Buscar estado…"
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Crear usuario"
        message="¿Confirmas la creación? Se descargará el PDF y, si el rol es maestro/responsable, se creará también el perfil de persona."
        onConfirm={() => createMut.mutate()}
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

      <Modal
        open={Boolean(aviso)}
        title="No se puede eliminar"
        onClose={() => setAviso(null)}
        footer={
          <button type="button" className="btn btn--primary" onClick={() => setAviso(null)}>
            Entendido
          </button>
        }
      >
        <p className="texto-primary" style={{ margin: 0 }}>
          {aviso}
        </p>
      </Modal>
    </RequirePermission>
  )
}
