import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { ROLES, roleLabel, type RoleName } from '#/helpers/permissions'
import { userMessageFromError } from '#/lib/api'
import {
  listPermisos,
  updateRoles,
  upsertPermisos,
  type PermisoUsuario,
} from '#/services/users'

export const Route = createFileRoute('/_app/controladores')({ component: ControladoresPage })

const ASSIGNABLE = ROLES.filter((r) => r !== 'developer')

function ControladoresPage() {
  const qc = useQueryClient()
  const [userCode, setUserCode] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [permisos, setPermisos] = useState<PermisoUsuario[]>([])
  const [confirmSave, setConfirmSave] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const permisosQuery = useQuery({
    queryKey: ['permisos', userCode],
    queryFn: () => listPermisos(userCode),
    enabled: false,
  })

  const loadUser = async () => {
    if (!userCode.trim()) {
      toast.error('Ingresa un código de usuario')
      return
    }
    try {
      const data = await permisosQuery.refetch()
      if (data.data) {
        setPermisos(data.data)
        setLoaded(true)
        toast.success('Permisos cargados')
      }
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (roles.length) await updateRoles(userCode, roles)
      if (permisos.length) await upsertPermisos(userCode, permisos)
    },
    onSuccess: () => {
      toast.success('Controladores actualizados')
      qc.invalidateQueries({ queryKey: ['permisos', userCode] })
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const toggleRole = (role: RoleName) => {
    setRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]))
  }

  const addPermiso = () => {
    setPermisos((p) => [...p, { resource: '', action: 'get', permitido: true }])
  }

  const updatePermiso = (idx: number, patch: Partial<PermisoUsuario>) => {
    setPermisos((p) => p.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  const removePermiso = (idx: number) => {
    setPermisos((p) => p.filter((_, i) => i !== idx))
  }

  return (
    <RequirePermission permission="users:put">
      <h1 className="page-title">Controladores de usuario</h1>
      <div
        style={{
          maxWidth: 720,
          background: 'var(--sasha-bg-raised)',
          border: '1px solid var(--sasha-border-suave)',
          borderRadius: '8px',
          padding: '1.5rem',
        }}
      >
        <Field label="Código de usuario" htmlFor="ctrl-code">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="ctrl-code"
              className="field__input"
              data-testid="controlador-code-input"
              value={userCode}
              onChange={(e) => {
                setUserCode(e.target.value)
                setLoaded(false)
              }}
              placeholder="Ej. ABC123"
            />
            <button type="button" className="btn btn--ghost" onClick={loadUser}>
              Cargar
            </button>
          </div>
        </Field>

        <Field label="Roles (multi-select)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ASSIGNABLE.map((role) => (
              <label
                key={role}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
              >
                <input
                  type="checkbox"
                  data-testid={`ctrl-role-${role}`}
                  checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                />
                {roleLabel(role)}
              </label>
            ))}
          </div>
        </Field>

        <h3 className="texto-muted" style={{ fontSize: '0.9rem' }}>
          Permisos (upsert)
        </h3>
        {loaded && permisos.length === 0 ? (
          <p className="texto-muted">Sin permisos personalizados. Agrega filas si necesitas overrides.</p>
        ) : null}
        {permisos.map((p, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 80px auto',
              gap: '0.5rem',
              marginBottom: '0.5rem',
              alignItems: 'end',
            }}
          >
            <input
              className="field__input"
              placeholder="recurso"
              value={p.resource}
              onChange={(e) => updatePermiso(idx, { resource: e.target.value })}
            />
            <select
              className="field__select"
              value={p.action}
              onChange={(e) => updatePermiso(idx, { action: e.target.value })}
            >
              {['get', 'post', 'put', 'delete'].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <label style={{ fontSize: '0.8rem' }}>
              <input
                type="checkbox"
                checked={p.permitido}
                onChange={(e) => updatePermiso(idx, { permitido: e.target.checked })}
              />{' '}
              OK
            </label>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => removePermiso(idx)}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="btn btn--ghost btn--sm" onClick={addPermiso}>
          + Permiso
        </button>

        <Can permission="users:put">
          <div style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="controlador-save-button"
              disabled={!userCode.trim() || saveMut.isPending}
              onClick={() => setConfirmSave(true)}
            >
              Guardar roles y permisos
            </button>
          </div>
        </Can>
      </div>

      <ConfirmDialog
        open={confirmSave}
        title="Actualizar controladores"
        message={`¿Confirmas actualizar roles y permisos del usuario ${userCode}?`}
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
