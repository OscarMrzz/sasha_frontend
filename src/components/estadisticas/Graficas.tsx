import { useMemo, useState } from 'react'
import { EChart, useChartTokens } from './EChart'
import type { ChartTokens } from './EChart'
import { SearchInput } from '#/components/ui/SearchInput'
import type { Distribucion, Grupo } from '#/services/estadisticas'

function tooltipBase(t: ChartTokens) {
  return {
    backgroundColor: t.fondo,
    borderColor: t.borde,
    textStyle: { color: t.texto, fontFamily: 'Montserrat, sans-serif', fontSize: 12 },
  }
}

function ejeValor(t: ChartTokens, nombre?: string) {
  return {
    type: 'value' as const,
    min: 0,
    max: 100,
    name: nombre,
    nameTextStyle: { color: t.muted },
    axisLabel: { color: t.muted },
    splitLine: { lineStyle: { color: t.borde, opacity: 0.5 } },
  }
}

/** Eje ajustado a los datos (con margen, múltiplos de 5, dentro de 0–100) para que la caja no quede aplastada. */
function rangoCaja(dist: Distribucion): { min: number; max: number } {
  const margen = Math.max(2, (dist.max - dist.min) * 0.1)
  let min = Math.max(0, Math.floor((dist.min - margen) / 5) * 5)
  let max = Math.min(100, Math.ceil((dist.max + margen) / 5) * 5)
  if (max - min < 10) {
    min = Math.max(0, min - 5)
    max = Math.min(100, max + 5)
  }
  return { min, max }
}

