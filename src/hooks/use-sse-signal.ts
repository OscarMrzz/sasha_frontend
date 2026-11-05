import { useEffect, useRef } from 'react'
import { getApiBaseUrl } from '#/lib/api'

/** Abre el SSE de notificaciones y ejecuta `onSignal` cuando llega una señal. */
export function useSseSignal(onSignal: () => void) {
  const ref = useRef(onSignal)
  ref.current = onSignal

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return
    const source = new EventSource(`${getApiBaseUrl()}/notificaciones/stream`, {
      withCredentials: true,
    })
    const handler = () => ref.current()
    source.addEventListener('notificacion', handler)
    return () => {
      source.removeEventListener('notificacion', handler)
      source.close()
    }
  }, [])
}
