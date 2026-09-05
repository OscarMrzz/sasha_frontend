import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { setActiveRoleGetter } from '#/lib/api'
import { ROLES, type RoleName } from '#/helpers/permissions'

const STORAGE_KEY = 'sasha.session'

export type SessionState = {
  code: string
  activeRole: RoleName
  /** Roles del usuario según respuesta de login (JWT HttpOnly no es legible en el cliente). */
  knownRoles: RoleName[]
}

type SessionContextValue = {
  session: SessionState | null
  isAuthenticated: boolean
  setSession: (s: SessionState) => void
  clearSession: () => void
  setActiveRole: (role: RoleName) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function readStored(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionState
    if (!parsed.code || !parsed.activeRole) return null
    return parsed
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<SessionState | null>(() =>
    typeof window !== 'undefined' ? readStored() : null,
  )

  useEffect(() => {
    setActiveRoleGetter(() => session?.activeRole ?? null)
  }, [session?.activeRole])

  const setSession = useCallback((s: SessionState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setSessionState(s)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSessionState(null)
  }, [])

  const setActiveRole = useCallback((role: RoleName) => {
    setSessionState((prev) => {
      if (!prev || !prev.knownRoles.includes(role)) return prev
      const next = { ...prev, activeRole: role }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      setSession,
      clearSession,
      setActiveRole,
    }),
    [session, setSession, clearSession, setActiveRole],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider')
  return ctx
}

export function isRoleName(value: string): value is RoleName {
  return (ROLES as readonly string[]).includes(value)
}
