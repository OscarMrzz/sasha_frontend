import type { Curso, CursoTextoItem } from '#/services/catalogos'

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

/** Sílabo completo del curso (pensum), solo lectura. */
export function PensumCurso({
  curso,
  testId,
  sinTitulo = false,
}: {
  curso: Curso
  testId?: string
  sinTitulo?: boolean
}) {
  const horas = [
    curso.horas_teoricas_semana != null ? `${curso.horas_teoricas_semana} h teóricas/sem` : null,
    curso.horas_practicas_semana != null ? `${curso.horas_practicas_semana} h prácticas/sem` : null,
    curso.horas_totales_periodo != null ? `${curso.horas_totales_periodo} h en el periodo` : null,
    curso.unidades_academicas != null ? `${curso.unidades_academicas} UA` : null,
  ].filter(Boolean)
  const principal = (curso.bibliografia ?? []).filter((b) => b.tipo !== 'complementaria')
  const complementaria = (curso.bibliografia ?? []).filter((b) => b.tipo === 'complementaria')

  return (
    <section className="portal-plan__seccion" data-testid={testId}>
      {!sinTitulo ? <h2 className="portal-home__section-title">Pensum de la clase</h2> : null}
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
