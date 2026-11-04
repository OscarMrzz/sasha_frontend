import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Paperclip, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { WizardSteps } from '#/components/ui/WizardSteps'
import { hoyISO, rangoPermiso } from '#/helpers/permisos'
import { userMessageFromError } from '#/lib/api'
import { crearPermiso, listTiposPermiso } from '#/services/permisos'

const STEPS = [
  { id: 'fechas', label: 'Fechas' },
  { id: 'motivos', label: 'Motivos' },
  { id: 'detalle', label: 'Detalle' },
  { id: 'resumen', label: 'Resumen' },
]

export function PermisoWizard({
  alumnoId,
  prefill,
  onClose,
}: {
  alumnoId: string
  prefill?: { fecha_inicio: string; fecha_fin: string } | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const { data: tipos = [] } = useQuery({ queryKey: ['permisos-tipos'], queryFn: () => listTiposPermiso() })

  const [step, setStep] = useState(0)
  const [inicio, setInicio] = useState(prefill?.fecha_inicio ?? hoyISO())
  const [fin, setFin] = useState(prefill?.fecha_fin ?? prefill?.fecha_inicio ?? hoyISO())
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [detalle, setDetalle] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [intentado, setIntentado] = useState(false)
  const camaraRef = useRef<HTMLInputElement>(null)
  const archivoRef = useRef<HTMLInputElement>(null)

  const elegirArchivo = (file: File | null) => {
    if (!file) return
    setArchivo(file)
  }

  const tiposElegidos = useMemo(
    () => tipos.filter((t) => seleccion.includes(t.id)),
    [tipos, seleccion],
  )

  const errorPaso = useMemo(() => {
    if (step === 0) {
      if (!inicio || !fin) return 'Indica la fecha de inicio y la de fin.'
      if (fin < inicio) return 'La fecha final no puede ser antes de la inicial.'
    }
    if (step === 1 && seleccion.length === 0) return 'Elige al menos un motivo.'
    if (step === 2 && detalle.trim() === '') return 'Cuéntanos un poco más.'
    return ''
  }, [step, inicio, fin, seleccion.length, detalle])

  const mut = useMutation({
    mutationFn: () =>
      crearPermiso({
        alumno_id: alumnoId,
        fecha_inicio: inicio,
        fecha_fin: fin,
        detalle: detalle.trim(),
        tipos: seleccion,
        file: archivo,
      }),
    onSuccess: () => {
      toast.success('Solicitud enviada')
      qc.invalidateQueries({ queryKey: ['permisos-hijo', alumnoId] })
      qc.invalidateQueries({ queryKey: ['permisos-faltas', alumnoId] })
      qc.invalidateQueries({ queryKey: ['permisos-staff'] })
      dismiss()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const siguiente = () => {
    setIntentado(true)
    if (errorPaso) return
    setIntentado(false)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const atras = () => {
    setIntentado(false)
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <Modal
      open={open}
      title="Solicitar permiso"
      wide
      testId="permiso-wizard"
      onClose={dismiss}
      footer={
        <>
          {step > 0 ? (
            <button type="button" className="btn btn--ghost" onClick={atras}>
              Atrás
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cancelar
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="permiso-wizard-siguiente"
              onClick={siguiente}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="permiso-wizard-enviar"
              disabled={mut.isPending}
              onClick={() => mut.mutate()}
            >
              Enviar solicitud
            </button>
          )}
        </>
      }
    >
      <WizardSteps steps={STEPS} current={step} />

      {step === 0 ? (
        <div className="permiso-wizard__paso" data-testid="permiso-wizard-paso-fechas">
          <Field label="Desde" htmlFor="permiso-inicio">
            <input
              id="permiso-inicio"
              type="date"
              className="field__input"
              data-testid="permiso-wizard-inicio"
              value={inicio}
              onChange={(e) => {
                setInicio(e.target.value)
                if (fin < e.target.value) setFin(e.target.value)
              }}
            />
          </Field>
          <Field label="Hasta" htmlFor="permiso-fin">
            <input
              id="permiso-fin"
              type="date"
              className="field__input"
              data-testid="permiso-wizard-fin"
              value={fin}
              min={inicio}
              onChange={(e) => setFin(e.target.value)}
            />
          </Field>
          <p className="texto-muted" style={{ margin: 0 }}>
            Puedes pedir uno o varios días. Si ya pasó, también puedes justificarlo.
          </p>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="permiso-wizard__paso" data-testid="permiso-wizard-paso-motivos">
          <p className="texto-muted" style={{ margin: 0 }}>
            Elige uno o varios motivos.
          </p>
          <div className="permiso-wizard__tipos">
            {tipos.map((t) => {
              const activo = seleccion.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`permiso-wizard__tipo${activo ? ' permiso-wizard__tipo--activo' : ''}`}
                  data-testid={`permiso-wizard-tipo-${t.codigo}`}
                  aria-pressed={activo}
                  onClick={() =>
                    setSeleccion((prev) =>
                      activo ? prev.filter((id) => id !== t.id) : [...prev, t.id],
                    )
                  }
                >
                  {t.nombre}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="permiso-wizard__paso" data-testid="permiso-wizard-paso-detalle">
          <Field label="Detalle" htmlFor="permiso-detalle">
            <textarea
              id="permiso-detalle"
              className="field__input"
              rows={4}
              maxLength={2000}
              data-testid="permiso-wizard-detalle"
              placeholder="Cuéntanos qué pasó."
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
            />
          </Field>
          <div className="field">
            <span className="field__label">Adjunto (opcional)</span>
            <div className="permiso-wizard__adjuntos">
              <button
                type="button"
                className="btn btn--ghost"
                data-testid="permiso-wizard-camara"
                onClick={() => camaraRef.current?.click()}
              >
                <Camera size={18} aria-hidden /> Tomar foto
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                data-testid="permiso-wizard-adjunto"
                onClick={() => archivoRef.current?.click()}
              >
                <Paperclip size={18} aria-hidden /> Adjuntar archivo
              </button>
            </div>
            <input
              ref={camaraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="permiso-wizard__input-oculto"
              onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
            />
            <input
              ref={archivoRef}
              type="file"
              accept="image/*,application/pdf"
              className="permiso-wizard__input-oculto"
              onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
            />
            {archivo ? (
              <div className="permiso-wizard__archivo">
                <span>{archivo.name}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  aria-label="Quitar adjunto"
                  onClick={() => setArchivo(null)}
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
          <p className="texto-muted" style={{ margin: 0 }}>
            Imagen o PDF, máximo 10 MB.
          </p>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="permiso-wizard__resumen" data-testid="permiso-wizard-paso-resumen">
          <div>
            <strong>Fechas:</strong> {rangoPermiso(inicio, fin)}
          </div>
          <div>
            <strong>Motivos:</strong> {tiposElegidos.map((t) => t.nombre).join(', ')}
          </div>
          <div>
            <strong>Detalle:</strong> {detalle.trim()}
          </div>
          {archivo ? (
            <div>
              <strong>Adjunto:</strong> {archivo.name}
            </div>
          ) : null}
        </div>
      ) : null}

      {intentado && errorPaso ? (
        <p className="field__error" data-testid="permiso-wizard-error">
          {errorPaso}
        </p>
      ) : null}
    </Modal>
  )
}
