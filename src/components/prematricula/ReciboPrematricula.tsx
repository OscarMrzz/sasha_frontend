import { useEffect, useRef, useState } from 'react'
import { Download, Maximize, Minimize, ZoomIn, ZoomOut } from 'lucide-react'
import { userMessageFromError } from '#/lib/api'
import { getReciboPrematricula } from '#/services/prematricula'

export function ReciboPrematricula({
  id,
  codigo,
}: {
  id?: string
  codigo?: string
}) {
  const [file, setFile] = useState<{ url: string; pdf: boolean } | null>(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === host.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  useEffect(() => {
    let cancelled = false
    let url: string | undefined
    setFile(null)
    setError('')
    void getReciboPrematricula(codigo ? { codigo } : { id: id! })
      .then(async (res) => {
        const blob = await res.blob()
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setFile({ url, pdf: blob.type.includes('pdf') })
      })
      .catch((e) => {
        if (!cancelled) setError(userMessageFromError(e))
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, codigo])
  return (
    <section className="pre-recibo" ref={host} aria-label="Recibo de matrícula">
      <div className="pre-recibo__toolbar">
        <strong>Recibo de pago</strong>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!file}
          onClick={() => setZoom((n) => Math.max(0.25, n - 0.25))}
          aria-label="Alejar"
        >
          <ZoomOut size={18} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!file}
          onClick={() => setZoom((n) => Math.min(4, n + 0.25))}
          aria-label="Ampliar"
        >
          <ZoomIn size={18} />
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!file}
          onClick={async () => {
            try {
              if (document.fullscreenElement === host.current) {
                await document.exitFullscreen()
              } else {
                await host.current?.requestFullscreen()
              }
            } catch {
              setError('Tu navegador no permite cambiar la pantalla completa.')
            }
          }}
          aria-label={fullscreen ? 'Volver a pantalla normal' : 'Pantalla completa'}
          title={fullscreen ? 'Volver a pantalla normal' : 'Pantalla completa'}
        >
          {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
        {file && (
          <a
            className="btn btn--ghost"
            href={file.url}
            download={`recibo-matricula.${file.pdf ? 'pdf' : 'imagen'}`}
          >
            <Download size={18} />
            Descargar
          </a>
        )}
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : !file ? (
        <p role="status">Cargando recibo…</p>
      ) : (
        <div className="pre-recibo__viewport">
          {file.pdf ? (
            <iframe
              title="Recibo de matrícula"
              src={`${file.url}#zoom=${Math.round(zoom * 100)}`}
            />
          ) : (
            <img
              alt="Recibo de pago de matrícula"
              src={file.url}
              style={{ width: `${zoom * 100}%`, maxWidth: 'none' }}
            />
          )}
        </div>
      )}
    </section>
  )
}
