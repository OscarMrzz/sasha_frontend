import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CalendarCheck, ClipboardList, Download, FileSpreadsheet, FileText, GraduationCap, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { AgruparPorSelect } from '#/components/estadisticas/AgruparPorSelect'
import { AvanzadoModal } from '#/components/estadisticas/AvanzadoModal'
import { BloquePrincipal, MiniTipoCard, SeccionSobria } from '#/components/estadisticas/Bloques'
import { ChartRegistryContext } from '#/components/estadisticas/EChart'
import type { ChartRegistry } from '#/components/estadisticas/EChart'
import { DIMENSIONES } from '#/helpers/estadisticas-mensajes'
import { descargarAnalisisExcel, descargarAnalisisPdf } from '#/helpers/export-analisis'
import { userMessageFromError } from '#/lib/api'
import { FILTROS_VACIOS, getAnalisisOpciones, postAnalisis } from '#/services/estadisticas'
import type { Dimension, FiltrosAnalisis } from '#/services/estadisticas'

const DIM_IDS = DIMENSIONES.map((d) => d.id)

function listaIds(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function leerFiltros(v: unknown): FiltrosAnalisis | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  return {
    periodo_ids: listaIds(o.periodo_ids),
    parcial_ids: listaIds(o.parcial_ids),
    grado_ids: listaIds(o.grado_ids),
    seccion_ids: listaIds(o.seccion_ids),
    modalidad_ids: listaIds(o.modalidad_ids),
    curso_ids: listaIds(o.curso_ids),
    maestro_ids: listaIds(o.maestro_ids),
    alumno_ids: listaIds(o.alumno_ids),
    tipo_tarea_ids: listaIds(o.tipo_tarea_ids),
    meses: Array.isArray(o.meses) ? o.meses.filter((m): m is number => typeof m === 'number') : [],
    solo_liberadas: o.solo_liberadas === true,
  }
}

export const Route = createFileRoute('/_app/estadisticas')({
  validateSearch: (s: Record<string, unknown>) => ({
    agrupar: DIM_IDS.includes(s.agrupar as Dimension) ? (s.agrupar as Dimension) : undefined,
    filtros: leerFiltros(s.filtros),
  }),
  component: EstadisticasPage,
})

function contarFiltros(f: FiltrosAnalisis) {
  const listas = [
    f.periodo_ids,
    f.parcial_ids,
    f.grado_ids,
    f.seccion_ids,
    f.modalidad_ids,
    f.curso_ids,
    f.maestro_ids,
    f.alumno_ids,
    f.tipo_tarea_ids,
    f.meses,
  ]
  return listas.filter((l) => l.length > 0).length + (f.solo_liberadas ? 1 : 0)
}

function SeccionTitulo({ icon: Icon, titulo }: { icon: typeof GraduationCap; titulo: string }) {
  return (
    <header className="analisis__seccion-head">
      <h2 className="analisis__seccion-titulo">
        <Icon size={18} aria-hidden /> {titulo}
      </h2>
    </header>
  )
}

function Aviso({ children, testId }: { children: string; testId?: string }) {
  return (
    <div className="mdash__tile analisis-bento__aviso" data-testid={testId}>
      {children}
    </div>
  )
}

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

  const gen = data?.calificaciones?.general ?? null
  const porTipo = data?.calificaciones?.por_tipo ?? []

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
              <AgruparPorSelect value={dim} onChange={(d) => navigate({ search: (s) => ({ ...s, agrupar: d }) })} />
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
            <div className={analisis.isFetching ? 'analisis__contenido analisis__contenido--cargando' : 'analisis__contenido'}>
              <section className="analisis__seccion" data-testid="analisis-calificaciones">
                <SeccionTitulo icon={GraduationCap} titulo="Calificaciones" />
                {dim === 'mes' ? (
                  <Aviso testId="analisis-calificaciones-aviso">No aplica por mes.</Aviso>
                ) : gen ? (
                  <>
                    <BloquePrincipal bloque={gen} dim={dim} prefijo="analisis-general" />
                    {porTipo.length > 0 ? (
                      <>
                        <h3 className="analisis__sub">Por tipo de tarea</h3>
                        <div className="analisis-bento__minis" data-testid="analisis-minis">
                          {porTipo.map((bt) => (
                            <MiniTipoCard key={bt.tipo_codigo} bt={bt} dim={dim} />
                          ))}
                        </div>
                      </>
                    ) : null}
                  </>
                ) : (
                  <Aviso testId="analisis-calificaciones-vacio">No hay calificaciones con los filtros actuales.</Aviso>
                )}
              </section>

              <section className="analisis__seccion analisis__seccion--sobria" data-testid="analisis-asistencia">
                <SeccionTitulo icon={CalendarCheck} titulo="Asistencia" />
                {data.asistencia ? (
                  <SeccionSobria bloque={data.asistencia} prefijo="analisis-asistencia" titulo="Asistencia promedio" />
                ) : (
                  <Aviso>No hay registros de asistencia con los filtros actuales.</Aviso>
                )}
              </section>

              <section className="analisis__seccion analisis__seccion--sobria" data-testid="analisis-cumplimiento">
                <SeccionTitulo icon={ClipboardList} titulo="Cumplimiento del plan" />
                {dim === 'alumno' || dim === 'mes' ? (
                  <Aviso testId="analisis-cumplimiento-aviso">{dim === 'alumno' ? 'No aplica por alumno.' : 'No aplica por mes.'}</Aviso>
                ) : data.cumplimiento ? (
                  <SeccionSobria bloque={data.cumplimiento} prefijo="analisis-cumplimiento" titulo="Cumplimiento promedio" />
                ) : (
                  <Aviso>No hay planes activos con los filtros actuales.</Aviso>
                )}
              </section>
            </div>
          )}
        </div>

        {opciones.data ? (
          <AvanzadoModal
            key={aperturas}
            open={avanzado}
            opciones={opciones.data}
            filtros={filtros}
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
