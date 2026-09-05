import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { ROLES, roleLabel, type RoleName } from '#/helpers/permissions'
import { userMessageFromError } from '#/lib/api'
import { createUser, type CreateUserRequest } from '#/services/users'

export const Route = createFileRoute('/_app/usuarios')({ component: UsuariosPage })

const ASSIGNABLE = ROLES.filter((r) => r !== 'developer')

const defaultForm: CreateUserRequest = {
  roles: ['alumno'],
  statususer: 'ACTIVE',
  primer_nombre: '',
  primer_apellido: '',
}

function UsuariosPage() {
  const [form, setForm] = useState<CreateUserRequest>(defaultForm)
  const [confirmSave, setConfirmSave] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: () => createUser(form),
    onSuccess: ({ code, pdfBlob }) => {
      setCreatedCode(code)
      toast.success(`Usuario creado. Código: ${code}`)
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usuario-${code}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setConfirmSave(false)
      setForm(defaultForm)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const toggleRole = (role: RoleName) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }))
  }

  return (
    <RequirePermission permission="users:get">
      <h1 className="page-title">Crear usuario</h1>
      <div
        style={{
          maxWidth: 560,
          background: 'var(--sasha-bg-raised)',
          border: '1px solid var(--sasha-border-suave)',
          borderRadius: '8px',
          padding: '1.5rem',
        }}
      >
        {createdCode ? (
          <div
            className="badge badge--ok"
            style={{ marginBottom: '1rem', padding: '0.75rem', display: 'block' }}
            data-testid="user-code-display"
          >
            Último código generado (X-User-Code): <strong>{createdCode}</strong>
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setConfirmSave(true)
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Primer nombre" htmlFor="user-pn">
              <input
                id="user-pn"
                className="field__input"
                data-testid="user-primer-nombre-input"
                value={form.primer_nombre}
                onChange={(e) => setForm((f) => ({ ...f, primer_nombre: e.target.value }))}
                required
              />
            </Field>
            <Field label="Segundo nombre">
              <input
                className="field__input"
                value={form.segundo_nombre ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, segundo_nombre: e.target.value }))}
              />
            </Field>
            <Field label="Primer apellido" htmlFor="user-pa">
              <input
                id="user-pa"
                className="field__input"
                data-testid="user-primer-apellido-input"
                value={form.primer_apellido}
                onChange={(e) => setForm((f) => ({ ...f, primer_apellido: e.target.value }))}
                required
              />
            </Field>
            <Field label="Segundo apellido">
              <input
                className="field__input"
                value={form.segundo_apellido ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, segundo_apellido: e.target.value }))}
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
                    checked={form.roles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  {roleLabel(role)}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Estado">
            <select
              className="field__select"
              value={form.statususer}
              onChange={(e) => setForm((f) => ({ ...f, statususer: e.target.value }))}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </Field>

          <Can permission="users:post">
            <button
              type="submit"
              className="btn btn--primary"
              data-testid="create-user-button"
              disabled={createMut.isPending || form.roles.length === 0}
            >
              {createMut.isPending ? 'Creando…' : 'Crear usuario y descargar PDF'}
            </button>
          </Can>
        </form>
      </div>

      <ConfirmDialog
        open={confirmSave}
        title="Crear usuario"
        message="¿Confirmas la creación del usuario? Se descargará el PDF con las credenciales."
        onConfirm={() => createMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
