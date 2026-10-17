import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '#/lib/api'

/** Estado de la carga del binario autenticado. */
export type EstadoArchivo = 'loading' | 'ready' | 'error'

export type ArchivoAutenticado = {
  /** Object URL listo para `img`/`iframe`; `null` mientras carga o si falla. */
  src: string | null
  estado: EstadoArchivo
  /** Vuelve a intentar la carga (p. ej. tras un error de red o de sesión). */
  reintentar: () => void
}

/**
 * Carga un binario protegido (adjunto de tarea staff o portal) con la sesión y el
 * rol activos, y lo expone como object URL para `img`/`iframe`. Limpia el object
 * URL al desmontar o al cambiar de ruta. Expone `estado` para distinguir
 * «cargando» de «no se pudo cargar» y permitir reintentar.
 */
export function useArchivoAutenticado(path: string | null | undefined): ArchivoAutenticado {
  const [src, setSrc] = useState<string | null>(null)
  const [estado, setEstado] = useState<EstadoArchivo>(path ? 'loading' : 'error')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!path) {
      setSrc(null)
      setEstado('error')
      return
    }

    setSrc(null)
    setEstado('loading')
    const interno = { objectUrl: null as string | null, cancelado: false }
    const controller = new AbortController()

    void (async () => {
      try {
        const res = await apiRequest<Response>(path, { raw: true, signal: controller.signal })
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        if (interno.cancelado) {
          URL.revokeObjectURL(url)
          return
        }
        interno.objectUrl = url
        setSrc(url)
        setEstado('ready')
      } catch {
        if (!interno.cancelado) {
          setSrc(null)
          setEstado('error')
        }
      }
    })()

    return () => {
      interno.cancelado = true
      controller.abort()
      if (interno.objectUrl) URL.revokeObjectURL(interno.objectUrl)
    }
  }, [path, intento])

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  return { src, estado, reintentar }
}
