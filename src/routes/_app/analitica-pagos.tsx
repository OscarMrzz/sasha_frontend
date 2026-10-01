import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  PieChart,
  School,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { ChartRegistryContext } from '#/components/estadisticas/EChart'
import type { ChartRegistry } from '#/components/estadisticas/EChart'
import { BarrasGrado, DonaPuntualidad, MedidorPago, PuntualidadMensual } from '#/components/analitica-pagos/Graficas'
import { descargarAnaliticaPagosExcel, descargarAnaliticaPagosPdf } from '#/helpers/export-analitica-pagos'
import { userMessageFromError } from '#/lib/api'
import { lempiras, mesAnio } from '#/lib/fechas-padre'
import { getAnaliticaPagos } from '#/services/pagos'
import type { AnaliticaPagos, GrupoPago } from '#/services/pagos'

export const Route = createFileRoute('/_app/analitica-pagos')({
  component: AnaliticaPagosPage,
})

function nivel(pct: number) {
  if (pct >= 90) return 'ok'
  if (pct >= 70) return 'warn'
  return 'bad'
}

function AnaliticaPagosPage() {
  const { can } = useCan()
  const [menuDescarga, setMenuDescarga] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const registry = useMemo<ChartRegistry>(() => new Map(), [])
  const q = useQuery({ queryKey: ['analitica-pagos'], queryFn: getAnaliticaPagos, enabled: can('analitica_pagos:get') })
  const data = q.data

  const descargar = async (tipo: 'pdf' | 'excel') => {
    if (!data) return
    setMenuDescarga(false)
    setDescargando(true)
    try {
      if (tipo === 'pdf') await descargarAnaliticaPagosPdf(data, registry)
      else await descargarAnaliticaPagosExcel(data)
    } catch (e) {
      toast.error(userMessageFromError(e))
    } finally {
      setDescargando(false)
    }
  }

  return (
    <RequirePermission permission="analitica_pagos:get">
      <ChartRegistryContext.Provider value={registry}>
        <div className="analisis" data-testid="analitica-pagos-page">
          <header className="analisis__toolbar">
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>
                Analítica de pagos
              </h1>
              {data?.periodo ? <p className="analisis__subtitulo">{data.periodo.nombre}</p> : null}
            </div>
            <div className="analisis__acciones">
              <div className="analisis__descarga">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setMenuDescarga((v) => !v)}
                  disabled={!data?.periodo || descargando}
                  aria-haspopup="menu"
                  aria-expanded={menuDescarga}
                  data-testid="analitica-pagos-descargar"
                >
                  <Download size={16} aria-hidden /> {descargando ? 'Generando…' : 'Descargar'}
                </button>
                {menuDescarga ? (
                  <div className="ctx-menu analisis__descarga-menu" role="menu">
                    <button type="button" className="ctx-menu__item" role="menuitem" onClick={() => descargar('pdf')} data-testid="analitica-pagos-descargar-pdf">
                      <FileText size={14} aria-hidden /> PDF
                    </button>
                    <button type="button" className="ctx-menu__item" role="menuitem" onClick={() => descargar('excel')} data-testid="analitica-pagos-descargar-excel">
                      <FileSpreadsheet size={14} aria-hidden /> Excel (.xlsx)
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          {q.isLoading ? (
            <div className="empty-state">Calculando analítica…</div>
          ) : q.isError || !data ? (
            <div className="empty-state" role="alert">
              {userMessageFromError(q.error)}
            </div>
          ) : !data.periodo ? (
            <div className="empty-state" data-testid="analitica-pagos-sin-periodo">
              No hay un periodo activo.
            </div>
          ) : (
            <Bento data={data} />
          )}
        </div>
      </ChartRegistryContext.Provider>
    </RequirePermission>
  )
}

function Bento({ data }: { data: AnaliticaPagos }) {
  const { alumnos, puntualidad: p, recaudado } = data
  const completos = data.meses.filter((m) => m.completo)
  const ant = recaudado.mes_anterior
  const act = recaudado.mes_actual

  return (
    <div className="analitica-pagos__bento">
      <section
        className={`mdash__tile ap-tile ap-tile--aldia ap-tile--${nivel(alumnos.pct_al_dia)}`}
        data-testid="analitica-pagos-al-dia"
      >
        <h2 className="mdash__tile-title">
          <Users size={14} aria-hidden /> Alumnos al día
        </h2>
        <div className="ap-hero">
          <span className="ap-hero__cifra">{alumnos.pct_al_dia}%</span>
          <div className="ap-barra" aria-hidden>
            <div className="ap-barra__fill" style={{ width: `${alumnos.pct_al_dia}%` }} />
          </div>
          <span className="ap-hero__sub">
            {alumnos.al_dia} de {alumnos.total}
          </span>
        </div>
        {data.morosos.length > 0 ? (
          <span className="mdash__chip mdash__chip--warn ap-hero__chip">{data.morosos.length} en mora</span>
        ) : null}
      </section>

      <section className="mdash__tile ap-tile ap-tile--cols" data-testid="analitica-pagos-mensual">
        <h2 className="mdash__tile-title">
          <CalendarCheck size={14} aria-hidden /> Pagado a tiempo por mes
        </h2>
        {data.meses.length > 0 ? (
          <PuntualidadMensual meses={data.meses} exportKey="ap-columnas" />
        ) : (
          <span className="texto-muted">Aún no vence ningún mes.</span>
        )}
      </section>

      <section className="mdash__tile ap-tile ap-tile--recaudo" data-testid="analitica-pagos-recaudado">
        <h2 className="mdash__tile-title">
          <Wallet size={14} aria-hidden /> Recaudado en {mesAnio(ant.anio, ant.mes).split(' ')[0]}
        </h2>
        <span className="ap-cifra">{lempiras(ant.monto)}</span>
        <span className="texto-muted">
          {mesAnio(act.anio, act.mes).split(' ')[0]}: {lempiras(act.monto)}
        </span>
      </section>

      <section className="mdash__tile ap-tile ap-tile--dona" data-testid="analitica-pagos-puntualidad">
        <h2 className="mdash__tile-title">
          <PieChart size={14} aria-hidden /> Puntualidad
        </h2>
        {p.vencidas > 0 ? (
          <>
            <DonaPuntualidad p={p} exportKey="ap-dona" />
            <ul className="analitica-pagos__leyenda">
              <li>
                <strong>{p.pct_puntual}%</strong> a tiempo
              </li>
              <li>
                <strong>{p.pct_con_mora}%</strong> con mora
              </li>
              <li>
                <strong>{p.pct_vencido_sin_pagar}%</strong> sin pagar
              </li>
            </ul>
          </>
        ) : (
          <span className="texto-muted">Nada vencido aún</span>
        )}
      </section>

      <section className="mdash__tile ap-tile ap-tile--grado" data-testid="analitica-pagos-grado">
        <h2 className="mdash__tile-title">
          <School size={14} aria-hidden /> Por grado
        </h2>
        {data.por_grado.length > 0 ? (
          <div className="ap-grado__barras">
            <BarrasGrado grupos={data.por_grado} exportKey="ap-grado" />
          </div>
        ) : (
          <span className="texto-muted">Nada vencido aún</span>
        )}
      </section>

      <section className="mdash__tile ap-tile ap-tile--meses" data-testid="analitica-pagos-completos">
        <h2 className="mdash__tile-title">
          <CheckCircle2 size={14} aria-hidden /> Meses al 100 %
        </h2>
        <span className="ap-cifra">
          {completos.length} de {data.meses.length}
        </span>
        {completos.length > 0 ? (
          <div className="analitica-pagos__chips">
            {completos.map((m) => (
              <span key={`${m.anio}-${m.mes}`} className="mdash__chip mdash__chip--ok">
                {mesAnio(m.anio, m.mes).slice(0, 3)}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <Medidores titulo="Por modalidad" icon={Layers} grupos={data.por_modalidad} prefijo="modalidad" />

      <section className="mdash__tile ap-tile ap-tile--moro" data-testid="analitica-pagos-morosos">
        <h2 className="mdash__tile-title">
          <AlertTriangle size={14} aria-hidden /> En mora ({data.morosos.length})
        </h2>
        {data.morosos.length > 0 ? (
          <div className="analitica-pagos__tabla">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Alumno</th>
                  <th>Grado</th>
                  <th>Meses</th>
                  <th>Monto</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {data.morosos.map((m) => (
                  <tr key={m.codigo} data-testid={`analitica-pagos-moroso-${m.codigo}`}>
                    <td>{m.codigo}</td>
                    <td>{m.nombre}</td>
                    <td>
                      {m.grado}
                      {m.seccion ? ` ${m.seccion}` : ''}
                    </td>
                    <td title={m.meses.join(', ')}>{m.meses_vencidos}</td>
                    <td>{lempiras(m.monto_vencido)}</td>
                    <td>
                      {m.responsable_nombre || '—'}
                      {m.responsable_telefono ? <span className="texto-muted"> · {m.responsable_telefono}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <span className="texto-muted">Nadie en mora</span>
        )}
      </section>
    </div>
  )
}

function Medidores({
  titulo,
  icon: Icon,
  grupos,
  prefijo,
}: {
  titulo: string
  icon: typeof School
  grupos: GrupoPago[]
  prefijo: 'modalidad'
}) {
  return (
    <section className={`mdash__tile ap-tile ap-tile--${prefijo}`} data-testid={`analitica-pagos-${prefijo}`}>
      <h2 className="mdash__tile-title">
        <Icon size={14} aria-hidden /> {titulo}
      </h2>
      {grupos.length > 0 ? (
        <div className="analitica-pagos__medidores-grid">
          {grupos.map((g, i) => (
            <MedidorPago
              key={g.nombre}
              nombre={g.nombre}
              pct={g.pct_pagado}
              detalle={`${g.pagadas} de ${g.vencidas}`}
              exportKey={`ap-${prefijo}-${i}`}
              testId={`analitica-pagos-medidor-${prefijo}`}
            />
          ))}
        </div>
      ) : (
        <span className="texto-muted">Nada vencido aún</span>
      )}
    </section>
  )
}
