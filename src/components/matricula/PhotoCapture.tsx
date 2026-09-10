import { useEffect, useRef, useState } from 'react'
import { Combobox } from '#/components/ui/Combobox'

type CameraDevice = { deviceId: string; label: string }

type PhotoCaptureProps = {
  file: File | null
  onChange: (file: File | null) => void
}

/** Foto de perfil: cargar archivo o elegir cámara antes de mostrar preview. Sin degradados. */
export function PhotoCapture({ file, onChange }: PhotoCaptureProps) {
  const [mode, setMode] = useState<'idle' | 'camera-pick' | 'camera-live'>('idle')
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [cameraId, setCameraId] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    return () => stopStream()
  }, [])

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const loadCameras = async () => {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      tmp.getTracks().forEach((t) => t.stop())
      const all = await navigator.mediaDevices.enumerateDevices()
      const vids = all
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Cámara ${i + 1}` }))
      setCameras(vids)
      setCameraId(vids[0]?.deviceId ?? '')
      setMode('camera-pick')
    } catch {
      setCameras([])
      setMode('camera-pick')
    }
  }

  const startCamera = async () => {
    stopStream()
    if (!cameraId) return
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: cameraId } },
      audio: false,
    })
    streamRef.current = stream
    setMode('camera-live')
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        void videoRef.current.play()
      }
    })
  }

  const takeShot = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onChange(new File([blob], `foto-alumno-${Date.now()}.jpg`, { type: 'image/jpeg' }))
        stopStream()
        setMode('idle')
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <div className="photo-capture">
      <div className="photo-capture__frame" aria-label="Fotografía del alumno">
        {previewUrl ? (
          <img src={previewUrl} alt="Vista previa" className="photo-capture__img" />
        ) : mode === 'camera-live' ? (
          <video ref={videoRef} className="photo-capture__video" playsInline muted />
        ) : (
          <div className="photo-capture__placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 19.5c1.5-3.2 4-5 7-5s5.5 1.8 7 5" strokeLinecap="round" />
            </svg>
            <span>Sin fotografía</span>
          </div>
        )}
      </div>

      {mode === 'camera-pick' ? (
        <div className="photo-capture__pick">
          <p className="photo-capture__pick-title">Elige la cámara (antes de abrirla)</p>
          {cameras.length === 0 ? (
            <p className="texto-muted" style={{ fontSize: '0.8rem' }}>
              No se detectaron cámaras o no hay permiso.
            </p>
          ) : (
            <Combobox
              value={cameraId}
              onChange={setCameraId}
              options={cameras.map((c) => ({ value: c.deviceId, label: c.label }))}
              placeholder="Buscar cámara…"
            />
          )}
          <div className="photo-capture__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMode('idle')}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!cameraId}
              onClick={() => void startCamera()}
            >
              Abrir cámara
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'camera-live' ? (
        <div className="photo-capture__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              stopStream()
              setMode('camera-pick')
            }}
          >
            Cambiar cámara
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={takeShot}>
            Capturar
          </button>
        </div>
      ) : null}

      {mode === 'idle' ? (
        <div className="photo-capture__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
            Cargar imagen
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void loadCameras()}>
            Tomar fotografía
          </button>
          {file ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(null)}>
              Quitar
            </button>
          ) : null}
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          onChange(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
