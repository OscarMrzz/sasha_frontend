import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Upload } from 'lucide-react'
import { useState } from 'react'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'
import { useEsMovil } from '#/hooks/use-media-query'
import { SubirReciboModal } from '#/components/portal/padre/SubirReciboModal'
import { fechaCorta, hoyHonduras, lempiras, mesAnio } from '#/lib/fechas-padre'
import { getPagosHijo } from '#/services/portal'
import type { PortalMesPago, PortalObligacion } from '#/services/portal'
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

type TabPagos = 'proximamente' | 'retrasados' | 'meses' | 'matricula' | 'otros'

const TABS: { id: TabPagos; label: string }[] = [
  { id: 'proximamente', label: 'Próximamente' },
  { id: 'retrasados', label: 'Retrasados' },
  { id: 'meses', label: 'Meses' },
  { id: 'matricula', label: 'Matrícula' },
  { id: 'otros', label: 'Otros' },
]

/** Suma días a una fecha YYYY-MM-DD. */
function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function EstadoConcepto({ o, hoy }: { o: PortalObligacion; hoy: string }) {
  if (o.estado === 'pagado') return <span className="estado-pill estado-pill--ok">Pagado</span>
  if (o.recibo_estado === 'sin_revisar') {
    return <span className="estado-pill estado-pill--espera">Recibo en revisión</span>
  }
  if (o.recibo_estado === 'denegado') {
    return <span className="estado-pill estado-pill--mal">Recibo denegado</span>
  }
  if (o.fecha_vencimiento < hoy) {
    return <span className="estado-pill estado-pill--mal">Debe</span>
  }
  return <span className="estado-pill">Pendiente</span>
}

