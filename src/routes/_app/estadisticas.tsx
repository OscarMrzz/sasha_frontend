import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Download, FileSpreadsheet, FileText, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { AgruparPorSelect } from '#/components/estadisticas/AgruparPorSelect'
import { AvanzadoModal } from '#/components/estadisticas/AvanzadoModal'
import { AnalisisContenido, contarFiltros, leerFiltros } from '#/components/estadisticas/compartido'
import { ChartRegistryContext } from '#/components/estadisticas/EChart'
import type { ChartRegistry } from '#/components/estadisticas/EChart'
import { DIMENSIONES } from '#/helpers/estadisticas-mensajes'
import { descargarAnalisisExcel, descargarAnalisisPdf } from '#/helpers/export-analisis'
import { userMessageFromError } from '#/lib/api'
import { FILTROS_VACIOS, getAnalisisOpciones, postAnalisis } from '#/services/estadisticas'
import type { Dimension } from '#/services/estadisticas'

/** «Clase» es solo de las analíticas del maestro. */
const DIM_IDS: Dimension[] = DIMENSIONES.map((d) => d.id).filter((d) => d !== 'clase')

export const Route = createFileRoute('/_app/estadisticas')({
  validateSearch: (s: Record<string, unknown>) => ({
    agrupar: DIM_IDS.includes(s.agrupar as Dimension) ? (s.agrupar as Dimension) : undefined,
    filtros: leerFiltros(s.filtros),
  }),
  component: EstadisticasPage,
})

function EstadisticasPage() {
  const { can } = useCan()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const dim: Dimension = search.agrupar ?? 'maestro'
  const filtros = search.filtros ?? FILTROS_VACIOS
  const [avanzado, setAvanzado] = useState(false)
  const [aperturas, setAperturas] = useState(0)
  const [menuDescarga, setMenuDescarga] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const registry = useMemo<ChartRegistry>(() => new Map(), [])
  const permitido = can('estadisticas:get')

  const opciones = useQuery({ queryKey: ['analisis-opciones'], queryFn: getAnalisisOpciones, enabled: permitido })
  const analisis = useQuery({
    queryKey: ['analisis', dim, filtros],
    queryFn: () => postAnalisis(dim, filtros),
    enabled: permitido,
    placeholderData: keepPreviousData,
  })
  const data = analisis.data
  const nFiltros = contarFiltros(filtros)

  const descargar = async (tipo: 'pdf' | 'excel') => {
    if (!data) return
    setMenuDescarga(false)
    setDescargando(true)
    try {
      if (tipo === 'pdf') await descargarAnalisisPdf(data, registry)
      else await descargarAnalisisExcel(data)
    } catch (e) {
      toast.error(userMessageFromError(e))
    } finally {
      setDescargando(false)
    }
  }

  return (
    <RequirePermission permission="estadisticas:get">
      <ChartRegistryContext.Provider value={registry}>
        <div className="analisis" data-testid="analisis-page">
          <header className="analisis__toolbar">
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>
                Estadísticas
              </h1>
            </div>
            <div className="analisis__acciones">
              <AgruparPorSelect value={dim} dimensiones={DIM_IDS} onChange={(d) => navigate({ search: (s) => ({ ...s, agrupar: d }) })} />
              <button
                type="button"
                className="btn btn--ghost analisis__btn-avanzado"
                onClick={() => {
                  setAperturas((n) => n + 1)
                  setAvanzado(true)
                }}
                disabled={!opciones.data}
                data-testid="analisis-avanzado"
              >
                <SlidersHorizontal size={16} aria-hidden /> Avanzado
                {nFiltros > 0 ? <span className="analisis__badge">{nFiltros}</span> : null}
              </button>
              <div className="analisis__descarga">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setMenuDescarga((v) => !v)}
                  disabled={!data || descargando}
                  aria-haspopup="menu"
                  aria-expanded={menuDescarga}
                  data-testid="analisis-descargar"
                >
                  <Download size={16} aria-hidden /> {descargando ? 'Generando…' : 'Descargar'}
                </button>
                {menuDescarga ? (
                  <div className="ctx-menu analisis__descarga-menu" role="menu">
                    <button type="button" className="ctx-menu__item" role="menuitem" onClick={() => descargar('pdf')} data-testid="analisis-descargar-pdf">
                      <FileText size={14} aria-hidden /> PDF
                    </button>
                    <button type="button" className="ctx-menu__item" role="menuitem" onClick={() => descargar('excel')} data-testid="analisis-descargar-excel">
                      <FileSpreadsheet size={14} aria-hidden /> Excel (.xlsx)
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          {analisis.isLoading ? (
            <div className="empty-state">Calculando análisis…</div>
          ) : analisis.isError || !data ? (
            <div className="empty-state" role="alert">
              {userMessageFromError(analisis.error)}
            </div>
          ) : (
            <AnalisisContenido data={data} dim={dim} cargando={analisis.isFetching} />
          )}
        </div>

        {opciones.data ? (
          <AvanzadoModal
            key={aperturas}
            open={avanzado}
            opciones={opciones.data}
            filtros={filtros}
            ocultar={['asignacion_ids']}
            onClose={() => setAvanzado(false)}
            onApply={(f) => {
              setAvanzado(false)
              navigate({ search: (s) => ({ ...s, filtros: contarFiltros(f) ? f : undefined }) })
            }}
          />
        ) : null}
      </ChartRegistryContext.Provider>
    </RequirePermission>
  )
}
