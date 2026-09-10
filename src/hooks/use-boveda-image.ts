import { useEffect, useState } from 'react'
import { apiRequest } from '#/lib/api'

/** Carga un objeto de bóveda con sesión + roles (para <img> autenticado). */
export function useBovedaImage(objectKey: string | undefined | null) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!objectKey) {
      setSrc(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    void (async () => {
      try {
        const res = await apiRequest<Response>(
          `/boveda/object?key=${encodeURIComponent(objectKey)}`,
          { raw: true },
        )
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setSrc(url)
      } catch {
        if (!cancelled) setSrc(null)
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectKey])

  return src
}
