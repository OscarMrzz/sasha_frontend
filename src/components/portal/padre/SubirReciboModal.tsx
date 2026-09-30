import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, FileUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { lempiras, mesAnio } from '#/lib/fechas-padre'
import { subirRecibo } from '#/services/portal'
import type { PortalMesPago } from '#/services/portal'

const MAX_BYTES = 10 * 1024 * 1024

function claveMes(m: { anio: number; mes: number }) {
  return `${m.anio}-${m.mes}`
}

/** Subir la foto o el PDF de un recibo y decir de qué mes es. */
export function SubirReciboModal({
  alumnoId,
  meses,
  mesInicial,
  onClose,
}: {
  alumnoId: string
  /** Meses que se pueden pagar (sin pagar y sin recibo en revisión). */
  meses: PortalMesPago[]
  mesInicial?: PortalMesPago
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const qc = useQueryClient()
  const camaraRef = useRef<HTMLInputElement>(null)
  const archivoRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mes, setMes] = useState(mesInicial ? claveMes(mesInicial) : meses[0] ? claveMes(meses[0]) : '')
  const [confirmar, setConfirmar] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [camaras, setCamaras] = useState<MediaDeviceInfo[]>([])
  const [camaraId, setCamaraId] = useState('')

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [stream])

  const encenderCamara = async (deviceId?: string) => {
    setStream(null)
    try {
      const nuevo = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      const dispositivos = await navigator.mediaDevices.enumerateDevices()
      setCamaras(dispositivos.filter((d) => d.kind === 'videoinput'))
      setCamaraId(nuevo.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId ?? '')
      setStream(nuevo)
    } catch {
      toast.error('No se pudo abrir la cámara. Revise el permiso del navegador o elija un archivo.')
    }
  }

  const abrirCamara = async () => {
    const tactil = window.matchMedia('(pointer: coarse)').matches
    const media = navigator.mediaDevices as MediaDevices | undefined
    if (tactil || !media) {
      camaraRef.current?.click()
      return
    }
    await encenderCamara()
  }

  const capturar = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onFile(new File([blob], `recibo-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        setStream(null)
      },
      'image/jpeg',
      0.9,
    )
  }

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const elegido = meses.find((m) => claveMes(m) === mes)

  const enviar = useMutation({
    mutationFn: () => {
      if (!file || !elegido) throw new Error('Falta el recibo o el mes')
      return subirRecibo(alumnoId, elegido.anio, elegido.mes, file)
    },
    onSuccess: () => {
      toast.success('Recibo enviado. Caja lo revisará pronto.')
      void qc.invalidateQueries({ queryKey: ['portal-pagos', alumnoId] })
      setConfirmar(false)
      dismiss()
    },
    onError: (e) => {
      setConfirmar(false)
      toast.error(userMessageFromError(e))
    },
  })

  const onFile = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_BYTES) {
      toast.error('El archivo es muy grande (máximo 10 MB).')
      return
    }
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      toast.error('El recibo debe ser una foto o un PDF.')
      return
    }
    setFile(f)
  }

  return (
    <>
      <Modal
        open={open}
        title="Subir recibo de pago"
        onClose={dismiss}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="recibo-enviar"
              disabled={!file || !elegido || enviar.isPending}
              onClick={() => setConfirmar(true)}
            >
              {enviar.isPending ? 'Enviando…' : 'Enviar'}
            </button>
          </>
        }
      >
        <p className="texto-muted" style={{ marginTop: 0 }}>
          1. Tome una foto del recibo o elija el archivo.
        </p>
        <div className="recibo-subir__opciones">
          <button
            type="button"
            className="app-boton-grande"
            data-testid="recibo-tomar-foto"
            onClick={() => void abrirCamara()}
          >
            <Camera size={22} aria-hidden /> Tomar foto
          </button>
          <button
            type="button"
            className="app-boton-grande app-boton-grande--sec"
            data-testid="recibo-elegir-archivo"
            onClick={() => archivoRef.current?.click()}
          >
            <FileUp size={22} aria-hidden /> Elegir archivo
          </button>
        </div>
        <input
          ref={camaraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <input
          ref={archivoRef}
          type="file"
          accept="image/*,application/pdf"
          hidden
          data-testid="recibo-input-archivo"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {stream ? (
          <div className="recibo-camara" data-testid="recibo-camara">
            <video ref={videoRef} autoPlay playsInline muted className="recibo-camara__video" />
            {camaras.length > 1 ? (
              <Field label="Cámara" htmlFor="recibo-camara-select">
                <select
                  id="recibo-camara-select"
                  className="field__select"
                  data-testid="recibo-camara-select"
                  value={camaraId}
                  onChange={(e) => void encenderCamara(e.target.value)}
                >
                  {camaras.map((c, i) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Cámara ${i + 1}`}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <div className="recibo-camara__acciones">
              <button type="button" className="btn btn--ghost" onClick={() => setStream(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn--primary" data-testid="recibo-capturar" onClick={capturar}>
                <Camera size={18} aria-hidden /> Capturar
              </button>
            </div>
          </div>
        ) : null}
        {file && !stream ? (
          <div className="recibo-subir__preview" data-testid="recibo-preview">
            {preview ? <img src={preview} alt="Vista previa del recibo" /> : null}
            <p className="texto-muted" style={{ margin: preview ? '0.5rem 0 0' : 0 }}>
              {file.name}
            </p>
          </div>
        ) : null}

        <p className="texto-muted" style={{ margin: '1.25rem 0 0.5rem' }}>
          2. ¿De qué mes es este pago?
        </p>
        {meses.length === 0 ? (
          <div className="empty-state">No hay meses pendientes de pago.</div>
        ) : (
          <Field label="Mes" htmlFor="recibo-mes">
            <select
              id="recibo-mes"
              className="field__select"
              data-testid="recibo-mes"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              style={{ minHeight: 48, fontSize: '1rem' }}
            >
              {meses.map((m) => (
                <option key={claveMes(m)} value={claveMes(m)}>
                  {mesAnio(m.anio, m.mes)} · {lempiras(m.monto)}
                  {m.vencido ? ' (vencido)' : ''}
                </option>
              ))}
            </select>
          </Field>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Enviar recibo"
        message={elegido ? `¿Enviar el recibo de ${mesAnio(elegido.anio, elegido.mes)}?` : '¿Enviar el recibo?'}
        confirmLabel="Sí, enviar"
        onCancel={() => setConfirmar(false)}
        onConfirm={() => enviar.mutate()}
      />
    </>
  )
}
