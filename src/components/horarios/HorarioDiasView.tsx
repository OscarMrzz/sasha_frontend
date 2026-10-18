import { useMemo, useState } from 'react'
import { RowMenu } from '#/components/ui/RowMenu'
import type { RowAction } from '#/components/ui/RowMenu'

/** Bloque de un día del horario, ya normalizado (sirve al padre, al alumno y al maestro). */
export type BloqueDia = {
  key: string
  dia: number
  inicio: string
  fin: string
  titulo: string
  sub?: string
  recreo?: boolean
}

const DIAS = [
  { n: 1, corto: 'Lun', largo: 'Lunes' },
  { n: 2, corto: 'Mar', largo: 'Martes' },
  { n: 3, corto: 'Mié', largo: 'Miércoles' },
  { n: 4, corto: 'Jue', largo: 'Jueves' },
  { n: 5, corto: 'Vie', largo: 'Viernes' },
  { n: 6, corto: 'Sáb', largo: 'Sábado' },
  { n: 7, corto: 'Dom', largo: 'Domingo' },
]

function diaInicial() {
  const d = new Date().getDay()
  return d >= 1 && d <= 5 ? d : 1
}

/**
 * Horario en **vista por días** (pestañas + lista): la que usa el padre para ver
 * el horario del hijo. En móvil la usan también el alumno y el maestro.
 *
 * `testIdPrefix` arma los `data-testid`: `<prefix>-dia-<n>` para las pestañas y
 * `<prefix>-lista` para la sección.
 */
export function HorarioDiasView({
  bloques,
  recreo,
  testIdPrefix,
  ariaLabel = 'Día de la semana',
  emptyText = 'No hay clases este día.',
  actionsFor,
}: {
  bloques: BloqueDia[]
  /** Recreo compartido por todos los días con bloques (opcional). */
  recreo?: { inicio: string; fin: string } | null
  testIdPrefix: string
  ariaLabel?: string
  emptyText?: string
  /** Acciones del bloque (botón de 3 puntos). Sin esto, el bloque no lleva menú. */
  actionsFor?: (b: BloqueDia) => RowAction[]
}) {
  const [dia, setDia] = useState(diaInicial)

  const porDia = useMemo(() => {
    const map = new Map<number, BloqueDia[]>()
    for (const b of bloques) {
      const list = map.get(b.dia) ?? []
      list.push(b)
      map.set(b.dia, list)
    }
    for (const [d, list] of map) {
      if (list.length && recreo) {
        list.push({
          key: `recreo-${d}`,
          dia: d,
          inicio: recreo.inicio,
          fin: recreo.fin,
          titulo: 'Recreo',
          recreo: true,
        })
      }
      list.sort((a, b) => {
        const ord = a.inicio.localeCompare(b.inicio)
        return ord !== 0 ? ord : Number(Boolean(a.recreo)) - Number(Boolean(b.recreo))
      })
    }
    return map
  }, [bloques, recreo])

  // Lun–vie siempre; sábado y domingo solo si tienen bloques.
  const diasVisibles = DIAS.filter((d) => d.n <= 5 || (porDia.get(d.n)?.length ?? 0) > 0)
  const lista = porDia.get(dia) ?? []
  const nombreDia = DIAS.find((d) => d.n === dia)?.largo

  return (
    <>
      <div className="dias-tabs" role="tablist" aria-label={ariaLabel}>
        {diasVisibles.map((d) => (
          <button
            key={d.n}
            type="button"
            role="tab"
            aria-selected={d.n === dia}
            className={`dias-tabs__tab${d.n === dia ? ' dias-tabs__tab--activo' : ''}`}
            data-testid={`${testIdPrefix}-dia-${d.n}`}
            onClick={() => setDia(d.n)}
          >
            {d.corto}
          </button>
        ))}
      </div>

      <section className="app-seccion" data-testid={`${testIdPrefix}-lista`}>
        <h2 className="app-seccion__titulo">{nombreDia}</h2>
        {lista.length === 0 ? (
          <div className="empty-state">{emptyText}</div>
        ) : (
          <ul className="app-list">
            {lista.map((b) => (
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
                {actionsFor ? (
                  <RowMenu items={actionsFor(b)} testId={`${testIdPrefix}-menu-${b.key}`} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
