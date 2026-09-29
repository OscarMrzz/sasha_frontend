import { useSyncExternalStore } from 'react'

const ALUMNO_KEY = 'sasha.portal.alumnoId'
const CLASE_KEY = 'sasha.portal.clase'

export type PortalClase = { asignacionId: string; cursoNombre: string }

const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function read(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
  emit()
}

/** Alumno elegido por el responsable. */
export function readPortalAlumnoId(): string | null {
  return read(ALUMNO_KEY)
}

export function writePortalAlumnoId(id: string | null) {
  if (id !== readPortalAlumnoId()) write(CLASE_KEY, null)
  write(ALUMNO_KEY, id)
}

export function readPortalClase(): PortalClase | null {
  const raw = read(CLASE_KEY)
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<PortalClase> | null
    return v && v.asignacionId && v.cursoNombre ? (v as PortalClase) : null
  } catch {
    return null
  }
}

export function writePortalClase(c: PortalClase | null) {
  write(CLASE_KEY, c ? JSON.stringify(c) : null)
}

export function clearPortalContext() {
  write(CLASE_KEY, null)
  write(ALUMNO_KEY, null)
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function usePortalAlumnoId() {
  return useSyncExternalStore(subscribe, readPortalAlumnoId, () => null)
}

let lastClaseRaw: string | null = null
let lastClase: PortalClase | null = null
function snapshotClase() {
  const raw = read(CLASE_KEY)
  if (raw !== lastClaseRaw) {
    lastClaseRaw = raw
    lastClase = readPortalClase()
  }
  return lastClase
}

export function usePortalClase() {
  return useSyncExternalStore(subscribe, snapshotClase, () => null)
}
