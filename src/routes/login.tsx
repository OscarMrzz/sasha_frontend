import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type RoleName } from '#/helpers/permissions'
import { useSession, isRoleName } from '#/hooks/use-session'
import { userMessageFromError } from '#/lib/api'
import { homePathForRoles, homePathFromStoredSession } from '#/lib/home-path'
import { hasPersistedSession } from '#/lib/session-storage'
import { login } from '#/services/auth'

export const Route = createFileRoute('/login')({
  ssr: false,
  beforeLoad: () => {
    if (hasPersistedSession()) {
      const to = homePathFromStoredSession()
      throw redirect({ to: to === '/login' ? '/dashboard' : to })
    }
  },
  component: LoginPage,
})

function LoginCardLeft() {
  return (
    <div className="card-left">
      <div className="left-overlay" aria-hidden />
      <div className="left-top">
        <div className="logo">
          <span className="logo-icon">⊙</span> SASHA
        </div>
      </div>

      <div className="card-left__center">
        <img
          src="/images/logo/logo_principal.png"
          alt="Instituto Evangélico Profa. Delfina Mejía"
          className="card-left__logo"
        />
      </div>

      <div className="left-bottom">
        <div className="author-info" />
      </div>
    </div>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const { setSession, isAuthenticated, sessionReady, session } = useSession()
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ user?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionReady && isAuthenticated) {
      void navigate({ to: homePathForRoles(session?.knownRoles) })
    }
  }, [sessionReady, isAuthenticated, session?.knownRoles, navigate])

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
      const knownRoles = res.roles.filter(isRoleName).slice(0, 1) as RoleName[]
      if (knownRoles.length === 0) {
        const msg = 'El usuario no tiene un rol válido'
        setFormError(msg)
        toast.error(msg)
        return
      }
      setSession({
        code: res.code,
        username: res.username,
        knownRoles,
      })
      toast.success('Sesión iniciada')
      await navigate({ to: homePathForRoles(knownRoles) })
    } catch (err) {
      const msg = userMessageFromError(err)
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!sessionReady || isAuthenticated) {
    return (
      <div className="login-page" data-theme="dark" data-testid="login-booting">
        <div className="login-card" data-testid="login-form" data-ready="0">
          <LoginCardLeft />
          <div className="card-right">
            <div className="login-header">
              <h2>Cargando…</h2>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page" data-theme="dark">
      <div className="login-card" data-testid="login-form" data-ready="1">
        <LoginCardLeft />

        <div className="card-right">
          <div className="login-header">
            <h2>Bienvenido a Sasha</h2>
          </div>

          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault()
              void doLogin()
            }}
          >
            <div className="input-group">
              <input
                type="text"
                id="user"
                required
                placeholder=" "
                autoComplete="username"
                data-testid="login-code"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
              <label htmlFor="user">Código de usuario</label>
              {errors.user ? <span className="input-group__error">{errors.user}</span> : null}
            </div>

            <div className="input-group">
              <input
                type="password"
                id="password"
                required
                placeholder=" "
                autoComplete="current-password"
                data-testid="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="password">Contraseña</label>
              {errors.password ? <span className="input-group__error">{errors.password}</span> : null}
            </div>

            {formError ? (
              <p className="login-form__error" role="alert" data-testid="login-error">
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn-submit"
              disabled={submitting}
              data-testid="login-submit"
            >
              {submitting ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
