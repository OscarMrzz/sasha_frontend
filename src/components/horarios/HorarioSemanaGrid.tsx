import { useMemo } from 'react'
import { DIA_SHORT } from '#/lib/horarioGrid'

export type SemanaSlot = {
  key: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  lines: string[]
  highlight?: boolean
}

export type SemanaRecreo = { start: string; end: string }

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]
const NO_RECESOS: SemanaRecreo[] = []

/** Tabla Hora × día (lun–dom); sábado y domingo solo aparecen si tienen bloques. */
export function HorarioSemanaGrid({
  slots,
  recesos = NO_RECESOS,
  testId,
  emptyText = 'Sin horario publicado.',
}: {
  slots: SemanaSlot[]
  recesos?: SemanaRecreo[]
  testId?: string
  emptyText?: string
}) {
  const days = useMemo(
    () => ALL_DAYS.filter((d) => d <= 5 || slots.some((s) => s.dia_semana === d)),
    [slots],
  )

  const intervals = useMemo(() => {
    const map = new Map<string, { start: string; end: string; recreo: boolean }>()
    for (const s of slots) {
      const start = s.hora_inicio.slice(0, 5)
      const end = s.hora_fin.slice(0, 5)
      if (start && end) map.set(start, { start, end, recreo: false })
    }
    for (const r of recesos) {
      const start = r.start.slice(0, 5)
      const end = r.end.slice(0, 5)
      if (start && end && !map.has(start)) map.set(start, { start, end, recreo: true })
    }
    return [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
  }, [slots, recesos])

  const byCell = useMemo(() => {
    const map = new Map<string, SemanaSlot[]>()
    for (const s of slots) {
      const k = `${s.dia_semana}|${s.hora_inicio.slice(0, 5)}`
      const list = map.get(k) ?? []
      list.push(s)
      map.set(k, list)
    }
    return map
  }, [slots])

  if (slots.length === 0) return <p className="texto-muted">{emptyText}</p>

  return (
    <div className="data-table-wrap" style={{ overflowX: 'auto' }} data-testid={testId}>
      <table className="data-table ficha-semana-table">
        <thead>
          <tr>
            <th>Hora</th>
            {days.map((d) => (
              <th key={d}>{DIA_SHORT[d]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {intervals.map((iv) =>
            iv.recreo ? (
              <tr key={iv.start} className="ficha-semana-table__recreo-row">
                <td className="texto-muted" style={{ whiteSpace: 'nowrap' }}>
                  {iv.start}–{iv.end}
                </td>
                <td
                  colSpan={days.length}
                  className="ficha-semana-table__recreo"
                  data-testid="horario-recreo"
                >
                  Recreo
                </td>
              </tr>
            ) : (
              <tr key={iv.start}>
                <td className="texto-muted" style={{ whiteSpace: 'nowrap' }}>
                  {iv.start}–{iv.end}
                </td>
                {days.map((d) => {
                  const cell = byCell.get(`${d}|${iv.start}`) ?? []
                  return (
                    <td key={d}>
                      {cell.map((s) => (
                        <div
                          key={s.key}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: s.highlight ? 700 : undefined,
                          }}
                        >
                          {s.lines.map((line, i) => (
                            <div key={i} className={i > 0 ? 'texto-muted' : undefined}>
                              {line}
                            </div>
                          ))}
                        </div>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}
