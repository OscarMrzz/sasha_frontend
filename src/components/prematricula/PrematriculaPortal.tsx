import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, BadgeCheck, ClipboardCheck, Clock3, Copy, Download, GraduationCap, Search } from 'lucide-react'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { PrematriculaForm } from '#/components/prematricula/PrematriculaForm'
import { ReciboPrematricula } from '#/components/prematricula/ReciboPrematricula'
import { getApiBaseUrl, userMessageFromError } from '#/lib/api'
import { descargarCodigoPrematriculaPdf } from '#/lib/prematriculaPdf'
import { getLoginConfig } from '#/services/configuracion'
import {
  consultarPrematricula,
  getModos,
  getOpcionesPrematricula,
  nombreSolicitud,
} from '#/services/prematricula'
import type { SolicitudPrematricula } from '#/services/prematricula'
import '#/styles/prematricula.css'

export function PrematriculaPortal({
  responsable = false,
}: {
  responsable?: boolean
}) {
  const queryClient = useQueryClient()
  const config = useQuery({
    queryKey: ['modos-institucion'],
    queryFn: getModos,
    refetchOnWindowFocus: false,
  })
  const opciones = useQuery({
    queryKey: ['prematricula-opciones'],
    queryFn: getOpcionesPrematricula,
  })
  const institucion = useQuery({
    queryKey: ['login-config'],
    queryFn: getLoginConfig,
  })
  const [form, setForm] = useState<'nuevo' | 'reingreso' | null>(null)
  const [consulta, setConsulta] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState<SolicitudPrematricula | null>(null)
  const [editar, setEditar] = useState(false)
  const [enviada, setEnviada] = useState<SolicitudPrematricula | null>(null)
  const buscar = useMutation({
    mutationFn: () => consultarPrematricula(codigo.trim()),
    onSuccess: (s) => setResultado(s),
  })
  const puedeEnviar = config.data?.abierta ?? false
  const success = (s: SolicitudPrematricula) => {
    if (responsable) void queryClient.invalidateQueries({ queryKey: ['prematriculas-responsable'] })
    const solicitud = { ...s, codigo: s.codigo || codigo }
    setEnviada(solicitud)
    descargarCodigoPrematriculaPdf({
      codigo: solicitud.codigo,
      institucion: institucion.data?.nombre_institucion ?? 'Institución educativa',
      url: `${window.location.origin}/prematricula`,
    })
    setForm(null)
    setEditar(false)
    setConsulta(false)
    setResultado(null)
  }
  return (
    <div className={responsable ? 'pre-responsable-portal' : 'pre-portal'}>
      {!responsable && <header className="pre-portal__brand">
        {institucion.data?.logo_url && (
          <img
            src={`${getApiBaseUrl()}${institucion.data.logo_url}`}
            alt="Logo de la institución"
          />
        )}
        <div>
          <span className="pre-eyebrow">Sasha · Admisiones</span>
          <h1>{institucion.data?.nombre_institucion ?? 'Prematrícula'}</h1>
        </div>
      </header>}
      <section className={responsable ? 'pre-responsable-section' : 'pre-hero'}>
        {responsable ? <h2>Prematrícula</h2> : <>
        <GraduationCap size={48} />
        <h2>El siguiente paso de su educación</h2>
        <p>
          Solicita una prematrícula o consulta el avance de una solicitud con su
          código.
        </p></>}
        {config.isPending ? (
          <p role="status">Consultando disponibilidad…</p>
        ) : config.isError ? (
          <p role="alert">{userMessageFromError(config.error)}</p>
        ) : (
          !puedeEnviar && (
            <p className="pre-alert">
              Aún no estamos en período de prematrícula.
            </p>
          )
        )}
        <div className="pre-public-actions">
          {responsable ? <>
            <button type="button" className="btn btn--primary" disabled={!puedeEnviar} onClick={() => setForm('nuevo')}>Nuevo ingreso</button>
            <button type="button" className="btn btn--primary" disabled={!puedeEnviar} onClick={() => setForm('reingreso')}>Reingreso</button>
          </> : <>
          <button
            className="pre-public-action pre-public-action--primary"
            disabled={!puedeEnviar}
            onClick={() => setForm('nuevo')}
          >
            <span className="pre-public-action__icon"><ClipboardCheck size={21} /></span>
            <span><strong>Prematricular</strong><small>{puedeEnviar ? 'Iniciar una solicitud de ingreso o reingreso' : 'Disponible durante el período de prematrícula'}</small></span>
            <span className="pre-public-action__arrow">→</span>
          </button>
          </>}
          {!responsable && <>
          <button
            className="pre-public-action"
            onClick={() => {
              setConsulta(true)
              setResultado(null)
              buscar.reset()
            }}
          >
            <span className="pre-public-action__icon"><Search size={21} /></span>
            <span><strong>Consultar avance de la prematrícula</strong><small>Revisa el estado con el código de tu solicitud</small></span>
            <span className="pre-public-action__arrow">→</span>
          </button>
          </>}
        </div>
      </section>
      {enviada && (
        <Modal open title="Prematrícula enviada" onClose={() => setEnviada(null)}>
          <section className="pre-success" role="status">
            <header className="pre-success__heading">
              <span className="pre-success__icon"><BadgeCheck size={27} aria-hidden="true" /></span>
              <div>
                <span>Solicitud recibida</span>
                <h2>Prematrícula enviada</h2>
              </div>
            </header>
            <div className="pre-success__code-card">
              <div className="pre-success__code-label">Código de seguimiento</div>
              <strong className="pre-code">{enviada.codigo ?? '—'}</strong>
              <button className="btn btn--secondary pre-success__copy" onClick={() => { void navigator.clipboard.writeText(enviada.codigo ?? '') }}>
                <Copy size={17} aria-hidden="true" /> Copiar código
              </button>
            </div>
            <div className="pre-success__status">
              <span><Clock3 size={19} aria-hidden="true" /></span>
              <div><strong>Pendiente de revisión</strong><small>La institución revisará los datos y el recibo que enviaste.</small></div>
            </div>
            <div className="pre-success__actions">
              <p><Download size={17} aria-hidden="true" /> El PDF con el código y las instrucciones ya se descargó.</p>
              <button
                className="btn btn--primary"
                onClick={() => descargarCodigoPrematriculaPdf({
                  codigo: enviada.codigo ?? '',
                  institucion: institucion.data?.nombre_institucion ?? 'Institución educativa',
                  url: `${window.location.origin}/prematricula`,
                })}
              >
                <Download size={17} aria-hidden="true" /> Descargar PDF otra vez
              </button>
            </div>
          </section>
        </Modal>
      )}
      {form && (
        <Modal
          open
          title={
            form === 'nuevo'
              ? 'Prematrícula de nuevo ingreso'
              : 'Prematrícula de reingreso'
          }
          onClose={() => setForm(null)}
          xl
        >
          {opciones.isPending ? (
            <p role="status">Cargando formulario…</p>
          ) : opciones.isError ? (
            <p role="alert">{userMessageFromError(opciones.error)}</p>
          ) : (
            <PrematriculaForm
              opciones={opciones.data}
              tipo={form}
              onCancel={() => setForm(null)}
              onSuccess={success}
            />
          )}
        </Modal>
      )}
      {consulta && (
        <Modal
          open
          title="Consultar prematrícula"
          onClose={() => setConsulta(false)}
          wide
        >
          <div className="pre-tracking">
            <form
              className="pre-tracking__form"
              onSubmit={(e) => {
                e.preventDefault()
                setResultado(null)
                buscar.mutate()
              }}
            >
              <Field label="Código de prematrícula">
                <input
                  className="field__input pre-tracking__code"
                  autoFocus
                  autoComplete="off"
                  required
                  maxLength={8}
                  minLength={8}
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={codigo}
                  placeholder="Ej. A1B2C3D4"
                  aria-label="Código de prematrícula de 8 caracteres"
                  onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                />
              </Field>
              <button className="btn btn--primary" disabled={buscar.isPending || codigo.length !== 8}>
                <Search size={17} aria-hidden="true" />
                {buscar.isPending ? 'Consultando…' : 'Consultar estado'}
              </button>
            </form>
            {buscar.isError && (
              <div className="pre-tracking__error" role="alert">
                <AlertCircle size={19} aria-hidden="true" />
                <p>{userMessageFromError(buscar.error)}</p>
              </div>
            )}
            {resultado && (
              <section className={`pre-tracking__result pre-tracking__result--${resultado.estado}`} aria-live="polite">
                <div className="pre-tracking__result-head">
                  <span className="pre-tracking__result-icon"><BadgeCheck size={24} aria-hidden="true" /></span>
                  <div className="pre-tracking__result-title">
                    <small>Solicitud encontrada</small>
                    <h3>{nombreSolicitud(resultado)}</h3>
                  </div>
                  <strong className={`pre-status__${resultado.estado}`}>
                    {{ pendiente: 'Pendiente de revisión', en_revision: 'En revisión', aprobada: 'Aprobada', denegada: 'Denegada' }[resultado.estado]}
                  </strong>
                </div>
                {resultado.estado === 'denegada' && (
                  <div className="pre-tracking__denial">
                    <div><AlertCircle size={18} aria-hidden="true" /><h4>Necesita correcciones</h4></div>
                    <p>{resultado.motivo_denegacion || 'La institución no indicó un motivo. Comunícate con admisiones para recibir orientación.'}</p>
                    <small>Corrige la solicitud y vuelve a enviarla. Conservarás el mismo código.</small>
                    <button
                      className="btn btn--primary"
                      disabled={!opciones.data}
                      onClick={() => setEditar(true)}
                    >
                      Corregir prematrícula
                    </button>
                  </div>
                )}
                <div className="pre-tracking__receipt">
                  <h4>Recibo de matrícula</h4>
                  <ReciboPrematricula codigo={codigo.trim()} />
                </div>
              </section>
            )}
          </div>
        </Modal>
      )}
      {editar && resultado && opciones.data && (
        <Modal
          open
          title="Corregir prematrícula"
          onClose={() => setEditar(false)}
          xl
        >
          <PrematriculaForm
            opciones={opciones.data}
            inicial={resultado}
            codigo={codigo.trim()}
            onCancel={() => setEditar(false)}
            onSuccess={success}
          />
        </Modal>
      )}
    </div>
  )
}
