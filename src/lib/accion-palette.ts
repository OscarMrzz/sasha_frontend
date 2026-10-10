/**
 * Bus de intención del buscador de comandos.
 * Permite que "Agregar X" navegue a una página y que esa página abra su modal.
 * Usa sessionStorage (sobrevive la navegación) + un evento (cubre la misma página).
 */

const STORAGE_KEY = 'sasha.palette.accion'
const EVENT_NAME = 'sasha:accion-palette'

/** Marca una intención y avisa al vuelo. */
export function solicitarAccion(id: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, id)
  } catch {
    // sessionStorage no disponible: el evento igual cubre la misma página.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<string>(EVENT_NAME, { detail: id }))
  }
}

/** Consume la intención pendiente (al montar la página destino). */
export function consumirAccion(id: string): boolean {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === id) {
      sessionStorage.removeItem(STORAGE_KEY)
      return true
    }
  } catch {
    // sin sessionStorage
  }
  return false
}

/** Escucha la intención al vuelo (misma página). Devuelve la función para desuscribirse. */
export function alRecibirAccion(id: string, handler: () => void): () => void {
  const listener = (e: Event) => {
    const detalle = (e as CustomEvent<string>).detail
    if (detalle !== id) return
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // sin sessionStorage
    }
    handler()
  }
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}
