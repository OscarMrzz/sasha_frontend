import { Copy } from 'lucide-react'
import { useState } from 'react'
import { useArchivoAutenticado } from '#/hooks/use-archivo-autenticado'
import { categoriaAdjunto } from '#/helpers/adjuntos'
import { copyErrorReport } from '#/lib/api'

/**
 * Previsualiza un adjunto: imagen inline (tocable para ampliar) o PDF en `iframe`.
 * Carga el binario con la sesión activa. No se usa con Word/Excel (solo se descargan).
 * Si la carga falla (red, sesión o imagen corrupta) ofrece copiar el detalle y reintentar.
 */
export function AdjuntoVista({
  path,
  contentType,
  nombre,
  onAmpliar,
  testId,
}: {
  path: string
  contentType: string
  nombre: string
  /** En imágenes: recibe el object URL para abrirlo en grande. */
  onAmpliar?: (src: string, alt: string) => void
  testId?: string
}) {
  const { src, estado, error, reintentar } = useArchivoAutenticado(path)
  const [falloImagen, setFalloImagen] = useState(false)

  const reintentarTodo = () => {
    setFalloImagen(false)
    reintentar()
  }

  if (estado === 'loading') {
    return (
      <p className="texto-muted" style={{ margin: '0.5rem 0 0' }}>
        Cargando archivo…
      </p>
    )
  }

  if (estado === 'error' || falloImagen || !src) {
    const detalle =
      error ??
      new Error(
        falloImagen
          ? `No se pudo mostrar la imagen "${nombre}".`
          : `No se pudo cargar "${nombre}".`,
      )
    return (
      <div
        className="adjunto-vista__error"
        data-testid={testId ? `${testId}-error` : undefined}
      >
        <p className="texto-muted" style={{ margin: 0 }}>
          No se pudo cargar el archivo.
        </p>
        <div className="adjunto-vista__error-acciones">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            data-testid={testId ? `${testId}-copiar` : undefined}
            onClick={() =>
              void copyErrorReport(detalle, {
                method: 'GET',
                path,
                contexto: `Previsualizar adjunto "${nombre}"`,
              })
            }
          >
            <Copy size={16} aria-hidden /> Copiar detalle
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reintentarTodo}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const cat = categoriaAdjunto(contentType, nombre)
  if (cat === 'pdf') {
    return (
      <iframe
        className="adjunto-vista__pdf"
        src={src}
        title={nombre}
        sandbox=""
        referrerPolicy="no-referrer"
        data-testid={testId}
      />
    )
  }
  if (cat === 'imagen') {
    if (onAmpliar) {
      return (
        <button
          type="button"
          className="adjunto-vista__miniatura"
          data-testid={testId}
          aria-label={`Ampliar ${nombre}`}
          onClick={() => onAmpliar(src, nombre)}
        >
          <img
            className="adjunto-vista__img"
            src={src}
            alt={nombre}
            onError={() => setFalloImagen(true)}
          />
        </button>
      )
    }
    return (
      <img
        className="adjunto-vista__img"
        src={src}
        alt={nombre}
        onError={() => setFalloImagen(true)}
        data-testid={testId}
      />
    )
  }
  return null
}
