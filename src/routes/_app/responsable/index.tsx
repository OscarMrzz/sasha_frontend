import { useQueries, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, FilePenLine, Upload } from 'lucide-react'
import { useCan } from '#/components/gates/Can'
import { useBovedaImage } from '#/hooks/use-boveda-image'
import { isResponsableRole } from '#/lib/home-path'
import { writePortalAlumnoId } from '#/lib/portal-context'
import { listHijos } from '#/services/portal'
import { getPagosHijo } from '#/services/portal'
import type { PortalObligacion } from '#/services/portal'
import { getModos } from '#/services/prematricula'
import { listPrematriculas, nombreSolicitud } from '#/services/prematricula'
import type { SolicitudPrematricula } from '#/services/prematricula'
import { PrematriculaPortal } from '#/components/prematricula/PrematriculaPortal'
import { SubirReciboModal } from '#/components/portal/padre/SubirReciboModal'
import { hoyHonduras, lempiras } from '#/lib/fechas-padre'
import type { PortalHijo } from '#/services/portal'

export const Route = createFileRoute('/_app/responsable/')({
  component: ResponsableHomePage,
})

function ResponsableHomePage() {
  const { roles } = useCan()
  const navigate = useNavigate()
  const responsable = isResponsableRole(roles)
  const config = useQuery({ queryKey: ['modos-institucion'], queryFn: getModos })
  const seguimiento = useQuery({
    queryKey: ['prematriculas-responsable'],
    queryFn: listPrematriculas,
    enabled: responsable,
    refetchOnWindowFocus: true,
  })
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['portal-hijos'],
    queryFn: listHijos,
    enabled: responsable,
  })
  const pagos = useQueries({
    queries: data.map((h) => ({
      queryKey: ['portal-pagos', h.alumno_id],
      queryFn: () => getPagosHijo(h.alumno_id),
      enabled: responsable,
    })),
  })
  const mora = data.flatMap((h, i) => {
    const obligaciones = pagos[i]?.data?.obligaciones ?? []
    const vencidas = obligaciones.filter((o) => o.estado !== 'pagado' && o.fecha_vencimiento < hoyHonduras())
    return vencidas.length ? [{ hijo: h, obligaciones: vencidas }] : []
  })

  const elegir = (h: PortalHijo) => {
    writePortalAlumnoId(h.alumno_id)
    void navigate({ to: '/alumno' })
  }
  const elegirNotas = (h: PortalHijo) => {
    writePortalAlumnoId(h.alumno_id)
    void navigate({ to: '/alumno/resultados' })
  }

  if (!responsable) {
    return (
      <div className="empty-state" role="alert">
        Esta pantalla es solo para responsables.
      </div>
    )
  }

  return (
    <div className="maestro-hub" data-testid="responsable-home">
      {isLoading || config.isPending || (data.length > 0 && pagos.some((p) => p.isPending)) ? <div className="empty-state">Cargando…</div> : isError || config.isError || pagos.some((p) => p.isError) ? <div className="empty-state" role="alert">Hay problemas de conexión.</div> : mora.length > 0 ? (
        <section className="responsable-deuda" data-testid="responsable-mora">
          <header className="responsable-deuda__heading">
            <AlertCircle size={22} aria-hidden="true" />
            <div><h1>Pagos pendientes</h1><p>Revisa los cargos vencidos y adjunta el recibo de pago.</p></div>
          </header>
          {(config.data.modo_efectivo ?? config.data.modo) === 'prematricula' && (
            <p className="responsable-deuda__aviso" role="status">
              Estamos en período de prematrícula. Tiene pagos pendientes. Cuando sus pagos sean confirmados, podrá acceder al panel de prematrícula.
            </p>
          )}
          {mora.map(({ hijo, obligaciones }) => {
            const uploadables = obligaciones.filter((o) => o.puede_subir_recibo).map((o) => ({ id: o.obligacion_pago_id, etiqueta: o.etiqueta, monto: o.total, vencido: true, anio: o.anio, mes: o.mes }))
            return <MoraCard key={hijo.alumno_id} hijo={hijo} obligaciones={obligaciones} uploadables={uploadables} />
          })}
        </section>
      ) : config.data.modo_efectivo === 'prematricula' || config.data.modo === 'prematricula' ? (
        <div className="responsable-prematricula-layout">
          <PrematriculaPortal responsable />
          <section className="portal-home__section responsable-calificaciones">
            <h2 className="portal-home__section-title">Calificaciones</h2>
            <ListaHijos data={data} loading={isLoading} error={isError} onChoose={elegirNotas} grades />
          </section>
        </div>
      ) : config.data.modo_efectivo === 'cierre' || config.data.modo === 'cierre' ? (
        <section className="portal-home__section">
          <h1 className="portal-home__section-title">Calificaciones</h1>
          <ListaHijos data={data} loading={isLoading} error={isError} onChoose={elegirNotas} grades />
        </section>
      ) : <ListaHijos data={data} loading={isLoading} error={isError} onChoose={elegir} />}
      <SeguimientoPrematriculas solicitudes={seguimiento.data ?? []} loading={seguimiento.isPending} error={seguimiento.isError} />
    </div>
  )
}

