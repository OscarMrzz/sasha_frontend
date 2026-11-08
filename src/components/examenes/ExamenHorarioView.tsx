import { Fragment, useMemo, useState } from 'react'
import { useEsMovil } from '#/hooks/use-media-query'
import {
  duracionMinutos,
  duracionTexto,
  fechaCorta,
  fechaLarga,
  formatRangoFechas,
  hora12,
  horaRango12,
  normalizarHora,
  recesosDeLista,
} from '#/lib/examenes'
import type { PortalExamenes } from '#/services/examenes'

type ExamenHorarioViewProps = {
  data: PortalExamenes
  title?: string
  testIdPrefix?: string
}

type BloqueColumna = {
  key: string
  inicio: string
  fin: string
  duracion: number
}

function claveBloque(inicio: string, fin: string) {
  return `${normalizarHora(inicio)}|${normalizarHora(fin)}`
}

/**
 * Horario de exámenes del portal (alumno y responsable).
 * Escritorio: tabla fecha × bloque. Móvil: pestañas por fecha como el horario normal.
 */
export function ExamenHorarioView({
  data,
  title = 'Horario de exámenes',
  testIdPrefix = 'examen-horario',
}: ExamenHorarioViewProps) {
  const esMovil = useEsMovil()
  const [fechaActiva, setFechaActiva] = useState(data.examenes[0]?.fecha ?? '')

  const bloques = useMemo<BloqueColumna[]>(() => {
    const map = new Map<string, BloqueColumna>()
    for (const dia of data.examenes) {
      for (const bloque of dia.bloques) {
        const key = claveBloque(bloque.hora_inicio, bloque.hora_fin)
        if (!map.has(key)) {
          map.set(key, {
            key,
            inicio: normalizarHora(bloque.hora_inicio),
            fin: normalizarHora(bloque.hora_fin),
            duracion: duracionMinutos(bloque.hora_inicio, bloque.hora_fin),
          })
        }
      }
    }
    return [...map.values()].sort(
      (a, b) => a.inicio.localeCompare(b.inicio) || a.fin.localeCompare(b.fin),
    )
  }, [data.examenes])

  const porDiaBloque = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const dia of data.examenes) {
      for (const bloque of dia.bloques) {
        const key = `${dia.fecha}|${claveBloque(bloque.hora_inicio, bloque.hora_fin)}`
        const lista = map.get(key) ?? []
        lista.push(bloque.curso_nombre)
        map.set(key, lista)
      }
    }
    return map
  }, [data.examenes])

  const diaActivo =
    data.examenes.find((dia) => dia.fecha === fechaActiva) ?? data.examenes[0]
  const recesosDia = diaActivo ? recesosDeLista(diaActivo.bloques) : []
  const recesoPorBloque = new Map(recesosDia.map((r) => [r.despuesDe, r]))

  if (!data.activo) return null

  const pagos = data.pagos_pendientes

  return (
    <section className="examen-horario" data-testid={`${testIdPrefix}-view`}>
      <h2 className="portal-home__section-title">{title}</h2>
      <p className="texto-muted examen-horario__meta">
        {[data.periodo, data.parcial, data.modalidad]
          .filter(Boolean)
          .join(' · ')}
        {data.fecha_inicio && data.fecha_fin
          ? ` · ${formatRangoFechas(data.fecha_inicio, data.fecha_fin)}`
          : ''}
      </p>

      {!data.vigente ? (
        <div
          className="examen-horario__aviso"
          role="status"
          data-testid={`${testIdPrefix}-proximo`}
        >
          <strong>Próximos exámenes</strong>
          <span>
            Este horario todavía no está vigente; comienza el{' '}
            {data.fecha_inicio ? fechaCorta(data.fecha_inicio) : '—'}.
          </span>
        </div>
      ) : null}

      {pagos.length > 0 ? (
        <div className="examen-horario__aviso" role="status" data-testid={`${testIdPrefix}-pagos`}>
          <strong>Pagos pendientes</strong>
          <span>
            Estos pagos bloquean notas:{' '}
            {pagos.map((pago) => pago.etiqueta).filter(Boolean).join(', ') || 'consulta en Pagos'}.
          </span>
        </div>
      ) : null}

      {data.examenes.length === 0 ? (
        <div className="empty-state">No hay exámenes publicados.</div>
      ) : esMovil ? (
        <>
          <div className="dias-tabs" role="tablist" aria-label="Días de examen">
            {data.examenes.map((dia) => (
              <button
                key={dia.fecha}
                type="button"
                role="tab"
                aria-selected={dia.fecha === diaActivo.fecha}
                className={`dias-tabs__tab${
                  dia.fecha === diaActivo.fecha ? ' dias-tabs__tab--activo' : ''
                }`}
                data-testid={`${testIdPrefix}-dia-${dia.fecha}`}
                onClick={() => setFechaActiva(dia.fecha)}
              >
                {fechaCorta(dia.fecha)}
              </button>
            ))}
          </div>

          <section className="app-seccion" data-testid={`${testIdPrefix}-lista`}>
            <h2 className="app-seccion__titulo">
              {fechaLarga(diaActivo.fecha)}
            </h2>
            {diaActivo.bloques.length > 0 ? (
              <ul className="app-list">
                {diaActivo.bloques.map((bloque) => {
                  const receso = recesoPorBloque.get(bloque.id)
                  return (
                    <Fragment key={bloque.id}>
                      <li className="app-list__item">
                        <span className="bloque-hora">{hora12(bloque.hora_inicio)}</span>
                        <div className="app-list__cuerpo">
                          <span className="app-list__titulo">{bloque.curso_nombre}</span>
                          <span className="app-list__sub">
                            {horaRango12(bloque.hora_inicio, bloque.hora_fin)} ·{' '}
                            {duracionTexto(
                              duracionMinutos(bloque.hora_inicio, bloque.hora_fin),
                            )}
                          </span>
                        </div>
                      </li>
                      {receso ? (
                        <li className="app-list__item examen-horario__receso">
                          <span className="bloque-hora">Receso</span>
                          <div className="app-list__cuerpo">
                            <span className="app-list__sub">
                              {horaRango12(receso.inicio, receso.fin)} ·{' '}
                              {duracionTexto(receso.minutos)}
                            </span>
                          </div>
                        </li>
                      ) : null}
                    </Fragment>
                  )
                })}
              </ul>
            ) : (
              <div className="empty-state">Sin exámenes este día.</div>
            )}
            <p className="examen-horario__salida">
              Hora de salida: <strong>{hora12(diaActivo.salida) || '—'}</strong>
            </p>
          </section>
        </>
      ) : (
        <div className="horario-board__grid-wrap examen-horario__tabla-wrap">
          <table className="horario-board__table examen-horario__tabla">
            <thead>
              <tr>
                <th className="horario-board__time">Fecha / salida</th>
                {bloques.map((bloque, index) => (
                  <th key={bloque.key}>
                    Bloque {index + 1}
                    <br />
                    <span
                      className="texto-muted"
                      style={{ fontSize: '0.75rem', fontWeight: 400 }}
                    >
                      {horaRango12(bloque.inicio, bloque.fin)}
                    </span>
                    <br />
                    <span
                      className="texto-muted"
                      style={{ fontSize: '0.7rem', fontWeight: 400 }}
                    >
                      {duracionTexto(bloque.duracion)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.examenes.map((dia) => (
                <tr key={dia.fecha}>
                  <td className="horario-board__time">
                    {fechaCorta(dia.fecha)}
                    <br />
                    <span className="texto-muted" style={{ fontSize: '0.75rem' }}>
                      Salida {hora12(dia.salida) || '—'}
                    </span>
                    {recesosDeLista(dia.bloques).length > 0 ? (
                      <span
                        className="texto-muted"
                        style={{ display: 'block', fontSize: '0.7rem', marginTop: 4 }}
                      >
                        Recesos:{' '}
                        {recesosDeLista(dia.bloques)
                          .map(
                            (r) =>
                              `${horaRango12(r.inicio, r.fin)} (${duracionTexto(r.minutos)})`,
                          )
                          .join(' · ')}
                      </span>
                    ) : null}
                  </td>
                  {bloques.map((bloque) => {
                    const cursos =
                      porDiaBloque.get(
                        `${dia.fecha}|${claveBloque(bloque.inicio, bloque.fin)}`,
                      ) ?? []
                    return (
                      <td key={bloque.key} className="horario-board__cell">
                        <div className="horario-board__cell-stack">
                          {cursos.length === 0 ? (
                            <span className="texto-muted" style={{ fontSize: '0.75rem' }}>
                              —
                            </span>
                          ) : (
                            cursos.map((curso, index) => (
                              <div
                                key={`${bloque.key}-${curso}-${index}`}
                                className="horario-pill horario-pill--fixed"
                              >
                                <span>{curso}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