/** Una sola caja y bigotes con los valores del ranking (un punto por grupo). */
export function CajaBigotes({
  dist,
  etiqueta,
  height = 260,
  compacto = false,
  exportKey,
  testId,
}: {
  dist: Distribucion
  etiqueta: string
  height?: number
  compacto?: boolean
  exportKey?: string
  testId?: string
}) {
  const t = useChartTokens()
  const option = useMemo(() => {
    if (!t) return null
    return {
      animationDuration: 500,
      grid: compacto
        ? { left: 8, right: 8, top: 8, bottom: 8, containLabel: false }
        : { left: 16, right: 24, top: 36, bottom: 40, containLabel: false },
      tooltip: {
        ...tooltipBase(t),
        trigger: 'item',
        formatter: (p: { seriesType: string; value: number[] }) => {
          if (p.seriesType === 'scatter') return `Atípico: ${p.value[0]}`
          return [
            `<b>${etiqueta}</b> (${dist.n})`,
            `Promedio: ${dist.media}`,
            `Mediana: ${dist.mediana}`,
            `Mínimo: ${dist.min}`,
            `Máximo: ${dist.max}`,
          ].join('<br/>')
        },
      },
      xAxis: { ...ejeValor(t), ...rangoCaja(dist), show: !compacto },
      yAxis: { type: 'category', data: [`${etiqueta} (${dist.n})`], show: false },
      series: [
        {
          type: 'boxplot',
          data: [
            {
              value: [dist.bigote_inf, dist.q1, dist.mediana, dist.q3, dist.bigote_sup],
              itemStyle: { color: t.acentoSuave, borderColor: t.acento, borderWidth: compacto ? 1.2 : 1.6 },
            },
          ],
          boxWidth: ['30%', '45%'],
          markLine: compacto
            ? undefined
            : {
                silent: true,
                symbol: 'none',
                label: { color: t.muted, formatter: `Promedio ${dist.media}`, position: 'end' },
                lineStyle: { color: t.muted, type: 'dashed' },
                data: [{ xAxis: dist.media }],
              },
        },
        {
          type: 'scatter',
          symbolSize: compacto ? 4 : 9,
          itemStyle: { color: t.warning, opacity: 0.9 },
          data: dist.atipicos.map((v) => [v, 0]),
        },
      ],
    }
  }, [t, dist, compacto, etiqueta])
  if (!option) return <div style={{ height }} />
  return (
    <div className="analisis-caja">
      <EChart option={option} height={height} exportKey={exportKey} testId={testId} />
      {compacto ? null : (
        <dl className="analisis-bento__cifras">
          <div>
            <dt>Promedio</dt>
            <dd>{dist.media}</dd>
          </div>
          <div>
            <dt>Mediana</dt>
            <dd>{dist.mediana}</dd>
          </div>
          <div>
            <dt>Mínimo</dt>
            <dd>{dist.min}</dd>
          </div>
          <div>
            <dt>Máximo</dt>
            <dd>{dist.max}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

export type Paginar = { modo: 'puestos'; porPagina: number } | { modo: 'filas'; porPagina: number }

/** Ranking denso de mayor a menor: valores iguales comparten puesto y el siguiente valor toma el número siguiente. */
export function conPuesto(grupos: Grupo[]): { grupo: Grupo; puesto: number; fila: number }[] {
  const orden = [...grupos].sort((a, b) => b.valor - a.valor)
  let puesto = 0
  let anterior: number | null = null
  return orden.map((g, i) => {
    if (g.valor !== anterior) {
      puesto++
      anterior = g.valor
    }
    return { grupo: g, puesto, fila: i + 1 }
  })
}

/**
 * Barras horizontales 0–100 con el nombre de cada grupo, paginadas.
 * En modo `puestos` cada página abarca `porPagina` puestos y muestra a todos los empatados en ellos;
 * en modo `filas`, `porPagina` filas.
 */
export function BarrasHorizontales({
  grupos,
  unidad = '',
  paginar,
  testId,
}: {
  grupos: Grupo[]
  unidad?: string
  paginar: Paginar
  testId?: string
}) {
  const [q, setQ] = useState('')
  const [pag, setPag] = useState({ de: grupos, n: 1 })
  const pagina = pag.de === grupos ? pag.n : 1
  const irA = (n: number) => setPag({ de: grupos, n })

  const filas = useMemo(() => conPuesto(grupos), [grupos])
  const ultimoPuesto = filas.length ? filas[filas.length - 1].puesto : 0
  const total = paginar.modo === 'puestos' ? ultimoPuesto : filas.length
  const paginas = Math.max(1, Math.ceil(total / paginar.porPagina))
  const desde = (pagina - 1) * paginar.porPagina + 1
  const hasta = Math.min(pagina * paginar.porPagina, total)

  const busqueda = q.trim().toLowerCase()
  const visibles = busqueda
    ? filas.filter((f) => f.grupo.nombre.toLowerCase().includes(busqueda))
    : paginar.modo === 'puestos'
      ? filas.filter((f) => f.puesto >= desde && f.puesto <= hasta)
      : filas.slice(desde - 1, hasta)
  const conBuscador = paginas > 1 || busqueda !== ''

  const fila = ({ grupo: g, puesto, fila: n }: { grupo: Grupo; puesto: number; fila: number }) => (
    <li key={g.id} className="analisis-bento__barra-fila" data-testid={testId ? `${testId}-fila` : undefined}>
      {paginar.modo === 'puestos' ? (
        <span className="analisis-bento__barra-puesto" data-testid={testId ? `${testId}-puesto` : undefined}>
          {puesto}
        </span>
      ) : (
        <span className="analisis-bento__barra-num">{n}.</span>
      )}
      <span className="analisis-bento__barra-nombre" title={g.nombre}>
        {g.nombre}
      </span>
      <div className="analisis-bento__barra">
        <div
          className={`analisis-bento__barra-fill analisis-bento__barra-fill--${g.nivel}`}
          style={{ width: `${Math.max(0, Math.min(100, g.valor))}%` }}
        />
      </div>
      <span className="analisis-bento__barra-valor">
        {g.valor}
        {unidad}
      </span>
    </li>
  )

  return (
    <div className="analisis-bento__barras" data-testid={testId}>
      {conBuscador ? (
        <SearchInput
          className="analisis-bento__buscar"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar en la lista"
        />
      ) : null}
      <ul className="analisis-bento__barra-lista">{visibles.map(fila)}</ul>
      {!busqueda && paginas > 1 ? (
        <div className="analisis-bento__pager">
          <span className="analisis-bento__pager-texto" data-testid={testId ? `${testId}-pagina` : undefined}>
            {paginar.modo === 'puestos' ? 'Puestos' : 'Filas'} {desde}–{hasta} · página {pagina} de {paginas}
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={pagina <= 1}
            onClick={() => irA(pagina - 1)}
            data-testid={testId ? `${testId}-pagina-ant` : undefined}
          >
            Anterior
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={pagina >= paginas}
            onClick={() => irA(pagina + 1)}
            data-testid={testId ? `${testId}-pagina-sig` : undefined}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  )
}
