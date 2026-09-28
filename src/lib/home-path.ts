import type { RoleName } from '#/helpers/permissions'
import { parseStoredSession, readStoredSessionRaw } from '#/lib/session-storage'

/** Home tras login / sesión restaurada. Maestro → hub; resto → dashboard. */
export function homePathForRoles(roles: readonly string[] | undefined): '/maestro' | '/dashboard' {
  if (roles?.length === 1 && roles[0] === 'maestro') return '/maestro'
  return '/dashboard'
}

export function homePathFromStoredSession(): '/maestro' | '/dashboard' | '/login' {
  const s = parseStoredSession(readStoredSessionRaw())
  if (!s) return '/login'
  return homePathForRoles(s.knownRoles as RoleName[])
}

export function isMaestroRole(roles: readonly string[] | undefined): boolean {
  return Boolean(roles?.includes('maestro'))
}
