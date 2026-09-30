import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Upload } from 'lucide-react'
import { useState } from 'react'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'
import { SubirReciboModal } from '#/components/portal/padre/SubirReciboModal'
import { fechaCorta, lempiras, mesAnio } from '#/lib/fechas-padre'
import { getPagosHijo } from '#/services/portal'
import type { PortalMesPago } from '#/services/portal'
import type { EstadoRecibo } from '#/services/pagos'

export const Route = createFileRoute('/_app/hijo/pagos')({
  component: () => (
    <PadreScreen title="Pagos" testId="padre-pagos">
      {(alumnoId) => <PagosHijo alumnoId={alumnoId} />}
    </PadreScreen>
  ),
})

function EstadoMes({ m }: { m: PortalMesPago }) {
  if (m.estado === 'pagado') return <span className="estado-pill estado-pill--ok">Pagado</span>
  if (m.recibo_estado === 'sin_revisar') {
    return <span className="estado-pill estado-pill--espera">Recibo en revisión</span>
  }
  if (m.vencido) return <span className="estado-pill estado-pill--mal">Debe</span>
  if (m.recibo_estado === 'denegado') return <span className="estado-pill estado-pill--mal">Recibo denegado</span>
  return <span className="estado-pill">Pendiente</span>
}

const RECIBO_PILL: Record<EstadoRecibo, { txt: string; cls: string }> = {
  sin_revisar: { txt: 'En revisión', cls: 'estado-pill--espera' },
  aprobado: { txt: 'Aprobado', cls: 'estado-pill--ok' },
  denegado: { txt: 'Denegado', cls: 'estado-pill--mal' },
}

function PagosHijo({ alumnoId }: { alumnoId: string }) {
  const [subir, setSubir] = useState(false)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-pagos', alumnoId],
    queryFn: () => getPagosHijo(alumnoId),
  })

  if (isLoading) return <div className="empty-state">Cargando pagos…</div>
  if (isError || !data) return <div className="empty-state">Hay problemas de conexión. Intente de nuevo.</div>

  const pagables = data.meses.filter((m) => m.estado !== 'pagado' && m.recibo_estado !== 'sin_revisar')
  const primerVencido = pagables.find((m) => m.vencido)
  const proximo = data.proximo

  return (
    <>
      <div className="app-sticky-accion">
        <button
          type="button"
          className="app-boton-grande"
          data-testid="padre-subir-recibo"
          disabled={pagables.length === 0}
          onClick={() => setSubir(true)}
        >
          <Upload size={22} aria-hidden /> Subir recibo de pago
        </button>
      </div>

      {data.vencidos > 0 ? (
        <div className="pago-proximo pago-proximo--deuda" data-testid="padre-pagos-deuda">
          <p className="pago-proximo__etiqueta">Pagos atrasados</p>
          <p className="pago-proximo__mes">
            {data.vencidos} {data.vencidos === 1 ? 'mes' : 'meses'} · {lempiras(data.monto_vencido)}
          </p>
          <p className="pago-proximo__detalle">
            Si ya pagó, suba el recibo para que caja lo revise.
          </p>
        </div>
      ) : null}

      {data.proximo ? (
        <div className="pago-proximo" data-testid="padre-pagos-proximo">
          <p className="pago-proximo__etiqueta">Próximo pago</p>
          <p className="pago-proximo__mes">{mesAnio(data.proximo.anio, data.proximo.mes)}</p>
          <p className="pago-proximo__detalle">
            <strong>{lempiras(data.proximo.monto)}</strong> · Fecha límite: {fechaCorta(data.proximo.fecha_vencimiento)}
          </p>
        </div>
      ) : data.vencidos === 0 ? (
        <div className="pago-proximo" data-testid="padre-pagos-al-dia">
          <p className="pago-proximo__etiqueta">Todo al día</p>
          <p className="pago-proximo__detalle">No tiene pagos pendientes.</p>
        </div>
      ) : null}

      <section className="app-seccion">
        <h2 className="app-seccion__titulo">Mensualidades</h2>
        {data.meses.length === 0 ? (
          <div className="empty-state">Aún no hay mensualidades registradas.</div>
        ) : (
          <ul className="app-list" data-testid="padre-pagos-meses">
            {data.meses.map((m) => (
              <li key={`${m.anio}-${m.mes}`} className="app-list__item" data-testid={`padre-mes-${m.anio}-${m.mes}`}>
                <div className="app-list__cuerpo">
                  <span className="app-list__titulo">{mesAnio(m.anio, m.mes)}</span>
                  <span className="app-list__sub">
                    {lempiras(m.monto)} · vence {fechaCorta(m.fecha_vencimiento)}
                  </span>
                </div>
                <div className="app-list__lado">
                  <EstadoMes m={m} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="app-seccion">
        <h2 className="app-seccion__titulo">Recibos enviados</h2>
        {data.recibos.length === 0 ? (
          <div className="empty-state">Todavía no ha enviado recibos.</div>
        ) : (
          <ul className="app-list" data-testid="padre-pagos-recibos">
            {data.recibos.map((r) => (
              <li key={r.id} className="app-list__item">
                <div className="app-list__cuerpo">
                  <span className="app-list__titulo">Recibo de {mesAnio(r.anio, r.mes)}</span>
                  <span className="app-list__sub">Enviado el {fechaCorta(r.created_at)}</span>
                  {r.estado === 'denegado' && r.observaciones ? (
                    <span className="app-list__sub">Motivo: {r.observaciones}</span>
                  ) : null}
                </div>
                <div className="app-list__lado">
                  <span className={`estado-pill ${RECIBO_PILL[r.estado].cls}`}>{RECIBO_PILL[r.estado].txt}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {subir ? (
        <SubirReciboModal
          alumnoId={alumnoId}
          meses={pagables}
          mesInicial={primerVencido ?? pagables.find((m) => m.anio === proximo?.anio && m.mes === proximo.mes)}
          onClose={() => setSubir(false)}
        />
      ) : null}
    </>
  )
}
