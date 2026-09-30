import { useEffect, useState } from 'react'
import { apiRequest } from '#/lib/api'
import type { Recibo } from '#/services/pagos'

type Estado = { src: string } | 'cargando' | 'error'

/** Muestra el archivo del recibo (imagen o PDF) desde la bóveda. */
export function ReciboVisor({ recibo }: { recibo: Recibo }) {
  const [estado, setEstado] = useState<Estado>('cargando')
  const esPdf = recibo.content_type === 'application/pdf'

  useEffect(() => {
    let url: string | null = null
    let cancelado = false
    setEstado('cargando')
    void (async () => {
      try {
        const res = await apiRequest<Response>(
          `/boveda/object?key=${encodeURIComponent(recibo.object_key)}`,
          { raw: true },
        )
        const blob = await res.blob()
        if (cancelado) return
        url = URL.createObjectURL(blob)
        setEstado({ src: url })
      } catch {
        if (!cancelado) setEstado('error')
      }
    })()
    return () => {
      cancelado = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [recibo.object_key])

  return (
    <div className="recibo-visor" data-testid="recibo-visor">
      {estado === 'cargando' ? (
        <span className="texto-muted">Cargando recibo…</span>
      ) : estado === 'error' ? (
        <span className="texto-muted" data-testid="recibo-visor-error">
          El archivo del recibo no está disponible.
        </span>
      ) : esPdf ? (
        <iframe src={estado.src} title={`Recibo de ${recibo.alumno_nombre}`} />
      ) : (
        <img src={estado.src} alt={`Recibo de ${recibo.alumno_nombre}`} />
      )}
    </div>
  )
}
