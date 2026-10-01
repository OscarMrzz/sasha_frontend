import { useMemo } from 'react'
import { EChart, useChartTokens } from '#/components/estadisticas/EChart'
import type { ChartTokens } from '#/components/estadisticas/EChart'
import { mesAnio } from '#/lib/fechas-padre'
import type { AnaliticaPagos, GrupoPago, MesAnalitica } from '#/services/pagos'

/** Verde desde 90 %, amarillo desde 70 %, rojo por debajo. */
export function colorPct(t: ChartTokens, pct: number) {
  if (pct >= 90) return t.success
  if (pct >= 70) return t.warning
  return t.danger
}

function tooltipBase(t: ChartTokens) {
  return {
    backgroundColor: t.fondo,
    borderColor: t.borde,
    textStyle: { color: t.texto, fontFamily: 'Montserrat, sans-serif', fontSize: 12 },
  }
}

/** Medidor circular (termómetro) con el porcentaje pagado de un grupo. */
export function MedidorPago({
  nombre,
  pct,
  detalle,
  exportKey,
  testId,
}: {
  nombre: string
  pct: number
  detalle: string
  exportKey?: string
  testId?: string
}) {
  const t = useChartTokens()
  const option = useMemo(() => {
    if (!t) return null
    const color = colorPct(t, pct)
    return {
      animationDuration: 600,
      series: [
        {
          type: 'gauge',
          startAngle: 220,
          endAngle: -40,
          min: 0,
          max: 100,
          radius: '92%',
          center: ['50%', '56%'],
          progress: { show: true, width: 12, roundCap: true, itemStyle: { color } },
          axisLine: { roundCap: true, lineStyle: { width: 12, color: [[1, t.borde]] } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          pointer: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '0%'],
            formatter: '{value}%',
            color: t.texto,
            fontSize: 24,
            fontWeight: 700,
            fontFamily: 'Montserrat, sans-serif',
          },
          data: [{ value: pct, name: nombre }],
        },
      ],
    }
  }, [t, pct, nombre])
  return (
    <figure className="analitica-pagos__medidor" data-testid={testId}>
      {option ? <EChart option={option} height={150} exportKey={exportKey} /> : <div style={{ height: 150 }} />}
      <figcaption>
        <strong className="analitica-pagos__medidor-nombre">{nombre}</strong>
        <span className="texto-muted">{detalle}</span>
      </figcaption>
    </figure>
  )
}

/** Barras horizontales (termómetro) con el porcentaje pagado de cada grado. */
export function BarrasGrado({ grupos, exportKey }: { grupos: GrupoPago[]; exportKey?: string }) {
  const t = useChartTokens()
  const alto = Math.max(120, grupos.length * 44 + 16)
  const option = useMemo(() => {
    if (!t) return null
    const orden = [...grupos].reverse()
    return {
      animationDuration: 500,
      grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        ...tooltipBase(t),
        trigger: 'axis',
        axisPointer: { type: 'none' },
        formatter: (ps: { dataIndex: number }[]) => {
          const g = orden[ps[0].dataIndex] as GrupoPago | undefined
          return g ? `<b>${g.nombre}</b><br/>${g.pct_pagado}% · ${g.pagadas} de ${g.vencidas} mensualidades` : ''
        },
      },
      xAxis: { type: 'value', min: 0, max: 100, show: false },
      yAxis: [
        {
          type: 'category',
          data: orden.map((g) => g.nombre),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: t.texto, fontSize: 12, fontFamily: 'Montserrat, sans-serif' },
        },
        {
          type: 'category',
          position: 'right',
          data: orden.map((g) => `${g.pct_pagado}%  ·  ${g.pagadas}/${g.vencidas}`),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: t.muted, fontSize: 11, fontWeight: 600, fontFamily: 'Montserrat, sans-serif' },
        },
      ],
      series: [
        {
          type: 'bar',
          barWidth: 14,
          showBackground: true,
          backgroundStyle: { color: t.borde, borderRadius: 7 },
          data: orden.map((g) => ({
            value: g.pct_pagado,
            itemStyle: { color: colorPct(t, g.pct_pagado), borderRadius: 7 },
          })),
        },
      ],
    }
  }, [t, grupos])
  if (!option) return <div style={{ height: alto }} />
  return <EChart option={option} height={alto} exportKey={exportKey} testId="analitica-pagos-barras-grado" />
}

/** Columnas mes a mes con el porcentaje pagado a tiempo; la línea marca el 100 %. */
export function PuntualidadMensual({ meses, exportKey }: { meses: MesAnalitica[]; exportKey?: string }) {
  const t = useChartTokens()
  const option = useMemo(() => {
    if (!t) return null
    return {
      animationDuration: 500,
      grid: { left: 40, right: 16, top: 24, bottom: 32 },
      tooltip: {
        ...tooltipBase(t),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (ps: { dataIndex: number }[]) => {
          const m = meses[ps[0].dataIndex] as MesAnalitica | undefined
          if (!m) return ''
          return [
            `<b>${mesAnio(m.anio, m.mes)}</b>`,
            `A tiempo: ${m.pct_puntual}% (${m.puntuales} de ${m.total})`,
            `Pagado hoy (con mora incluida): ${m.pct_pagado}%`,
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        data: meses.map((m) => mesAnio(m.anio, m.mes).slice(0, 3)),
        axisLabel: { color: t.muted },
        axisLine: { lineStyle: { color: t.borde } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: t.muted, formatter: '{value}%' },
        splitLine: { lineStyle: { color: t.borde, opacity: 0.5 } },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 42,
          data: meses.map((m) => ({
            value: m.pct_puntual,
            itemStyle: { color: colorPct(t, m.pct_puntual), borderRadius: [6, 6, 0, 0] },
          })),
          label: { show: true, position: 'top', color: t.texto, formatter: '{c}%', fontSize: 11 },
          markLine: {
            silent: true,
            symbol: 'none',
            label: { show: false },
            lineStyle: { color: t.muted, type: 'dashed' },
            data: [{ yAxis: 100 }],
          },
        },
      ],
    }
  }, [t, meses])
  if (!option) return <div style={{ height: 300 }} />
  return <EChart option={option} height={300} exportKey={exportKey} testId="analitica-pagos-columnas" />
}

/** Dona de las mensualidades vencidas: a tiempo, con mora y sin pagar. */
export function DonaPuntualidad({ p, exportKey }: { p: AnaliticaPagos['puntualidad']; exportKey?: string }) {
  const t = useChartTokens()
  const option = useMemo(() => {
    if (!t) return null
    return {
      animationDuration: 500,
      tooltip: { ...tooltipBase(t), trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: t.muted, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
      series: [
        {
          type: 'pie',
          radius: ['52%', '78%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          label: { show: false },
          itemStyle: { borderColor: t.fondo, borderWidth: 2 },
          data: [
            { name: 'A tiempo', value: p.puntual, itemStyle: { color: t.success } },
            { name: 'Con mora', value: p.con_mora, itemStyle: { color: t.warning } },
            { name: 'Sin pagar', value: p.vencido_sin_pagar, itemStyle: { color: t.danger } },
          ],
        },
      ],
    }
  }, [t, p])
  if (!option) return <div style={{ height: 200 }} />
  return <EChart option={option} height={200} exportKey={exportKey} testId="analitica-pagos-dona" />
}
