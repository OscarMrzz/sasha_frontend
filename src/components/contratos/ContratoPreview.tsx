import { Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  descargarContratoArchivo,
  extensionContrato,
  getContratoArchivo,
} from '#/services/contratos'
import type { Contrato } from '#/services/contratos'

interface Props {
  contrato: Contrato
  onClose: () => void
}

type Estado = 'cargando' | 'listo' | 'error'

/**
 * Modal de vista previa del archivo del contrato.
 * `.pdf` → `<embed>` sobre un object URL; `.docx` → `docx-preview.renderAsync`.
 * El binario se obtiene autenticado (`apiRequest raw`) y nunca por `<embed src="/api/...">`.
 */
export function ContratoPreview({ contrato, onClose }: Props) {
  const { open, dismiss } = useDismiss(onClose)
  const docxRef = useRef<HTMLDivElement>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [estado, setEstado] = useState<Estado>(contrato.archivo_nombre ? 'cargando' : 'error')
  const [descargando, setDescargando] = useState(false)

  const ext = extensionContrato(contrato)
  const tieneArchivo = Boolean(contrato.archivo_nombre)

  // Descarga autenticada + object URL para PDF.
  useEffect(() => {
    if (!tieneArchivo) return
    let cancel = false as boolean
    let objectUrl: string | null = null
    void (async () => {
      try {
        const data = await getContratoArchivo(contrato.id)
        if (cancel) return
        setBlob(data)
        if (ext === 'pdf') {
          objectUrl = URL.createObjectURL(data)
          setUrl(objectUrl)
        }
        setEstado('listo')
      } catch {
        if (!cancel) setEstado('error')
      }
    })()
    return () => {
      cancel = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [contrato.id, ext, tieneArchivo])

  // Render del `.docx` con docx-preview (import dinámico).
  useEffect(() => {
    if (ext !== 'docx' || !blob) return
    let cancel = false as boolean
    void (async () => {
      try {
        const { renderAsync } = await import('docx-preview')
        const target = docxRef.current
        if (cancel || !target) return
        target.innerHTML = ''
        await renderAsync(blob, target, undefined, {
          className: 'docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
        })
      } catch {
        if (!cancel) setEstado('error')
      }
    })()
    return () => {
      cancel = true
    }
  }, [blob, ext])

  const descargar = async () => {
    setDescargando(true)
    try {
      await descargarContratoArchivo(contrato)
    } catch (e) {
      toast.error(userMessageFromError(e))
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Modal
      open={open}
      title={contrato.titulo}
      onClose={dismiss}
      xl
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Cerrar
          </button>
          {tieneArchivo ? (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="contrato-descargar"
              disabled={descargando}
              onClick={descargar}
            >
              <Download size={16} aria-hidden />
              {descargando ? 'Descargando…' : 'Descargar'}
            </button>
          ) : null}
        </>
      }
    >
      <div className="contrato-visor" data-testid="contrato-visor">
        {!tieneArchivo ? (
          <div className="empty-state">
            Este contrato es de formato anterior (sin archivo). Edítalo para subir un archivo
            `.docx` o `.pdf`.
          </div>
        ) : estado === 'cargando' ? (
          <div className="empty-state">Cargando archivo…</div>
        ) : estado === 'error' ? (
          <div className="empty-state">No se pudo abrir el archivo.</div>
        ) : ext === 'pdf' && url ? (
          <embed
            className="contrato-visor__pdf"
            data-testid="contrato-preview-pdf"
            type="application/pdf"
            src={url}
          />
        ) : (
          <div
            ref={docxRef}
            className="contrato-visor__docx"
            data-testid="contrato-preview-docx"
          />
        )}
      </div>
    </Modal>
  )
}
