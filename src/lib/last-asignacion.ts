export const LAST_ASIGNACION_KEY = 'sasha.lastAsignacionId'

export function readLastAsignacionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(LAST_ASIGNACION_KEY)
  } catch {
    return null
  }
}

export function writeLastAsignacionId(id: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(LAST_ASIGNACION_KEY, id)
  } catch {
    /* ignore */
  }
}
