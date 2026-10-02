import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Download, FileSpreadsheet, FileText, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { AgruparPorSelect } from '#/components/estadisticas/AgruparPorSelect'
import { AvanzadoModal } from '#/components/estadisticas/AvanzadoModal'
import { GeneralPluralContext } from '#/components/estadisticas/Bloques'
import { AnalisisContenido, contarFiltros, leerFiltros } from '#/components/estadisticas/compartido'
import { ChartRegistryContext } from '#/components/estadisticas/EChart'
import type { ChartRegistry } from '#/components/estadisticas/EChart'
import { DIMENSIONES } from '#/helpers/estadisticas-mensajes'
import { descargarAnalisisExcel, descargarAnalisisPdf } from '#/helpers/export-analisis'
import { userMessageFromError } from '#/lib/api'
import { FILTROS_VACIOS, getMisAnalisisOpciones, postMiAnalisis } from '#/services/estadisticas'
import type { Dimension, FiltrosAnalisis, OpcionesAnalisis } from '#/services/estadisticas'

/** El maestro no se compara consigo mismo: sin la dimensión «maestro». */
const MIS_DIMENSIONES: Dimension[] = DIMENSIONES.map((d) => d.id).filter((d) => d !== 'maestro')

export const Route = createFileRoute('/_app/maestro/analiticas')({
  validateSearch: (s: Record<string, unknown>) => ({
    agrupar: MIS_DIMENSIONES.includes(s.agrupar as Dimension) ? (s.agrupar as Dimension) : undefined,
    filtros: leerFiltros(s.filtros),
  }),
  component: MisAnaliticasPage,
})

const VARIAS = '__varias'

/** Una sola selección del arreglo; si el Avanzado dejó varias, se muestra «Varias». */
function unico(ids: string[]) {
  return ids.length === 1 ? ids[0] : ids.length > 1 ? VARIAS : ''
}

/** Clase, grado y sección: lo que el maestro filtra casi siempre. En cascada: grado → sección → clase. */
function FiltrosPrincipales({
  opciones,
  filtros,
  onChange,
}: {
  opciones: OpcionesAnalisis | undefined
  filtros: FiltrosAnalisis
  onChange: (f: FiltrosAnalisis) => void
}) {
  const grado = unico(filtros.grado_ids)
  const seccion = unico(filtros.seccion_ids)
  const clase = unico(filtros.asignacion_ids)
  const enGrado = (gradoId: string) => grado === '' || grado === VARIAS || gradoId === grado
  const secciones = (opciones?.secciones ?? []).filter((s) => enGrado(s.grado_id))
  const clases = (opciones?.clases ?? []).filter(
    (c) => enGrado(c.grado_id) && (seccion === '' || seccion === VARIAS || c.seccion_id === seccion),
  )

  const elegirGrado = (id: string) => {
    const secs = (opciones?.secciones ?? []).filter((s) => !id || s.grado_id === id).map((s) => s.id)
    const cls = (opciones?.clases ?? []).filter((c) => !id || c.grado_id === id).map((c) => c.id)
    onChange({
      ...filtros,
      grado_ids: id ? [id] : [],
      seccion_ids: filtros.seccion_ids.filter((s) => secs.includes(s)),
      asignacion_ids: filtros.asignacion_ids.filter((c) => cls.includes(c)),
    })
  }
  const elegirSeccion = (id: string) => {
    const cls = (opciones?.clases ?? []).filter((c) => !id || c.seccion_id === id).map((c) => c.id)
    onChange({
      ...filtros,
      seccion_ids: id ? [id] : [],
      asignacion_ids: filtros.asignacion_ids.filter((c) => cls.includes(c)),
    })
  }

  const disabled = !opciones
  return (
    <div className="analisis__principales" data-testid="mis-filtros-principales">
      <label className="field">
        <span className="field__label">Clase</span>
        <select
          className="field__select"
          value={clase}
          disabled={disabled}
          onChange={(e) => onChange({ ...filtros, asignacion_ids: e.target.value ? [e.target.value] : [] })}
          data-testid="mis-filtro-clase"
        >
          <option value="">Todas</option>
          {clase === VARIAS ? <option value={VARIAS} disabled>Varias (desde Avanzado)</option> : null}
          {clases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">Grado</span>
        <select
          className="field__select"
          value={grado}
          disabled={disabled}
          onChange={(e) => elegirGrado(e.target.value)}
          data-testid="mis-filtro-grado"
        >
          <option value="">Todos</option>
          {grado === VARIAS ? <option value={VARIAS} disabled>Varios (desde Avanzado)</option> : null}
          {(opciones?.grados ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">Sección</span>
        <select
          className="field__select"
          value={seccion}
          disabled={disabled}
          onChange={(e) => elegirSeccion(e.target.value)}
          data-testid="mis-filtro-seccion"
        >
          <option value="">Todas</option>
          {seccion === VARIAS ? <option value={VARIAS} disabled>Varias (desde Avanzado)</option> : null}
          {secciones.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function MisAnaliticasPage() {
  const { can } = useCan()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const dim: Dimension = search.agrupar ?? 'clase'
  const filtros = search.filtros ?? FILTROS_VACIOS
  const [avanzado, setAvanzado] = useState(false)
  const [aperturas, setAperturas] = useState(0)
  const [menuDescarga, setMenuDescarga] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const registry = useMemo<ChartRegistry>(() => new Map(), [])
  const permitido = can('mis_estadisticas:get')

  const opciones = useQuery({ queryKey: ['mis-analisis-opciones'], queryFn: getMisAnalisisOpciones, enabled: permitido })
  const analisis = useQuery({
    queryKey: ['mi-analisis', dim, filtros],
    queryFn: () => postMiAnalisis(dim, filtros),
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
    <RequirePermission permission="mis_estadisticas:get">
      <GeneralPluralContext.Provider value="mis clases">
        <ChartRegistryContext.Provider value={registry}>
          <div className="analisis" data-testid="mis-analiticas-page">
            <header className="analisis__toolbar">
              <div>
                <h1 className="page-title" style={{ margin: 0 }}>
                  Mis analíticas
                </h1>
                <p className="texto-muted" style={{ margin: '0.35rem 0 0' }}>
                  Solo tus clases y tus alumnos.
                </p>
              </div>
              <div className="analisis__acciones">
                <AgruparPorSelect
                  value={dim}
                  dimensiones={MIS_DIMENSIONES}
                  etiquetas={{ general: 'Todas mis clases' }}
                  ayuda={{ general: 'Todas tus clases en un solo bloque' }}
                  onChange={(d) => navigate({ search: (s) => ({ ...s, agrupar: d }) })}
                />
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

            <FiltrosPrincipales
              opciones={opciones.data}
              filtros={filtros}
              onChange={(f) => navigate({ search: (s) => ({ ...s, filtros: contarFiltros(f) ? f : undefined }) })}
            />

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
              ocultar={['maestro_ids']}
              onClose={() => setAvanzado(false)}
              onApply={(f) => {
                setAvanzado(false)
                navigate({ search: (s) => ({ ...s, filtros: contarFiltros(f) ? f : undefined }) })
              }}
            />
          ) : null}
        </ChartRegistryContext.Provider>
      </GeneralPluralContext.Provider>
    </RequirePermission>
  )
}
