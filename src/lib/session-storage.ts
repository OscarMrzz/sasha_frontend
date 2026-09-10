import type { RoleName } from '#/helpers/permissions'

export const SESSION_STORAGE_KEY = 'sasha.session'
/** Flag legible en document.cookie (no es el JWT; solo evita falsos redirects en SSR). */
export const SESSION_FLAG_COOKIE = 'sasha.has_session'

export type StoredSession = {
  code: string
  username: string
  knownRoles: RoleName[]
  fotoKey?: string
  activeRole?: RoleName
}

export function parseStoredSession(raw: string | null): StoredSession | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed.code) return null
    if (parsed.knownRoles?.length) return parsed
    if (parsed.activeRole) {
      return { ...parsed, knownRoles: [parsed.activeRole] }
    }
    return null
  } catch {
    return null
  }
}

export function readStoredSessionRaw(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

export function hasPersistedSession(): boolean {
  return Boolean(parseStoredSession(readStoredSessionRaw()))
}

/** Limpia sesión de cliente (localStorage + flag). No toca la cookie HttpOnly del JWT. */
export function clearPersistedSession() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  setSessionFlagCookie(false)
}

export function setSessionFlagCookie(present: boolean) {
  if (typeof document === 'undefined') return
  if (present) {
    document.cookie = `${SESSION_FLAG_COOKIE}=1; Path=/; SameSite=Lax; Max-Age=2592000`
  } else {
    document.cookie = `${SESSION_FLAG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  }
}