function SeguimientoPrematriculas({ solicitudes, loading, error }: { solicitudes: SolicitudPrematricula[]; loading: boolean; error: boolean }) {
  if (loading || error || solicitudes.length === 0) return null
  return (
    <section className="responsable-seguimiento" data-testid="responsable-seguimiento">
      <header className="responsable-seguimiento__heading">
        <h2>Seguimiento de prematrícula</h2>
        <p>Consulta el avance de las solicitudes de tus hijos.</p>
      </header>
      <ul className="responsable-seguimiento__lista">
        {solicitudes.map((solicitud) => {
          const estado = solicitud.estado
          const etapa = estado === 'pendiente' ? 'Pendiente de revisión' : estado === 'en_revision' ? 'En revisión' : estado === 'aprobada' ? 'Prematrícula aprobada' : 'Corrección requerida'
          const Icon = estado === 'pendiente' || estado === 'en_revision' ? Clock3 : estado === 'aprobada' ? CheckCircle2 : FilePenLine
          return (
            <li className={`responsable-seguimiento__fila responsable-seguimiento__fila--${estado}`} key={solicitud.id}>
              <span className="responsable-seguimiento__icono"><Icon size={20} aria-hidden="true" /></span>
              <span className="responsable-seguimiento__datos">
                <strong>{nombreSolicitud(solicitud)}</strong>
                <small>{solicitud.tipo === 'reingreso' ? 'Reingreso' : 'Nuevo ingreso'} · {etapa}</small>
                {estado === 'denegada' && solicitud.motivo_denegacion && <small className="responsable-seguimiento__motivo">Motivo: {solicitud.motivo_denegacion}</small>}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ListaHijos({ data, loading, error, onChoose, grades = false }: { data: PortalHijo[]; loading: boolean; error: boolean; onChoose: (h: PortalHijo) => void; grades?: boolean }) {
  if (loading) return <div className="empty-state">Cargando alumnos…</div>
  if (error) return <div className="empty-state" role="alert">Hay problemas de conexión.</div>
  if (!data.length) return <div className="empty-state">No tienes alumnos a cargo registrados.</div>
  return <div className="maestro-hub__cards" data-testid="responsable-hijos">{data.map((h) => <HijoCard key={h.alumno_id} hijo={h} onClick={() => onChoose(h)} grades={grades} />)}</div>
}

function MoraCard({ hijo, obligaciones, uploadables }: { hijo: PortalHijo; obligaciones: PortalObligacion[]; uploadables: {id:string; etiqueta:string; monto:number; vencido:boolean; anio?:number|null; mes?:number|null}[] }) {
  const [subir, setSubir] = useState(false)
  const total = obligaciones.reduce((s, o) => s + o.total, 0)
  return <article className="responsable-deuda-card">
    <h2 className="responsable-deuda-card__alumno">{hijo.nombre}</h2>
    <ul className="responsable-deuda-card__lista">
      {obligaciones.map((o) => <li className="responsable-deuda-card__fila" key={o.obligacion_pago_id}><span>{o.etiqueta}</span><strong>{lempiras(o.total)}</strong></li>)}
    </ul>
    <div className="responsable-deuda-card__total"><span>Total a pagar</span><strong>{lempiras(total)}</strong></div>
    <button type="button" className="btn btn--primary responsable-deuda-card__accion" disabled={!uploadables.length} onClick={() => setSubir(true)}><Upload size={19} aria-hidden="true" />Subir recibo</button>
    {subir && <SubirReciboModal alumnoId={hijo.alumno_id} obligaciones={uploadables} onClose={() => setSubir(false)} />}
  </article>
}

function HijoCard({ hijo, onClick, grades = false }: { hijo: PortalHijo; onClick: () => void; grades?: boolean }) {
  const foto = useBovedaImage(hijo.path_imagen)
  return (
    <button
      type="button"
      className="maestro-hub__card hijo-card"
      data-testid={`responsable-hijo-${hijo.user_code}`}
      onClick={onClick}
    >
      {foto ? (
        <img className="hijo-card__foto" src={foto} alt={`Foto de ${hijo.nombre}`} />
      ) : (
        <div className="hijo-card__foto hijo-card__foto--placeholder" aria-hidden="true">
          {hijo.nombre.slice(0, 1)}
        </div>
      )}
      <div className="hijo-card__datos">
        <h2 className="maestro-hub__card-title">{hijo.nombre}</h2>
        {grades && <p className="maestro-hub__card-meta">Ver calificaciones</p>}
        <p className="maestro-hub__card-meta">
          N.º de cuenta <strong>{hijo.user_code}</strong>
        </p>
        <p className="maestro-hub__card-meta texto-muted">
          {hijo.grado ? `${hijo.grado} · sec${hijo.seccion}` : 'Sin matrícula activa'}
        </p>
      </div>
    </button>
  )
}
