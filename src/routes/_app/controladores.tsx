import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { roleLabel } from '#/helpers/permissions'
import { userMessageFromError } from '#/lib/api'
import { listRoles, updateRoleStatus, type RoleItem } from '#/services/roles'
import { listUsers, updateStatus, type ResponseUser } from '#/services/users'

export const Route = createFileRoute('/_app/controladores')({ component: ControladoresPage })

const col = createColumnHelper<ResponseUser>()

function Switch({
  on,
  disabled,
  label,
  onToggle,
  testId,
}: {
  on: boolean
  disabled?: boolean
  label: string
  onToggle: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      className={`switch${on ? ' switch--on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      data-testid={testId}
      onClick={onToggle}
    >
      <span className="switch__thumb" />
    </button>
  )
}

function ControladoresPage() {
  const qc = useQueryClient()
  const { can } = useCan()

  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: listRoles })
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers })

  const [confirmRole, setConfirmRole] = useState<RoleItem | null>(null)
  const [confirmUser, setConfirmUser] = useState<ResponseUser | null>(null)

  const roleMut = useMutation({
    mutationFn: ({ name, status }: { name: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      updateRoleStatus(name, status),
    onSuccess: (role) => {
      toast.success(
        role.status === 'ACTIVE'
          ? `Rol ${roleLabel(role.name)} activado`
          : `Rol ${roleLabel(role.name)} desactivado`,
      )
      qc.invalidateQueries({ queryKey: ['roles'] })
      setConfirmRole(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const userMut = useMutation({
    mutationFn: ({ code, statususer }: { code: string; statususer: string }) =>
      updateStatus(code, statususer),
    onSuccess: (u) => {
      toast.success(
        u.statususer === 'ACTIVE' ? `Usuario ${u.code} activado` : `Usuario ${u.code} desactivado`,
      )
      qc.invalidateQueries({ queryKey: ['users'] })
      setConfirmUser(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const requestRoleToggle = useCallback(
    (role: RoleItem) => {
      if (!can('roles:put')) return
      if (role.name.toLowerCase() === 'admin' && role.status === 'ACTIVE') {
        toast.error('No se puede desactivar el rol admin')
        return
      }
      if (role.status === 'ACTIVE') {
        setConfirmRole(role)
        return
      }
      roleMut.mutate({ name: role.name, status: 'ACTIVE' })
    },
    [can, roleMut],
  )

  const requestUserToggle = useCallback(
    (user: ResponseUser) => {
      if (!can('users:put')) return
      if (user.statususer === 'ACTIVE') {
        setConfirmUser(user)
        return
      }
      userMut.mutate({ code: user.code, statususer: 'ACTIVE' })
    },
    [can, userMut],
  )

  const columns = useMemo(
    () => [
      col.accessor('code', { header: 'Código' }),
      col.accessor('username', { header: 'Username' }),
      col.display({
        id: 'activo',
        header: 'Activo',
        enableSorting: false,
        cell: ({ row }) => {
          const u = row.original
          const on = u.statususer === 'ACTIVE'
          return (
            <Switch
              on={on}
              disabled={!can('users:put') || userMut.isPending}
              label={on ? `Desactivar ${u.code}` : `Activar ${u.code}`}
              testId={`user-switch-${u.code}`}
              onToggle={() => requestUserToggle(u)}
            />
          )
        },
      }),
    ],
    [can, userMut.isPending, requestUserToggle],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'status',
        label: 'Estado',
        getValue: (r: ResponseUser) => r.statususer,
        getLabel: (r: ResponseUser) => (r.statususer === 'ACTIVE' ? 'Activo' : 'Desactivado'),
        options: [
          { value: 'ACTIVE', label: 'Activo' },
          { value: 'INACTIVE', label: 'Desactivado' },
        ],
      },
    ],
    [],
  )

  const roles = rolesQuery.data ?? []

  return (
    <RequirePermission permission="users:put">
      <h1 className="page-title">Controladores</h1>

      <section className="ctrl-section" data-testid="ctrl-roles-section">
        <h2 className="ctrl-section__title">Activación de roles</h2>
        <p className="ctrl-section__hint texto-muted">
          Enciende o apaga roles del sistema. Un rol inactivo no otorga permisos.
        </p>
        {rolesQuery.isLoading ? (
          <div className="empty-state">Cargando roles…</div>
        ) : rolesQuery.isError ? (
          <div className="empty-state" role="alert">
            {userMessageFromError(rolesQuery.error)}
          </div>
        ) : (
          <div className="ctrl-roles">
            {roles.map((role) => {
              const on = role.status === 'ACTIVE'
              const locked = role.name.toLowerCase() === 'admin'
              return (
                <div key={role.name} className="ctrl-roles__row">
                  <span className="ctrl-roles__name">{roleLabel(role.name)}</span>
                  <Can permission="roles:put">
                    <Switch
                      on={on}
                      disabled={roleMut.isPending || (locked && on)}
                      label={`${on ? 'Desactivar' : 'Activar'} rol ${roleLabel(role.name)}`}
                      testId={`role-switch-${role.name}`}
                      onToggle={() => requestRoleToggle(role)}
                    />
                  </Can>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="ctrl-section" data-testid="ctrl-users-section">
        <h2 className="ctrl-section__title">Activar usuario específico</h2>
        <p className="ctrl-section__hint texto-muted">
          Activa o desactiva cuentas. Busca por texto o filtra por estado.
        </p>
        {usersQuery.isLoading ? (
          <div className="empty-state">Cargando usuarios…</div>
        ) : usersQuery.isError ? (
          <div className="empty-state" role="alert">
            {userMessageFromError(usersQuery.error)}
          </div>
        ) : (
          <DataTable
            data={usersQuery.data ?? []}
            columns={columns}
            filters={tableFilters}
            searchPlaceholder="Buscar usuario…"
          />
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmRole)}
        title="Desactivar rol"
        message={`¿Desactivar el rol "${confirmRole ? roleLabel(confirmRole.name) : ''}"? Quienes solo tengan ese rol perderán esos permisos.`}
        danger
        confirmLabel="Desactivar"
        onConfirm={() =>
          confirmRole && roleMut.mutate({ name: confirmRole.name, status: 'INACTIVE' })
        }
        onCancel={() => setConfirmRole(null)}
      />
      <ConfirmDialog
        open={Boolean(confirmUser)}
        title="Desactivar usuario"
        message={`¿Desactivar al usuario ${confirmUser?.code} (${confirmUser?.username})? No podrá iniciar sesión.`}
        danger
        confirmLabel="Desactivar"
        onConfirm={() =>
          confirmUser && userMut.mutate({ code: confirmUser.code, statususer: 'INACTIVE' })
        }
        onCancel={() => setConfirmUser(null)}
      />
    </RequirePermission>
  )
}
