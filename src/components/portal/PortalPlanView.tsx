import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { userMessageFromError } from '#/lib/api'
import type { Curso, CursoTextoItem } from '#/services/catalogos'
import type { PlanItem } from '#/services/planestudio'
import { downloadPlanClasePdf, getPlanClase } from '#/services/portal'

const TIPO_ITEM: Record<string, string> = {
  teorico: 'Teórico',
  practico: 'Práctico',
  social: 'Social',
  prueba: 'Prueba',
  examen: 'Examen',
}

const CUMPLIMIENTO: Record<string, string> = {
  pendiente: 'Pendiente',
  iniciado: 'Iniciado',
  finalizado: 'Finalizado',
}

function TextoLista({ titulo, items }: { titulo: string; items?: CursoTextoItem[] }) {
  if (!items?.length) return null
  return (
    <div className="portal-plan__bloque">
      <h3 className="portal-plan__subtitulo">{titulo}</h3>
      <ul className="portal-plan__lista">
        {items.map((it, i) => (
          <li key={it.id ?? i}>{it.texto}</li>
        ))}
      </ul>
    </div>
  )
}

function Silabo({ curso }: { curso: Curso }) {
  const horas = [
    curso.horas_teoricas_semana != null ? `${curso.horas_teoricas_semana} h teóricas/sem` : null,
    curso.horas_practicas_semana != null ? `${curso.horas_practicas_semana} h prácticas/sem` : null,
    curso.horas_totales_periodo != null ? `${curso.horas_totales_periodo} h en el periodo` : null,
    curso.unidades_academicas != null ? `${curso.unidades_academicas} UA` : null,
  ].filter(Boolean)
  const principal = (curso.bibliografia ?? []).filter((b) => b.tipo !== 'complementaria')
  const complementaria = (curso.bibliografia ?? []).filter((b) => b.tipo === 'complementaria')

  return (
    <section className="portal-plan__seccion" data-testid="portal-plan-silabo">
      <h2 className="portal-home__section-title">Pensum de la clase</h2>
      <p className="texto-muted" style={{ margin: '0 0 0.75rem' }}>
        {[curso.carrera, `${curso.horas_semana_minimas} h/semana`, ...horas].filter(Boolean).join(' · ')}
      </p>
      {curso.objetivo_general ? (
        <div className="portal-plan__bloque">
          <h3 className="portal-plan__subtitulo">Objetivo general</h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{curso.objetivo_general}</p>
        </div>
      ) : null}
      <TextoLista titulo="Prerrequisitos" items={curso.prerrequisitos} />
      <TextoLista titulo="Objetivos específicos" items={curso.objetivos_especificos} />
      <TextoLista titulo="Competencias" items={curso.competencias} />
      <TextoLista titulo="Estrategias" items={curso.estrategias} />
      <TextoLista titulo="Actividades de evaluación" items={curso.actividades_evaluacion} />
      {curso.recursos?.length ? (
        <div className="portal-plan__bloque">
          <h3 className="portal-plan__subtitulo">Recursos</h3>
          <ul className="portal-plan__lista">
            {curso.recursos.map((r, i) => (
              <li key={r.id ?? i}>{r.texto}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {[
        { titulo: 'Bibliografía', items: principal },
        { titulo: 'Bibliografía complementaria', items: complementaria },
      ].map((b) =>
        b.items.length ? (
          <div key={b.titulo} className="portal-plan__bloque">
            <h3 className="portal-plan__subtitulo">{b.titulo}</h3>
            <ul className="portal-plan__lista">
              {b.items.map((it, i) => (
                <li key={it.id ?? i}>
                  {[it.autor, it.titulo, it.editorial, it.anio].filter(Boolean).join(', ')}
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </section>
  )
}

function ItemCard({ it, n }: { it: PlanItem; n: number }) {
  const estado = CUMPLIMIENTO[it.estado_cumplimiento] ? it.estado_cumplimiento : 'pendiente'
  return (
    <article className={`neon-surface neon-surface--${estado} neon-card-row`}>
      <div className="neon-card-row__body">
        <div className="page-title-row" style={{ marginBottom: '0.35rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem' }}>
            {n}. {it.titulo}
          </h4>
          <span className="badge">{CUMPLIMIENTO[estado]}</span>
        </div>
        {it.descripcion ? (
          <p style={{ margin: '0 0 0.5rem', whiteSpace: 'pre-wrap' }}>{it.descripcion}</p>
        ) : null}
        <p className="texto-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          <strong>Tipo:</strong> {TIPO_ITEM[it.tipo_item] ?? it.tipo_item} · <strong>Puntos:</strong>{' '}
          {it.puntos ?? 0}
          <br />
          <strong>Fechas:</strong> {it.fecha_inicio.slice(0, 10) || '—'} — {it.fecha_fin.slice(0, 10) || '—'}
          {it.materiales ? (
            <>
              <br />
              <strong>Materiales:</strong> {it.materiales}
            </>
          ) : null}
        </p>
      </div>
    </article>
  )
}

/** Plan de estudio de la clase para alumno/responsable: pensum + plan activo, solo lectura. */
export function PortalPlanView({
  asignacionId,
  cursoNombre,
  alumnoId,
  sinTitulo = false,
}: {
  asignacionId: string
  cursoNombre: string
  alumnoId: string | null
  /** Oculta el título cuando la pantalla ya lo muestra (portal del padre). */
  sinTitulo?: boolean
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal-plan', asignacionId, alumnoId ?? 'self'],
    queryFn: () => getPlanClase(asignacionId, alumnoId),
  })

  const grupos = useMemo(() => {
    const items = [...(data?.plan?.items ?? [])].sort(
      (a, b) =>
        a.fecha_inicio.localeCompare(b.fecha_inicio) || (a.orden ?? 0) - (b.orden ?? 0),
    )
    const parciales = data?.parciales ?? []
    const out = parciales
      .map((p) => ({ id: p.id, nombre: p.nombre, items: items.filter((it) => it.parcial_id === p.id) }))
      .filter((g) => g.items.length > 0)
    const sueltos = items.filter((it) => !parciales.some((p) => p.id === it.parcial_id))
    if (sueltos.length) out.push({ id: 'otros', nombre: 'Otros', items: sueltos })
    return out
  }, [data])

  const plan = data?.plan

  return (
    <div data-testid="portal-plan">
      <header className="portal-home__header">
        <div>
          {!sinTitulo ? (
            <h1 className="page-title" style={{ margin: 0 }}>
              Plan de estudio · {cursoNombre}
            </h1>
          ) : null}
          {plan?.maestro_nombre ? (
            <p className="texto-muted" style={{ margin: '0.35rem 0 0' }}>
              {plan.maestro_nombre}
            </p>
          ) : null}
        </div>
        {plan ? (
          <button
            type="button"
            className="btn btn--primary"
            data-testid="portal-plan-pdf"
            onClick={() => {
              void downloadPlanClasePdf(asignacionId, cursoNombre, alumnoId).catch((e) =>
                toast.error(userMessageFromError(e)),
              )
            }}
          >
            <Download size={16} aria-hidden /> Descargar PDF
          </button>
        ) : null}
      </header>

      {isLoading ? (
        <div className="empty-state">Cargando plan…</div>
      ) : isError || !data ? (
        <div className="empty-state" data-testid="portal-plan-error">
          No se pudo cargar el plan.
          {error ? (
            <p className="texto-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              {userMessageFromError(error)}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <Silabo curso={data.curso} />

          <section className="portal-plan__seccion" data-testid="portal-plan-items">
            <h2 className="portal-home__section-title">Plan del periodo</h2>
            {!plan ? (
              <div className="empty-state" data-testid="portal-plan-vacio">
                El maestro aún no ha publicado un plan activo para esta clase.
              </div>
            ) : grupos.length === 0 ? (
              <div className="empty-state">El plan activo aún no tiene actividades.</div>
            ) : (
              grupos.map((g) => (
                <div key={g.id} className="portal-plan__parcial">
                  <h3 className="portal-plan__subtitulo">{g.nombre}</h3>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {g.items.map((it, i) => (
                      <ItemCard key={it.id} it={it} n={i + 1} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  )
}
