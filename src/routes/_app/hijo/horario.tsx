import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'
import { usePortalInicio } from '#/hooks/use-portal'

export const Route = createFileRoute('/_app/hijo/horario')({
  component: () => (
    <PadreScreen title="Horario" testId="padre-horario">
      {() => <HorarioHijo />}
    </PadreScreen>
  ),
})

const DIAS = [
  { n: 1, corto: 'Lun', largo: 'Lunes' },
  { n: 2, corto: 'Mar', largo: 'Martes' },
  { n: 3, corto: 'Mié', largo: 'Miércoles' },
  { n: 4, corto: 'Jue', largo: 'Jueves' },
  { n: 5, corto: 'Vie', largo: 'Viernes' },
]

function diaInicial() {
  const d = new Date().getDay()
  return d >= 1 && d <= 5 ? d : 1
}

type Bloque = { key: string; inicio: string; fin: string; titulo: string; sub: string; recreo?: boolean }

function HorarioHijo() {
  const { data, isLoading, isError } = usePortalInicio()
  const [dia, setDia] = useState(diaInicial)

  const bloques = useMemo<Bloque[]>(() => {
    const out: Bloque[] = (data?.horario_semana ?? [])
      .filter((s) => s.dia_semana === dia)
      .map((s) => ({
        key: `${s.asignacion_docente_id}-${s.hora_inicio}`,
        inicio: s.hora_inicio,
        fin: s.hora_fin,
        titulo: s.curso_nombre,
        sub: s.maestro_nombre,
      }))
    if (out.length && data?.recreo) {
      out.push({
        key: 'recreo',
        inicio: data.recreo.hora_inicio,
        fin: data.recreo.hora_fin,
        titulo: 'Recreo',
        sub: '',
        recreo: true,
      })
    }
    return out.sort((a, b) => a.inicio.localeCompare(b.inicio))
  }, [data, dia])

  if (isLoading) return <div className="empty-state">Cargando horario…</div>
  if (isError || !data) return <div className="empty-state">Hay problemas de conexión. Intente de nuevo.</div>

  const nombreDia = DIAS.find((d) => d.n === dia)?.largo

  return (
    <>
      <div className="dias-tabs" role="tablist" aria-label="Día de la semana">
        {DIAS.map((d) => (
          <button
            key={d.n}
            type="button"
            role="tab"
            aria-selected={d.n === dia}
            className={`dias-tabs__tab${d.n === dia ? ' dias-tabs__tab--activo' : ''}`}
            data-testid={`padre-horario-dia-${d.n}`}
            onClick={() => setDia(d.n)}
          >
            {d.corto}
          </button>
        ))}
      </div>
      <section className="app-seccion" data-testid="padre-horario-lista">
        <h2 className="app-seccion__titulo">{nombreDia}</h2>
        {bloques.length === 0 ? (
          <div className="empty-state">No hay clases este día.</div>
        ) : (
          <ul className="app-list">
            {bloques.map((b) => (
              <li
                key={b.key}
                className="app-list__item"
                style={b.recreo ? { background: 'var(--sasha-bg-muted)' } : undefined}
              >
                <span className="bloque-hora">{b.inicio}</span>
                <div className="app-list__cuerpo">
                  <span className="app-list__titulo">{b.titulo}</span>
                  <span className="app-list__sub">
                    {b.inicio} a {b.fin}
                    {b.sub ? ` · ${b.sub}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