function ListaConceptos({
  items,
  vacio,
  testId,
  hoy,
}: {
  items: PortalObligacion[]
  vacio: string
  testId: string
  hoy: string
}) {
  if (items.length === 0) return <div className="empty-state">{vacio}</div>
  return (
    <ul className="app-list" data-testid={testId}>
      {items.map((o) => (
        <li
          key={o.obligacion_pago_id}
          className="app-list__item"
          data-testid={`padre-pago-${o.obligacion_pago_id}`}
        >
          <div className="app-list__cuerpo">
            <span className="app-list__titulo">{o.etiqueta}</span>
            <span className="app-list__sub">
              {lempiras(o.total)} · vence {fechaCorta(o.fecha_vencimiento)}
              {o.mora_monto > 0 ? ` · incluye ${lempiras(o.mora_monto)} de mora` : ''}
            </span>
            {o.bloquea_notas && o.estado !== 'pagado' ? (
              <span className="estado-pill estado-pill--espera">Bloquea notas</span>
            ) : null}
          </div>
          <div className="app-list__lado">
            <EstadoConcepto o={o} hoy={hoy} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function PagosHijo({ alumnoId }: { alumnoId: string }) {
  const [subir, setSubir] = useState(false)
  const [tab, setTab] = useState<TabPagos>('proximamente')
  const esMovil = useEsMovil()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-pagos', alumnoId],
    queryFn: () => getPagosHijo(alumnoId),
  })

  if (isLoading) return <div className="empty-state">Cargando pagos…</div>
  if (isError || !data) return <div className="empty-state">Hay problemas de conexión. Intente de nuevo.</div>

  const obligaciones = data.obligaciones
  const hoy = hoyHonduras()
  const limite = sumarDias(hoy, 30)

  const pagables = obligaciones
    .filter((o) => o.puede_subir_recibo)
    .map((o) => ({
      id: o.obligacion_pago_id,
      etiqueta: o.etiqueta,
      monto: o.total,
      vencido: o.estado !== 'pagado' && o.fecha_vencimiento < hoy,
      anio: o.anio,
      mes: o.mes,
    }))

  const pendientes = obligaciones.filter((o) => o.estado !== 'pagado')
  const proximos = pendientes
    .filter((o) => o.fecha_vencimiento >= hoy && o.fecha_vencimiento <= limite)
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
  const retrasados = pendientes
    .filter((o) => o.fecha_vencimiento < hoy)
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
  const totalProximos = proximos.reduce((s, o) => s + o.total, 0)
  const totalRetrasados = retrasados.reduce((s, o) => s + o.total, 0)
  const matricula = obligaciones.filter((o) => o.tipo_codigo === 'matricula')
  const otrosConceptos = obligaciones.filter(
    (o) => o.tipo_codigo !== 'mensualidad' && o.tipo_codigo !== 'matricula',
  )
  const mesesOrdenados = [...data.meses].sort(
    (a, b) => b.anio * 100 + b.mes - (a.anio * 100 + a.mes),
  )

  const primerVencido = pagables.find((p) => p.vencido)
  const inicialId = primerVencido
    ? primerVencido.id
    : pagables.length > 0
      ? pagables[0].id
      : undefined
  const conteos: Record<TabPagos, number> = {
    proximamente: proximos.length,
    retrasados: retrasados.length,
    meses: data.meses.length,
    matricula: matricula.length,
    otros: otrosConceptos.length,
  }

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

      {esMovil ? (
        <label className="pagos-filtro-movil">
          <span className="field__label">Ver</span>
          <select
            className="field__select"
            data-testid="padre-pagos-filtro"
            value={tab}
            onChange={(e) => setTab(e.target.value as TabPagos)}
          >
            {TABS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({conteos[t.id]})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="pagos-tabs" role="tablist" aria-label="Secciones de pagos">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`pagos-tabs__tab${tab === t.id ? ' pagos-tabs__tab--activo' : ''}`}
              data-testid={`padre-pagos-tab-${t.id}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <span className="pagos-tabs__conteo">{conteos[t.id]}</span>
            </button>
          ))}
        </div>
      )}
      <section className="app-seccion">
        {tab === 'proximamente' ? (
          <>
            <div className="pago-info" data-testid="padre-pagos-pendiente">
              Pendiente en los próximos 30 días: <strong>{lempiras(totalProximos)}</strong>
            </div>
            <ListaConceptos
              items={proximos}
              vacio="No hay pagos para los próximos 30 días."
              testId="padre-pagos-proximamente"
              hoy={hoy}
            />
          </>
        ) : null}

        {tab === 'retrasados' ? (
          <>
            {retrasados.length > 0 ? (
              <div className="pago-info pago-info--mal" data-testid="padre-pagos-deuda">
                {retrasados.length} {retrasados.length === 1 ? 'retrasado' : 'retrasados'} ·{' '}
                {lempiras(totalRetrasados)}
              </div>
            ) : null}
            <ListaConceptos
              items={retrasados}
              vacio="No tiene pagos retrasados."
              testId="padre-pagos-retrasados"
              hoy={hoy}
            />
          </>
        ) : null}

        {tab === 'meses' ? (
          data.meses.length === 0 ? (
            <div className="empty-state">Aún no hay mensualidades registradas.</div>
          ) : (
            <ul className="app-list" data-testid="padre-pagos-meses">
              {mesesOrdenados.map((m) => (
                <li
                  key={`${m.anio}-${m.mes}`}
                  className="app-list__item"
                  data-testid={`padre-mes-${m.anio}-${m.mes}`}
                >
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
          )
        ) : null}

        {tab === 'matricula' ? (
          <ListaConceptos
            items={matricula}
            vacio="No hay cargos de matrícula."
            testId="padre-pagos-matricula"
            hoy={hoy}
          />
        ) : null}

        {tab === 'otros' ? (
          <ListaConceptos
            items={otrosConceptos}
            vacio="No hay otros conceptos."
            testId="padre-pagos-otros"
            hoy={hoy}
          />
        ) : null}
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
                  <span className="app-list__titulo">Recibo de {r.etiqueta}</span>
                  <span className="app-list__sub">Enviado el {fechaCorta(r.created_at)}</span>
                  {r.estado === 'denegado' && r.observaciones ? (
                    <span className="app-list__sub">Motivo: {r.observaciones}</span>
                  ) : null}
                </div>
                <div className="app-list__lado">
                  <span className={`estado-pill ${RECIBO_PILL[r.estado].cls}`}>
                    {RECIBO_PILL[r.estado].txt}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {subir ? (
        <SubirReciboModal
          alumnoId={alumnoId}
          obligaciones={pagables}
          inicialId={inicialId}
          onClose={() => setSubir(false)}
        />
      ) : null}
    </>
  )
}