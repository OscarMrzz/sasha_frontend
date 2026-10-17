import { Camera, FileUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '#/components/ui/Field'
import { MAX_PESO_ARCHIVO_MB_DEFAULT, validarAdjunto } from '#/helpers/adjuntos'

const ACEPTA = 'image/*,.pdf,.doc,.docx,.xls,.xlsx'

/**
 * Selector de un archivo para adjuntar a una tarea: «Cargar archivo» abre el
 * explorador y «Añadir archivo» ofrece «Tomar fotografía» (cámara) o «Elegir
 * archivo». En celular usa `<input capture>`; en escritorio abre la cámara en vivo.
 * Valida tipo y peso antes de entregar el `File`.
 */
export function AdjuntoPicker({
  onFile,
  maxMB = MAX_PESO_ARCHIVO_MB_DEFAULT,
  disabled = false,
  busy = false,
  testIdPrefix = 'tarea-adjunto',
}: {
  onFile: (file: File) => void
  maxMB?: number
  disabled?: boolean
  busy?: boolean
  testIdPrefix?: string
}) {
  const camaraRef = useRef<HTMLInputElement>(null)
  const archivoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [opciones, setOpciones] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [camaras, setCamaras] = useState<MediaDeviceInfo[]>([])
  const [camaraId, setCamaraId] = useState('')

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [stream])

  const aceptar = (f: File | undefined) => {
    if (!f) return
    const error = validarAdjunto(f, maxMB)
    if (error) {
      toast.error(error)
      return
    }
    onFile(f)
  }

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
    setOpciones(true)
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
        onFile(new File([blob], `foto-tarea-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        setStream(null)
        setOpciones(false)
      },
      'image/jpeg',
      0.9,
    )
  }

  return (
    <div className="adjunto-picker" data-testid={`${testIdPrefix}-picker`}>
      <div className="adjunto-picker__acciones">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          data-testid={`${testIdPrefix}-cargar`}
          disabled={disabled || busy}
          onClick={() => archivoRef.current?.click()}
        >
          <FileUp size={16} aria-hidden /> Cargar archivo
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          data-testid={`${testIdPrefix}-anadir`}
          disabled={disabled || busy}
          onClick={() => setOpciones((v) => !v)}
        >
          Añadir archivo
        </button>
      </div>

      {opciones && !stream ? (
        <div className="recibo-subir__opciones" style={{ marginTop: '0.6rem' }}>
          <button
            type="button"
            className="app-boton-grande"
            data-testid={`${testIdPrefix}-tomar-foto`}
            disabled={disabled || busy}
            onClick={() => void abrirCamara()}
          >
            <Camera size={22} aria-hidden /> Tomar fotografía
          </button>
          <button
            type="button"
            className="app-boton-grande app-boton-grande--sec"
            data-testid={`${testIdPrefix}-elegir-archivo`}
            disabled={disabled || busy}
            onClick={() => archivoRef.current?.click()}
          >
            <FileUp size={22} aria-hidden /> Elegir archivo
          </button>
        </div>
      ) : null}

      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          aceptar(e.target.files?.[0])
          e.target.value = ''
          // En celular la captura ocurre fuera del panel; al volver, ciérralo.
          setOpciones(false)
        }}
      />
      <input
        ref={archivoRef}
        type="file"
        accept={ACEPTA}
        hidden
        data-testid={`${testIdPrefix}-input-archivo`}
        onChange={(e) => {
          aceptar(e.target.files?.[0])
          e.target.value = ''
          setOpciones(false)
        }}
      />

      {stream ? (
        <div className="recibo-camara" data-testid={`${testIdPrefix}-camara`}>
          <video ref={videoRef} autoPlay playsInline muted className="recibo-camara__video" />
          {camaras.length > 1 ? (
            <Field label="Cámara">
              <select
                className="field__select"
                data-testid={`${testIdPrefix}-camara-select`}
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
            <button
              type="button"
              className="btn btn--primary"
              data-testid={`${testIdPrefix}-capturar`}
              onClick={capturar}
            >
              <Camera size={18} aria-hidden /> Capturar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
