import { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, BoxplotChart, ScatterChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption, EChartsType } from 'echarts/core'

echarts.use([BarChart, BoxplotChart, ScatterChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer])

export interface ChartTokens {
  texto: string
  muted: string
  borde: string
  fondo: string
  acento: string
  acentoSuave: string
  success: string
  warning: string
  danger: string
}

function leerTokens(): ChartTokens {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(n).trim()
  return {
    texto: v('--sasha-texto-primary'),
    muted: v('--sasha-texto-muted'),
    borde: v('--sasha-border-fuerte'),
    fondo: v('--sasha-bg-raised'),
    acento: v('--sasha-accent'),
    acentoSuave: v('--sasha-accent-muted'),
    success: v('--sasha-success'),
    warning: v('--sasha-warning'),
    danger: v('--sasha-danger'),
  }
}

/** Colores de los tokens `--sasha-*`; se recalculan al cambiar de tema. */
export function useChartTokens(): ChartTokens | null {
  const [tokens, setTokens] = useState<ChartTokens | null>(null)
  useEffect(() => {
    setTokens(leerTokens())
    const obs = new MutationObserver(() => setTokens(leerTokens()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return tokens
}

export interface EChartHandle {
  /** PNG con fondo del tema, para el PDF. */
  toDataURL: () => string | null
}

/** Gráficas visibles por clave de exportación; el PDF toma de aquí las imágenes. */
export type ChartRegistry = Map<string, EChartHandle>
export const ChartRegistryContext = createContext<ChartRegistry | null>(null)

export const EChart = forwardRef<
  EChartHandle,
  { option: EChartsCoreOption; height: number; testId?: string; exportKey?: string }
>(function EChart({ option, height, testId, exportKey }, ref) {
    const divRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<EChartsType | null>(null)
    const registry = useContext(ChartRegistryContext)

    const handle: EChartHandle = {
      toDataURL: () =>
        chartRef.current?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: leerTokens().fondo }) ?? null,
    }
    useImperativeHandle(ref, () => handle)

    useEffect(() => {
      if (!divRef.current) return
      const chart = echarts.init(divRef.current, undefined, { renderer: 'canvas' })
      chartRef.current = chart
      const ro = new ResizeObserver(() => chart.resize())
      ro.observe(divRef.current)
      return () => {
        ro.disconnect()
        chart.dispose()
        chartRef.current = null
      }
    }, [])

    useEffect(() => {
      if (!registry || !exportKey) return
      registry.set(exportKey, handle)
      return () => {
        registry.delete(exportKey)
      }
    }, [registry, exportKey])

    useEffect(() => {
      chartRef.current?.setOption(option, true)
    }, [option])

    return <div ref={divRef} style={{ width: '100%', height }} data-testid={testId} />
})
