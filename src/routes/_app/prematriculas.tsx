import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BadgeCheck, GraduationCap, MessageSquareText, UserRound, UsersRound } from 'lucide-react'
import { useCan } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { Combobox } from '#/components/ui/Combobox'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { PrematriculaForm } from '#/components/prematricula/PrematriculaForm'
import { ReciboPrematricula } from '#/components/prematricula/ReciboPrematricula'
import { userMessageFromError } from '#/lib/api'
import { lempiras } from '#/lib/fechas-padre'
import { documentosPrematriculaAprobada } from '#/helpers/documentos-prematricula'
import {
  aprobarPrematricula,
  cambiarEstadoPrematricula,
  denegarPrematricula,
  eliminarPrematricula,
  getOpcionesPrematricula,
  listPrematriculas,
  nombreSolicitud,
  REVISORES_PREMATRICULA,
} from '#/services/prematricula'
import type {
  AprobacionPrematricula,
  SolicitudPrematricula,
} from '#/services/prematricula'
import '#/styles/prematricula.css'

export const Route = createFileRoute('/_app/prematriculas')({
  component: PrematriculasPage,
})
const col = createColumnHelper<SolicitudPrematricula>()
const estados = {
  pendiente: 'Pendiente de revisión',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  denegada: 'Denegada',
}
const opcionesEstado = Object.entries(estados).map(([value, label]) => ({ value, label }))
const etiquetasDatos: Record<string, string> = {
  primer_nombre: 'Primer nombre',
  segundo_nombre: 'Segundo nombre',
  primer_apellido: 'Primer apellido',
  segundo_apellido: 'Segundo apellido',
  fecha_nacimiento: 'Fecha de nacimiento',
  numero_identidad: 'Número de identidad',
  tipo_documento_identidad: 'Documento de identidad',
  telefono_contacto: 'Teléfono',
  direccion_domicilio: 'Dirección',
  fecha_ingreso: 'Fecha de ingreso',
  grados_repetidos: 'Grados repetidos',
  alergias: 'Alergias',
  condiciones_especiales: 'Condiciones especiales',
}
function etiquetaDato(key: string) {
  return etiquetasDatos[key] ?? key.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())
}
function valorDato(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) {
    return value.map((item) => valorDato(item)).filter(Boolean).join(', ') || 'Ninguno'
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item != null && item !== '')
      .map(([key, item]) => `${etiquetaDato(key)}: ${valorDato(item)}`)
      .join(' · ')
  }
  return String(value ?? '')
}
function PrematriculasPage() {
  const { roles } = useCan()
  const permitido = roles.some((r) => REVISORES_PREMATRICULA.includes(r))
  const qc = useQueryClient()
  const solicitudes = useQuery({
    queryKey: ['prematriculas'],
    queryFn: listPrematriculas,
    enabled: permitido,
  })
  const opciones = useQuery({
    queryKey: ['prematricula-opciones'],
    queryFn: getOpcionesPrematricula,
    enabled: permitido,
  })
  const [detalle, setDetalle] = useState<SolicitudPrematricula | null>(null)
  const [accion, setAccion] = useState<'ver' | 'validar' | 'editar'>('ver')
  const [ctx, setCtx] = useState<{
    row: SolicitudPrematricula
    x: number
    y: number
  } | null>(null)
  const [eliminar, setEliminar] = useState<SolicitudPrematricula | null>(null)
  const [motivo, setMotivo] = useState('')
  const [beca, setBeca] = useState('normal')
  const [monto, setMonto] = useState('')
  const [seccion, setSeccion] = useState('')
  const [decision, setDecision] = useState<'aprobar' | 'denegar' | null>(null)
  const [estadoModal, setEstadoModal] = useState<SolicitudPrematricula['estado']>('pendiente')
  const [documentosPendientes, setDocumentosPendientes] =
    useState<AprobacionPrematricula | null>(null)
  useEffect(() => {
    if (!ctx) return
    const close = () => setCtx(null)
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCtx(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('scroll', close, true)
    }
  }, [ctx])
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['prematriculas'] })
  }
  const abrir = (s: SolicitudPrematricula, a: typeof accion) => {
    setDetalle(s)
    setAccion(a)
    setMotivo('')
    setBeca('normal')
    setMonto('')
    setSeccion(s.datos.seccion_id ?? '')
    setDecision(null)
    setEstadoModal(s.estado)
    setCtx(null)
  }
  const cambiarEstado = useMutation({
    mutationFn: (estado: 'pendiente' | 'en_revision') =>
      cambiarEstadoPrematricula(detalle!.id, estado),
    onSuccess: (solicitud) => {
      setDetalle(solicitud)
      setEstadoModal(solicitud.estado)
      refresh()
      toast.success(`Estado actualizado: ${estados[solicitud.estado]}`)
    },
    onError: (error) => toast.error(userMessageFromError(error)),
  })
  const cambiar = useMutation({
    mutationFn: async () => {
      if (!detalle) throw new Error('Selecciona una prematrícula.')
      if (decision === 'denegar')
        return denegarPrematricula(detalle.id, motivo.trim())
      const result = await aprobarPrematricula(detalle.id, {
        tipo_beca: beca,
        ...(beca === 'especial' ? { monto_especial: Number(monto) } : {}),
        ...(seccion ? { seccion_id: seccion } : {}),
      })
      try {
        const aviso = await documentosPrematriculaAprobada(result)
        if (aviso) toast.warning(aviso)
      } catch (e) {
        setDocumentosPendientes(result)
        toast.warning(
          `Matrícula aprobada. No se pudo descargar la carpeta: ${userMessageFromError(e)}`,
        )
      }
      return result.solicitud
    },
    onSuccess: () => {
      toast.success(
        decision === 'aprobar'
          ? 'Prematrícula aprobada y matrícula registrada'
          : 'Prematrícula denegada',
      )
      setDecision(null)
      setDetalle(null)
      refresh()
    },
    onError: (e) => {
      setDecision(null)
      toast.error(userMessageFromError(e))
    },
  })
  const descargarPendientes = useMutation({
    mutationFn: async () => {
      if (!documentosPendientes) return
      const aviso = await documentosPrematriculaAprobada(documentosPendientes)
      if (aviso) toast.warning(aviso)
      setDocumentosPendientes(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })
  const borrar = useMutation({
    mutationFn: () => eliminarPrematricula(eliminar!.id),
    onSuccess: () => {
      setEliminar(null)
      refresh()
      toast.success('Prematrícula eliminada')
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })
  const gradoMensualidadID = opciones.data?.secciones.find((item) => item.id === seccion)?.grado_id
    ?? detalle?.datos.grado_id
  const mensualidadBase = gradoMensualidadID
    ? opciones.data?.costos_mensualidad?.[gradoMensualidadID]
    : undefined
  const mensualidadFinal = beca === 'especial'
    ? (monto === '' ? undefined : Number(monto))
    : mensualidadBase == null
      ? undefined
      : beca === 'completa'
        ? 0
        : beca === 'media'
          ? mensualidadBase / 2
          : mensualidadBase
  const aceptarEstado = () => {
    if (!detalle) return
    if (estadoModal === 'pendiente' || estadoModal === 'en_revision') {
      cambiarEstado.mutate(estadoModal)
    } else if (estadoModal === 'aprobada') {
      setDecision('aprobar')
    } else if (motivo.trim()) {
      setDecision('denegar')
    }
  }
  const columns = [
    col.display({
      id: 'alumno',
      header: 'Alumno',
      cell: (i) => nombreSolicitud(i.row.original),
    }),
    col.accessor('tipo', {
      header: 'Tipo',
      cell: (i) => (i.getValue() === 'nuevo' ? 'Nuevo ingreso' : 'Reingreso'),
    }),
    col.accessor('estado', {
      header: 'Estado',
      cell: (i) => estados[i.getValue()],
    }),
    col.accessor('corregida_at', {
      header: 'Corrección',
      cell: (i) => {
        const fecha = i.getValue()
        return fecha ? <span className="pre-corrected-badge"><BadgeCheck size={15} aria-hidden="true" /> Corregida</span> : null
      },
    }),
    col.accessor('observaciones', { header: 'Observaciones' }),
  ]
  const acciones = (s: SolicitudPrematricula) => [
    { label: 'Ver', onClick: () => abrir(s, 'ver') },
    ...(s.estado === 'aprobada'
      ? []
      : [
          { label: 'Validar', onClick: () => abrir(s, 'validar') },
          { label: 'Editar', onClick: () => abrir(s, 'editar') },
          { label: 'Eliminar', danger: true, onClick: () => setEliminar(s) },
        ]),
  ]
  if (!permitido)
    return <p role="alert">No tienes acceso a la revisión de prematrículas.</p>
  return (
    <div className="page">
      {documentosPendientes && (
        <section className="pre-alert" role="status">
          <p>
            La matrícula se registró. La carpeta de documentos sigue pendiente
            de descarga; puedes reintentarlo mientras mantengas esta página
            abierta.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            disabled={descargarPendientes.isPending}
            onClick={() => descargarPendientes.mutate()}
          >
            {descargarPendientes.isPending
              ? 'Generando carpeta…'
              : 'Reintentar descarga de documentos'}
          </button>
        </section>
      )}
      {solicitudes.isError && (
        <p role="alert">{userMessageFromError(solicitudes.error)}</p>
      )}
      {solicitudes.isPending && <p role="status">Cargando prematrículas…</p>}
      <DataTable
        title="Prematrículas"
        data={solicitudes.data ?? []}
        columns={columns}
        onAdd={() => {
          window.open('/prematricula', '_blank', 'noopener,noreferrer')
        }}
        filters={[
          {
            id: 'estado',
            label: 'Estado',
            getValue: (s) => s.estado,
            getLabel: (s) => estados[s.estado],
          },
          { id: 'tipo', label: 'Tipo', getValue: (s) => s.tipo },
        ]}
        searchText={nombreSolicitud}
        exportFilename="prematriculas"
        exportRows={(solicitudes.data ?? []).map((s) => ({
          Alumno: nombreSolicitud(s),
          Tipo: s.tipo,
          Estado: estados[s.estado],
          Corrección: s.corregida_at ? 'Corregida' : '',
          Observaciones: s.observaciones,
        }))}
        rowActions={acciones}
        onRowDoubleClick={(s) => abrir(s, 'ver')}
        onRowContextMenu={(row, e) => {
          e.preventDefault()
          const actions = acciones(row)
          const width = 190
          const height = actions.length * 38 + 12
          setCtx({
            row,
            x: Math.max(8, Math.min(e.clientX, window.innerWidth - width - 8)),
            y: Math.max(8, Math.min(e.clientY, window.innerHeight - height - 8)),
          })
        }}
        card={{
          title: nombreSolicitud,
          status: (s) => ({ label: estados[s.estado] }),
        }}
      />
      {ctx && (
        <div
          className="ctx-menu"
          style={{ top: ctx.y, left: ctx.x }}
          role="menu"
        >
          {acciones(ctx.row).map((a) => (
            <button
              type="button"
              role="menuitem"
              className={`ctx-menu__item${a.danger ? ' ctx-menu__item--danger' : ''}`}
              data-testid={`prematricula-accion-${a.label.toLowerCase()}-${ctx.row.id}`}
              key={a.label}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      {detalle && (
        <Modal
          open
          xl
          title={`${accion === 'ver' ? 'Ver' : accion === 'editar' ? 'Editar' : 'Validar'} prematrícula`}
          onClose={() => setDetalle(null)}
          footer={accion === 'validar' && detalle.estado !== 'aprobada' ? (
            <div className="pre-review__footer">
              <button type="button" className="btn btn--secondary" onClick={() => { setDecision(null); setDetalle(null) }}>Cancelar</button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={cambiarEstado.isPending || cambiar.isPending || (estadoModal === 'denegada' && !motivo.trim()) || (estadoModal === 'aprobada' && beca === 'especial' && (monto === '' || Number(monto) < 0))}
                onClick={aceptarEstado}
              >
                {cambiarEstado.isPending || cambiar.isPending ? 'Guardando…' : 'Aceptar'}
              </button>
            </div>
          ) : undefined}
        >
          {accion === 'editar' ? (
            opciones.data ? (
              <PrematriculaForm
                opciones={opciones.data}
                inicial={detalle}
                revision
                onCancel={() => setDetalle(null)}
                onSuccess={() => {
                  setDetalle(null)
                  refresh()
                  toast.success('Prematrícula actualizada')
                }}
              />
            ) : (
              <p>Cargando opciones…</p>
            )
          ) : (
            <div className="pre-review">
              <header className="pre-review__hero">
                <span className="pre-review__hero-icon"><GraduationCap size={25} aria-hidden="true" /></span>
                <div className="pre-review__hero-copy">
                  <span>{detalle.tipo === 'nuevo' ? 'Nuevo ingreso' : 'Reingreso'}</span>
                  <h2>{nombreSolicitud(detalle)}</h2>
                </div>
                <span className={`pre-review__status pre-review__status--${detalle.estado}`}><BadgeCheck size={16} />{estados[detalle.estado]}</span>
              </header>
              <div className="pre-review__layout">
                <div className="pre-review__main">
                  <section className="pre-review__panel">
                    <h3><UserRound size={18} /> Datos del alumno</h3>
                    <dl className="pre-review__fields">
                      {Object.entries(detalle.datos.alumno ?? {})
                        .filter(([key, value]) => value != null && value !== '' && !['path_imagen', 'foto_url', 'id', 'perfil_id'].includes(key))
                        .map(([key, value]) => (
                          <div key={key}>
                            <dt>{etiquetaDato(key)}</dt>
                            <dd>{valorDato(value)}</dd>
                          </div>
                        ))}
                    </dl>
                  </section>
                  <section className="pre-review__panel">
                    <h3><GraduationCap size={18} /> Datos académicos</h3>
                    <div className="pre-review__academic">
                      <div><small>Grado solicitado</small><strong>{opciones.data?.grados.find((g) => g.id === detalle.datos.grado_id)?.nombre ?? 'Determinado por el sistema'}</strong></div>
                      <div><small>Modalidad</small><strong>{opciones.data?.modalidades.find((m) => m.id === detalle.datos.modalidad_id)?.nombre ?? 'Por asignar'}</strong></div>
                      <div><small>Sección</small><strong>{opciones.data?.secciones.find((s) => s.id === detalle.datos.seccion_id)?.nombre ?? 'Por asignar'}</strong></div>
                    </div>
                  </section>
                  {detalle.datos.responsables?.length ? (
                    <section className="pre-review__panel">
                      <h3><UsersRound size={18} /> Responsables</h3>
                      <div className="pre-review__people">
                        {detalle.datos.responsables.map((r, i) => (
                          <article className="pre-review__person" key={i}>
                            <strong>{[r.primer_nombre, r.segundo_nombre, r.primer_apellido, r.segundo_apellido].filter(Boolean).join(' ')}</strong>
                            <span>{[r.parentesco, r.telefono_contacto].filter(Boolean).join(' · ') || 'Datos de contacto no disponibles'}</span>
                            {r.direccion_domicilio && <small>{r.direccion_domicilio}</small>}
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : null}
                  <section className="pre-review__panel">
                    <h3><MessageSquareText size={18} /> Observaciones</h3>
                    <p className="pre-review__note">{detalle.observaciones || 'La familia no agregó observaciones.'}</p>
                  </section>
                  {detalle.motivo_denegacion && <section className="pre-review__panel pre-review__panel--warning"><h3>Motivo de denegación</h3><p className="pre-review__note">{detalle.motivo_denegacion}</p></section>}
                </div>
                <aside className="pre-review__receipt"><ReciboPrematricula id={detalle.id} /></aside>
              </div>
              {accion === 'validar' && detalle.estado !== 'aprobada' && (
                <section className="pre-review__validation">
                  <header><h3>Revisión de la solicitud</h3><p>Selecciona el estado que corresponda. La solicitud no se aprobará ni denegará hasta aceptar.</p></header>
                  <Field label="Estado de la solicitud">
                    <Combobox
                      value={estadoModal}
                      onChange={(value) => setEstadoModal(value as SolicitudPrematricula['estado'])}
                      options={opcionesEstado}
                      placeholder="Buscar estado…"
                      data-testid="prematricula-estado-combobox"
                    />
                  </Field>
                  {estadoModal === 'aprobada' && (
                    <div className="pre-review__approval-fields">
                      <div className="pre-review__approval-heading"><h4>Datos de matrícula</h4><p>Al aceptar, se registrará la matrícula definitiva.</p></div>
                      <div className="pre-grid">
                        <Field label="Beca para la mensualidad">
                          <Combobox
                            value={beca}
                            onChange={setBeca}
                            options={[
                              { value: 'normal', label: 'Pago normal' },
                              { value: 'media', label: 'Media beca' },
                              { value: 'completa', label: 'Beca completa' },
                              { value: 'especial', label: 'Monto especial' },
                            ]}
                            placeholder="Buscar tipo de pago…"
                          />
                          {mensualidadFinal != null ? (
                            <div className="pre-review__monthly-fee">
                              <span>Mensualidad a pagar</span>
                              <strong>{lempiras(mensualidadFinal)}</strong>
                            </div>
                          ) : beca !== 'especial' && opciones.isLoading ? (
                            <small className="pre-review__fee-hint">Cargando mensualidad…</small>
                          ) : beca !== 'especial' ? (
                            <small className="pre-review__fee-hint">No hay una mensualidad configurada para este grado.</small>
                          ) : null}
                        </Field>
                        {beca === 'especial' && (
                          <Field label="Mensualidad personalizada *">
                            <input className="field__input" type="number" min="0.01" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
                          </Field>
                        )}
                        <Field label="Sección">
                          <Combobox
                            value={seccion}
                            onChange={setSeccion}
                            options={[
                              { value: '', label: 'Asignación automática' },
                              ...(opciones.data?.secciones ?? [])
                                .filter((s) => (!detalle.datos.grado_id || s.grado_id === detalle.datos.grado_id) && (!detalle.datos.modalidad_id || s.modalidad_id === detalle.datos.modalidad_id))
                                .map((s) => ({ value: s.id, label: `${s.nombre} · ${opciones.data?.grados.find((g) => g.id === s.grado_id)?.nombre ?? ''}` })),
                            ]}
                            placeholder="Buscar sección…"
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                  {estadoModal === 'denegada' && (
                    <div className="pre-review__denial-fields">
                      <Field label="Justificación de la denegación *">
                        <textarea className="field__textarea" rows={4} maxLength={5000} required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explica qué debe corregir la familia…" />
                      </Field>
                      <small>La familia verá esta explicación en el seguimiento de su prematrícula.</small>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </Modal>
      )}
      <ConfirmDialog
        open={decision !== null}
        title={
          decision === 'aprobar'
            ? 'Aprobar prematrícula'
            : 'Denegar prematrícula'
        }
        message={
          decision === 'aprobar'
            ? 'Se registrará la matrícula definitiva. ¿Continuar?'
            : 'La familia verá el motivo y podrá corregir la solicitud.'
        }
        onConfirm={() => cambiar.mutate()}
        confirmDisabled={cambiar.isPending}
        onCancel={() => setDecision(null)}
      />
      <ConfirmDialog
        open={eliminar !== null}
        title="Eliminar prematrícula"
        message="¿Eliminar esta solicitud?"
        onConfirm={() => borrar.mutate()}
        confirmDisabled={borrar.isPending}
        onCancel={() => setEliminar(null)}
      />
    </div>
  )
}
