import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '#/components/ui/Field'
import { type RoleName } from '#/helpers/permissions'
import { useSession, isRoleName } from '#/hooks/use-session'
import { userMessageFromError } from '#/lib/api'
import { login } from '#/services/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { setSession, isAuthenticated } = useSession()
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ user?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: '/dashboard' })
    }
  }, [isAuthenticated, navigate])

  async function doLogin() {
    const nextErrors: { user?: string; password?: string } = {}
    if (!user.trim()) nextErrors.user = 'Código obligatorio'
    if (!password) nextErrors.password = 'Contraseña obligatoria'
    setErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      const res = await login({ user: user.trim(), password })
      const knownRoles = res.roles.filter(isRoleName) as RoleName[]
      if (knownRoles.length === 0) {
        const msg = 'El usuario no tiene roles válidos'
        setFormError(msg)
        toast.error(msg)
        return
      }
      setSession({
        code: res.code,
        activeRole: knownRoles[0],
        knownRoles,
      })
      toast.success('Sesión iniciada')
      await navigate({ to: '/dashboard' })
    } catch (err) {
      const msg = userMessageFromError(err)
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page" data-theme="dark">
      <div className="login-card" data-testid="login-form" data-ready={ready ? '1' : '0'}>
        <h1 className="login-card__brand">Sasha</h1>
        <p className="login-card__hint">Ingresa con tu código institucional</p>

        <Field label="Código" error={errors.user} htmlFor="user">
          <input
            id="user"
            className="field__input"
            autoComplete="username"
            data-testid="login-code"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
        </Field>

        <Field label="Contraseña" error={errors.password} htmlFor="password">
          <input
            id="password"
            type="password"
            className="field__input"
            autoComplete="current-password"
            data-testid="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void doLogin()
            }}
          />
        </Field>

        {formError ? (
          <p className="field__error" role="alert" data-testid="login-error">
            {formError}
          </p>
        ) : null}

        <button
          type="button"
          className="btn btn--primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={submitting}
          data-testid="login-submit"
          onClick={() => void doLogin()}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}
