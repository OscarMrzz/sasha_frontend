import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { setSessionRolesGetter } from '#/lib/api'
import { ROLES, type RoleName } from '#/helpers/permissions'
import {
  SESSION_STORAGE_KEY,
  clearPersistedSession,
  parseStoredSession,
  setSessionFlagCookie,
  type StoredSession,
} from '#/lib/session-storage'

export type SessionState = {
  code: string
  username: string
  /** Único rol del usuario (array de un elemento); se envía en X-Active-Role. */
  knownRoles: RoleName[]
  /** Key en bóveda de la foto de perfil (persistida en cliente tras subir). */
  fotoKey?: string
}

type SessionContextValue = {
  session: SessionState | null
  isAuthenticated: boolean
  /** false hasta hidratar localStorage (evita redirects prematuros). */
  sessionReady: boolean
  setSession: (s: SessionState) => void
  clearSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function toSessionState(parsed: StoredSession): SessionState {
  const rawUsername = parsed.username?.trim() || ''
  const username = rawUsername && rawUsername !== parsed.code ? rawUsername : ''
  return {
    code: parsed.code,
    username,
    knownRoles: parsed.knownRoles,
    fotoKey: parsed.fotoKey,
  }
}

function readStored(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    const parsed = parseStoredSession(raw)
    return parsed ? toSessionState(parsed) : null
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // null en SSR y en el primer paint; se hidrata en useLayoutEffect vía useEffect
  // para no divergir del HTML del servidor.
  const [session, setSessionState] = useState<SessionState | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useLayoutEffect(() => {
    const stored = readStored()
    setSessionState(stored)
    setSessionFlagCookie(Boolean(stored))
    setSessionReady(true)
  }, [])

  useEffect(() => {
    setSessionRolesGetter(() => session?.knownRoles ?? [])
  }, [session?.knownRoles])

  const setSession = useCallback((s: SessionState) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(s))
    setSessionFlagCookie(true)
    setSessionState(s)
  }, [])

  const clearSession = useCallback(() => {
    clearPersistedSession()
    setSessionState(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      sessionReady,
      setSession,
      clearSession,
    }),
    [session, sessionReady, setSession, clearSession],
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
