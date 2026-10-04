import { useEffect, useRef } from 'react'
import { getApiBaseUrl } from '#/lib/api'

/**
 * Escucha el SSE de notificaciones: el servidor solo avisa que hay algo nuevo y
 * quien lo usa vuelve a pedir la lista. EventSource reconecta solo si se cae.
 */
export function useNotificacionesStream(onNueva: () => void) {
  const cb = useRef(onNueva)
  cb.current = onNueva

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return
    const es = new EventSource(`${getApiBaseUrl()}/notificaciones/stream`, { withCredentials: true })
    const handler = () => cb.current()
    es.addEventListener('notificacion', handler)
    return () => {
      es.removeEventListener('notificacion', handler)
      es.close()
    }
  }, [])
}
