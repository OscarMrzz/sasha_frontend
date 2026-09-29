import type { RoleName } from '#/helpers/permissions'
import { parseStoredSession, readStoredSessionRaw } from '#/lib/session-storage'

export type HomePath = '/maestro' | '/alumno' | '/responsable' | '/dashboard'

/** Home tras login / sesión restaurada. Maestro → hub; alumno/responsable → portal; resto → dashboard. */
export function homePathForRoles(roles: readonly string[] | undefined): HomePath {
  if (roles?.length === 1) {
    if (roles[0] === 'maestro') return '/maestro'
    if (roles[0] === 'alumno') return '/alumno'
    if (roles[0] === 'responsable') return '/responsable'
  }
  return '/dashboard'
}

export function homePathFromStoredSession(): HomePath | '/login' {
  const s = parseStoredSession(readStoredSessionRaw())
  if (!s) return '/login'
  return homePathForRoles(s.knownRoles as RoleName[])
}

export function isMaestroRole(roles: readonly string[] | undefined): boolean {
  return Boolean(roles?.includes('maestro'))
}

export function isResponsableRole(roles: readonly string[] | undefined): boolean {
  return Boolean(roles?.includes('responsable'))
}

/** Alumno y responsable navegan por el portal (inicio sin sidebar + modo clase). */
export function isPortalRole(roles: readonly string[] | undefined): boolean {
  return Boolean(roles?.includes('alumno') || roles?.includes('responsable'))
}
