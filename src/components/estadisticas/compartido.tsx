import { CalendarCheck, ClipboardList, GraduationCap } from 'lucide-react'
import { BloquePrincipal, MiniTipoCard, SeccionSobria } from '#/components/estadisticas/Bloques'
import type { AnalisisResponse, Dimension, FiltrosAnalisis } from '#/services/estadisticas'

function listaIds(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/** Filtros desde los search params de la URL. */
export function leerFiltros(v: unknown): FiltrosAnalisis | undefined {
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
    asignacion_ids: listaIds(o.asignacion_ids),
    meses: Array.isArray(o.meses) ? o.meses.filter((m): m is number => typeof m === 'number') : [],
    solo_liberadas: o.solo_liberadas === true,
  }
}

export function contarFiltros(f: FiltrosAnalisis) {
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
    f.asignacion_ids,
    f.meses,
  ]
  return listas.filter((l) => l.length > 0).length + (f.solo_liberadas ? 1 : 0)
}

export function SeccionTitulo({ icon: Icon, titulo }: { icon: typeof GraduationCap; titulo: string }) {
  return (
    <header className="analisis__seccion-head">
      <h2 className="analisis__seccion-titulo">
        <Icon size={18} aria-hidden /> {titulo}
      </h2>
    </header>
  )
}

export function Aviso({ children, testId }: { children: string; testId?: string }) {
  return (
    <div className="mdash__tile analisis-bento__aviso" data-testid={testId}>
      {children}
    </div>
  )
}

/** Secciones de calificaciones, asistencia y cumplimiento del plan. */
export function AnalisisContenido({ data, dim, cargando }: { data: AnalisisResponse; dim: Dimension; cargando: boolean }) {
  const gen = data.calificaciones?.general ?? null
  const porTipo = data.calificaciones?.por_tipo ?? []
  return (
    <div className={cargando ? 'analisis__contenido analisis__contenido--cargando' : 'analisis__contenido'}>
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
  )
}
