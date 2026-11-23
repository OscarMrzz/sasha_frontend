import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { CalendarDays, Check, Copy, Download, ExternalLink, Globe2, GraduationCap, LockKeyhole, QrCode, Save, Settings2, X } from 'lucide-react'
import { useCan } from '#/components/gates/Can'
import { Field } from '#/components/ui/Field'
import { Combobox } from '#/components/ui/Combobox'
import { Modal } from '#/components/ui/Modal'
import {
  getModos,
  getOpcionesPrematricula,
  guardarModos,
} from '#/services/prematricula'
import type { ConfiguracionModos } from '#/services/prematricula'
import { userMessageFromError } from '#/lib/api'
import '#/styles/prematricula.css'

export const Route = createFileRoute('/_app/modos')({ component: ModosPage })
function ModosPage() {
  const { roles } = useCan()
  const admin = roles.includes('admin')
  const qc = useQueryClient()
  const config = useQuery({
    queryKey: ['modos-institucion'],
    queryFn: getModos,
    enabled: admin,
  })
  const opciones = useQuery({
    queryKey: ['prematricula-opciones'],
    queryFn: getOpcionesPrematricula,
    enabled: admin,
  })
  const [form, setForm] = useState<Omit<ConfiguracionModos, 'abierta'>>({
    modo: 'normal',
    inicio: null,
    fin: null,
    pagina_publica_habilitada: false,
    periodo_destino_id: null,
  })
  const [pendingMode, setPendingMode] = useState<'cierre' | 'prematricula' | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [publicUrl, setPublicUrl] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  useEffect(() => {
    if (config.data) setForm(config.data)
  }, [config.data])
  const save = useMutation({
    mutationFn: (values: Omit<ConfiguracionModos, 'abierta'> = form) =>
      guardarModos({
        ...values,
        inicio: values.inicio
          ? new Date(`${values.inicio.slice(0, 10)}T00:00:00`).toISOString()
          : null,
        fin: values.fin
          ? new Date(`${values.fin.slice(0, 10)}T23:59:59`).toISOString()
          : null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['modos-institucion'] })
      toast.success('Modo institucional actualizado')
      setPendingMode(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })
  if (!admin)
    return <p role="alert">Solo el administrador puede configurar los modos.</p>
  const modos = [
    {
      value: 'normal',
      number: '01',
      title: 'Modo normal',
      desc: 'La comunidad escolar usa Sasha con sus accesos habituales.',
      Icon: GraduationCap,
    },
    {
      value: 'cierre',
      number: '02',
      title: 'Cierre de período',
      desc: 'Los responsables dejan de tener acceso a las opciones normales y solo pueden consultar las calificaciones.',
      Icon: LockKeyhole,
    },
    {
      value: 'prematricula',
      number: '03',
      title: 'Prematrícula',
      desc: 'Los responsables registrados pueden solicitar el reingreso de sus hijos o pedir matrícula para un hijo nuevo. Las familias nuevas pueden iniciar su solicitud desde la página pública.',
      Icon: CalendarDays,
    },
  ] as const
  const selectedModeTitle = modos.find((m) => m.value === form.modo)?.title ?? 'Modo normal'
  const copyPublicUrl = async () => {
    const url = new URL('/prematricula', window.location.origin).toString()
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Enlace de prematrícula copiado')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }
  const showPublicQr = async () => {
    const url = new URL('/prematricula', window.location.origin).toString()
    setPublicUrl(url)
    setQrOpen(true)
    setQrLoading(true)
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 3,
        width: 360,
        color: { dark: '#17212b', light: '#ffffff' },
      })
      setQrDataUrl(dataUrl)
    } catch {
      toast.error('No se pudo generar el código QR')
      setQrOpen(false)
    } finally {
      setQrLoading(false)
    }
  }
  const startModeSelection = (value: 'normal' | 'cierre' | 'prematricula') => {
    if (value === 'normal') {
      const nextForm = { ...form, modo: value, inicio: null, fin: null }
      setForm(nextForm)
      save.mutate(nextForm)
      setPendingMode(null)
      return
    }
    setPendingMode(value)
  }
  const confirmModeSelection = () => {
    if (!pendingMode) return
    const nextForm = {
      ...form,
      modo: pendingMode,
      inicio: null,
      fin: null,
    }
    if (pendingMode === 'prematricula' && !nextForm.periodo_destino_id) {
      toast.error('Selecciona el período al que se matricularán')
      return
    }
    setForm(nextForm)
    save.mutate(nextForm)
  }
  return (
    <div className="page pre-modes-page">
      <header className="pre-modes-hero">
        <div className="pre-modes-hero__icon"><Settings2 aria-hidden="true" /></div>
        <div className="pre-modes-hero__copy">
            <span className="pre-eyebrow">Administración escolar · Control de acceso</span>
          <h1>Modos institucionales</h1>
          <p>Configura el modo del período: normal, cierre de período o prematrícula.</p>
        </div>
        <div className="pre-modes-hero__status" data-active={form.modo}>
          <span className="pre-modes-hero__status-dot" />
          <span>Modo seleccionado</span>
          <strong>{modos.find((m) => m.value === form.modo)?.title}</strong>
        </div>
      </header>
      {config.isError && (
        <p role="alert">{userMessageFromError(config.error)}</p>
      )}
      <form
        className="pre-form"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate(form)
        }}
      >
        <section className="pre-modes-section" aria-labelledby="pre-modes-choice-title">
          <div className="pre-modes-section__heading">
            <span className="pre-modes-section__step">01</span>
            <div><h2 id="pre-modes-choice-title">Elige el modo de trabajo</h2><p>El cambio modifica las opciones visibles para alumnos y responsables.</p></div>
          </div>
          <div className="pre-mode-options">
          {modos.map((m) => (
            <label
              key={m.value}
              className={`pre-mode${form.modo === m.value ? ' pre-mode--active' : ''}`}
            >
              <input
                type="radio"
                name="modo"
                value={m.value}
                checked={form.modo === m.value}
                onChange={() => startModeSelection(m.value)}
              />
              <span className="pre-mode__top"><span className="pre-mode__icon"><m.Icon aria-hidden="true" /></span><span className="pre-mode__number">{m.number}</span></span>
              <strong>{m.title}</strong>
              <span className="pre-mode__description">{m.desc}</span>
              {m.value === 'prematricula' && (
                <span className="pre-mode__public-actions">
                  <a className="pre-mode__public-link" href="/prematricula" target="_blank" rel="noreferrer">Abrir página pública <ExternalLink size={14} /></a>
                  <button type="button" className="btn btn--secondary" onClick={() => void copyPublicUrl()}><Copy size={15} /> Copiar enlace</button>
                  <button type="button" className="btn btn--primary" onClick={() => void showPublicQr()}><QrCode size={15} /> Ver QR</button>
                </span>
              )}
              <span className="pre-mode__select">{form.modo === m.value ? <><Check size={15} /> Seleccionado</> : 'Elegir modo'}</span>
            </label>
          ))}
          </div>
        </section>
        <section className="pre-modes-public" aria-labelledby="pre-modes-public-title">
          <div className="pre-modes-public__symbol"><Globe2 aria-hidden="true" /></div>
          <div className="pre-modes-public__copy"><h2 id="pre-modes-public-title">Página pública</h2><p>Permite que cualquier familia inicie una solicitud sin tener una cuenta de Sasha.</p><a href="/prematricula" target="_blank" rel="noreferrer">Vista previa <ExternalLink size={15} /></a></div>
          <label className="pre-switch"><input type="checkbox" checked={form.pagina_publica_habilitada} onChange={(e) => setForm({ ...form, pagina_publica_habilitada: e.target.checked })} /><span className="pre-switch__track" /><span className="sr-only">Habilitar página pública de prematrícula independientemente del modo</span></label>
        </section>
        <p className="pre-modes-note">La consulta de estado permanece disponible para quienes ya enviaron una solicitud.</p>
        <div className="pre-actions pre-modes-actions">
          <span>{form.modo === 'normal' ? 'El modo normal está activo.' : `${selectedModeTitle} está seleccionado.`}</span>
          <button
            className="btn btn--primary"
            disabled={save.isPending || config.isPending}
          >
            {save.isPending ? 'Guardando…' : <><Save size={17} /> Guardar configuración</>}
          </button>
        </div>
      </form>
      <Modal
        open={qrOpen}
        title="Código QR de prematrícula"
        onClose={() => setQrOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setQrOpen(false)}>Cerrar</button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!qrDataUrl}
              onClick={() => {
                if (!qrDataUrl) return
                const link = document.createElement('a')
                link.href = qrDataUrl
                link.download = 'prematricula-qr.png'
                link.click()
              }}
            >
              <Download size={17} /> Descargar PNG
            </button>
          </>
        }
      >
        <div className="pre-qr-modal">
          <p>Comparte este código para que las familias abran la página pública de prematrícula.</p>
          <div className="pre-qr-modal__image">
            {qrLoading ? <span role="status">Generando código QR…</span> : <img src={qrDataUrl} alt="Código QR para abrir la página pública de prematrícula" />}
          </div>
          <div className="pre-qr-modal__url">
            <span>Enlace público</span>
            <code>{publicUrl}</code>
          </div>
        </div>
      </Modal>
      {pendingMode && (
        <div className="pre-mode-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setPendingMode(null) }}>
          <section className="pre-mode-modal" role="dialog" aria-modal="true" aria-labelledby="pre-mode-modal-title">
            <button type="button" className="pre-mode-modal__close" aria-label="Cerrar" onClick={() => setPendingMode(null)}><X size={18} /></button>
            <span className="pre-mode-modal__icon"><CalendarDays /></span>
            <span className="pre-eyebrow">Activación inmediata</span>
            <h2 id="pre-mode-modal-title">¿Cuándo quieres activar {pendingMode === 'cierre' ? 'el cierre de período' : 'la prematrícula'}?</h2>
            <p>Al confirmar, el modo se activará de inmediato. Para cambiarlo, selecciona otro modo desde esta página.</p>
            {pendingMode === 'prematricula' && (
              <div className="pre-mode-modal__period">
                <Field label="Período de matrícula">
                  <Combobox
                    id="prematricula-periodo"
                    value={form.periodo_destino_id ?? ''}
                    onChange={(value) => setForm({ ...form, periodo_destino_id: value || null })}
                    options={(opciones.data?.periodos ?? []).map((p) => ({ value: p.id, label: p.nombre }))}
                    placeholder="Seleccionar período"
                    emptyLabel="No hay períodos disponibles"
                    disabled={opciones.isPending || !opciones.data?.periodos.length}
                  />
                </Field>
                {!opciones.isPending && !opciones.isError && !opciones.data?.periodos.length && (
                  <p className="pre-mode-modal__period-error" role="alert">No hay períodos disponibles. Crea o habilita un período antes de activar la prematrícula.</p>
                )}
                {opciones.isError && <p className="pre-mode-modal__period-error" role="alert">{userMessageFromError(opciones.error)}</p>}
              </div>
            )}
            <footer className="pre-mode-modal__actions"><button type="button" className="btn btn--ghost" onClick={() => setPendingMode(null)}>Cancelar</button><button type="button" className="btn btn--primary" onClick={confirmModeSelection} disabled={save.isPending || (pendingMode === 'prematricula' && (!form.periodo_destino_id || opciones.isPending || !opciones.data?.periodos.length))}>{save.isPending ? 'Guardando…' : `Activar ${pendingMode === 'cierre' ? 'cierre' : 'prematrícula'}`}</button></footer>
          </section>
        </div>
      )}
    </div>
  )
}
