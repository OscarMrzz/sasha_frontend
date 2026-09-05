import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { setSessionRolesGetter } from '#/lib/api'
import { ROLES, type RoleName } from '#/helpers/permissions'

const STORAGE_KEY = 'sasha.session'

export type SessionState = {
  code: string
  /** Roles del usuario según login; esta app envía todos en X-Active-Role. */
  knownRoles: RoleName[]
}

type SessionContextValue = {
  session: SessionState | null
  isAuthenticated: boolean
  setSession: (s: SessionState) => void
  clearSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function readStored(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionState & { activeRole?: RoleName }
    if (!parsed.code || !parsed.knownRoles?.length) {
      // migración: sesión vieja con solo activeRole
      if (parsed.code && parsed.activeRole) {
        return { code: parsed.code, knownRoles: [parsed.activeRole] }
      }
      return null
    }
    return { code: parsed.code, knownRoles: parsed.knownRoles }
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<SessionState | null>(() =>
    typeof window !== 'undefined' ? readStored() : null,
  )

  useEffect(() => {
    setSessionRolesGetter(() => session?.knownRoles ?? [])
  }, [session?.knownRoles])

  const setSession = useCallback((s: SessionState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setSessionState(s)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSessionState(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      setSession,
      clearSession,
    }),
    [session, setSession, clearSession],
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
