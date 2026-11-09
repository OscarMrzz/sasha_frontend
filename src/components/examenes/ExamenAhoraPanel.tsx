import { useState } from 'react'
import { toast } from 'sonner'
import { ExamenAlumnoCard } from '#/components/examenes/ExamenAlumnoCard'
import { useCan } from '#/components/gates/Can'
import { Modal } from '#/components/ui/Modal'
import { SearchInput } from '#/components/ui/SearchInput'
import { userMessageFromError } from '#/lib/api'
import {
  estadoAsistenciaLabel,
  fechaCorta,
  horaRango,
  labelGradoSeccion,
} from '#/lib/examenes'
import { nextLetraSeccion } from '#/services/asistencia'
import {
  getExamenAsistencia,
  guardarExamenAsistencia,
} from '#/services/examenes'
import type {
  EstadoAsistenciaExamen,
  ExamenAhora,
  ExamenAhoraResponse,
  ExamenAsistenciaResponse,
} from '#/services/examenes'

type ExamenAhoraPanelProps = {
  data: ExamenAhoraResponse | null
  loading?: boolean
  onReportar: (examen: ExamenAhora, codigo?: string) => void
  onSaved?: () => void
}

type AsistenciaState = {
  examen: ExamenAhora
  data: ExamenAsistenciaResponse | null
  estados: Record<string, EstadoAsistenciaExamen>
  loading: boolean
  saving: boolean
}

/** Panel limpio del maestro: examen actual, morosos, lista A/T/E/F y reportes. */
export function ExamenAhoraPanel({ data, loading, onReportar, onSaved }: ExamenAhoraPanelProps) {
  const { can } = useCan()
  const [asistencia, setAsistencia] = useState<AsistenciaState | null>(null)
  const [alumnoFilter, setAlumnoFilter] = useState('')

  const puedeAsistencia = can('examenes:asistencia')
  const puedeReportar = can('examenes:reportar')

  async function abrirAsistencia(examen: ExamenAhora) {
    setAlumnoFilter('')
    setAsistencia({
      examen,
      data: null,
      estados: {},
      loading: true,
      saving: false,
    })
    try {
      const lista = await getExamenAsistencia(examen.examen_asignacion_id)
      const estados = Object.fromEntries(
        lista.alumnos.map((alumno) => [alumno.alumno_id, alumno.estado]),
      ) as Record<string, EstadoAsistenciaExamen>
      setAsistencia((prev) =>
        prev?.examen.examen_asignacion_id === examen.examen_asignacion_id
          ? { ...prev, data: lista, estados, loading: false }
          : prev,
      )
    } catch (error) {
      toast.error(userMessageFromError(error))
      setAsistencia(null)
    }
  }

  function marcar(alumnoId: string, estado: EstadoAsistenciaExamen) {
    setAsistencia((prev) =>
      prev ? { ...prev, estados: { ...prev.estados, [alumnoId]: estado } } : prev,
    )
  }

  async function guardarLista() {
    const actual = asistencia
    if (!actual?.data) return
    const listaActual = actual.data
    setAsistencia((prev) => (prev ? { ...prev, saving: true } : prev))
    try {
      const items = listaActual.alumnos.map((alumno) => ({
        alumno_id: alumno.alumno_id,
        estado: actual.estados[alumno.alumno_id] ?? 'A',
      }))
      const lista = await guardarExamenAsistencia(
        actual.examen.examen_asignacion_id,
        items,
      )
      const estados = Object.fromEntries(
        lista.alumnos.map((alumno) => [alumno.alumno_id, alumno.estado]),
      ) as Record<string, EstadoAsistenciaExamen>
      setAsistencia((prev) =>
        prev
          ? { ...prev, data: lista, estados, saving: false }
          : prev,
      )
      toast.success('Lista guardada')
      onSaved?.()
    } catch (error) {
      toast.error(userMessageFromError(error))
      setAsistencia((prev) => (prev ? { ...prev, saving: false } : prev))
    }
  }

  const alumnosAsistencia =
    asistencia?.data?.alumnos.filter((alumno) => {
      const q = alumnoFilter.trim().toLowerCase()
      if (!q) return true
      return (
        alumno.codigo.toLowerCase().includes(q) ||
        alumno.nombre.toLowerCase().includes(q)
      )
    }) ?? []

  if (loading && !data) {
    return <div className="empty-state">Buscando exámenes de ahora…</div>
  }

  if (!data) return null

  if (data.examenes.length === 0) {
    return (
      <div className="examen-ahora" data-testid="examen-ahora-panel">
        <div className="empty-state" data-testid="examen-ahora-vacio">
          No hay examen en este bloque.
        </div>
        {data.siguiente ? (
          <article className="examen-ahora__card examen-ahora__card--siguiente">
            <header className="examen-ahora__card-head">
              <div>
                <span className="examen-ahora__etiqueta">Siguiente examen</span>
                <h2 className="examen-ahora__curso">{data.siguiente.curso_nombre}</h2>
                <p className="examen-ahora__meta">
                  {labelGradoSeccion(
                    data.siguiente.grado_nombre,
                    data.siguiente.seccion_nombre,
                  )}{' '}
                  · {horaRango(data.siguiente.hora_inicio, data.siguiente.hora_fin)}
                </p>
              </div>
            </header>
            <p className="examen-ahora__supervisores">
              Supervisores:{' '}
              {data.siguiente.supervisores.length > 0
                ? data.siguiente.supervisores.map((s) => s.maestro_nombre).join(', ')
                : '—'}
            </p>
          </article>
        ) : null}
      </div>
    )
  }

  return (
    <div className="examen-ahora" data-testid="examen-ahora-panel">
      <p className="examen-ahora__reloj texto-muted" data-testid="examen-ahora-hora">
        {fechaCorta(data.fecha)} · {data.hora}
      </p>

      <div className="examen-ahora__grid">
        {data.examenes.map((examen) => (
          <article
            key={examen.examen_asignacion_id}
            className="examen-ahora__card"
            data-testid={`examen-ahora-card-${examen.examen_asignacion_id}`}
          >
            <header className="examen-ahora__card-head">
              <div>
                <span className="examen-ahora__etiqueta">
                  {examen.es_final ? 'En curso · Examen final' : 'En curso'}
                </span>
                <h2 className="examen-ahora__curso">{examen.curso_nombre}</h2>
                <p className="examen-ahora__meta">
                  {labelGradoSeccion(examen.grado_nombre, examen.seccion_nombre)} ·{' '}
                  {horaRango(examen.hora_inicio, examen.hora_fin)}
                </p>
                {examen.modalidad_nombre ? (
                  <p className="examen-ahora__meta texto-muted">{examen.modalidad_nombre}</p>
                ) : null}
              </div>
              <div className="examen-ahora__acciones">
                {puedeAsistencia ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => void abrirAsistencia(examen)}
                    data-testid={`examen-ahora-pasar-${examen.examen_asignacion_id}`}
                  >
                    Pasar lista
                  </button>
                ) : null}
                {puedeReportar ? (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => onReportar(examen)}
                    data-testid={`examen-ahora-reportar-${examen.examen_asignacion_id}`}
                  >
                    Reportar alumno
                  </button>
                ) : null}
              </div>
            </header>

            <p className="examen-ahora__supervisores">
              Supervisores:{' '}
              {examen.supervisores.length > 0
                ? examen.supervisores.map((s) => s.maestro_nombre).join(', ')
                : '—'}
            </p>

            <section className="examen-ahora__alumnos">
              <h3 className="examen-ahora__alumnos-title">
                Alumnos con pagos pendientes
              </h3>
              {examen.es_final ? (
                <p className="texto-muted">
                  Examen final: se listan todos los pagos bloqueantes del
                  periodo, aunque aún no venzan.
                </p>
              ) : null}
              {examen.alumnos_pagos_pendientes.length === 0 ? (
                <p className="texto-muted examen-ahora__sin-pagos">
                  Sin pagos pendientes.
                </p>
              ) : (
                <div className="examen-ahora__alumno-grid">
                  {examen.alumnos_pagos_pendientes.map((alumno) => (
                    <ExamenAlumnoCard
                      key={alumno.alumno_id}
                      alumno={{
                        codigo: alumno.codigo,
                        nombre: alumno.nombre,
                        foto: alumno.foto,
                        grado: alumno.grado,
                        seccion: alumno.seccion,
                        meses: alumno.meses,
                        conceptos: alumno.conceptos,
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </article>
        ))}
      </div>

      <Modal
        open={Boolean(asistencia)}
        title={
          asistencia
            ? `Pasar asistencia — ${asistencia.examen.curso_nombre}`
            : 'Pasar asistencia'
        }
        xl
        onClose={() => setAsistencia(null)}
        testId="examen-asistencia-modal"
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setAsistencia(null)}
              disabled={asistencia?.saving}
            >
              Cerrar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void guardarLista()}
              disabled={!asistencia?.data || asistencia.saving}
              data-testid="examen-asistencia-guardar"
            >
              {asistencia?.saving ? 'Guardando…' : 'Guardar lista'}
            </button>
          </>
        }
      >
        {asistencia?.loading ? (
          <p className="texto-muted">Cargando alumnos…</p>
        ) : asistencia?.data ? (
          <div data-testid="examen-asistencia-grid">
            <p className="texto-muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
              Día {fechaCorta(asistencia.data.fecha)} ·{' '}
              {horaRango(asistencia.data.hora_inicio, asistencia.data.hora_fin)} ·{' '}
              {labelGradoSeccion(
                asistencia.data.grado_nombre,
                asistencia.data.seccion_nombre,
              )}
            </p>
            {asistencia.data.pasada ? (
              <p className="examen-ahora__asistencia-aviso">
                La lista ya fue guardada. Puedes corregirla.
              </p>
            ) : null}
            <div className="asistencia-toolbar">
              <SearchInput
                data-testid="examen-asistencia-filtro"
                value={alumnoFilter}
                onChange={(event) => setAlumnoFilter(event.target.value)}
                style={{ minWidth: 200 }}
              />
            </div>
            <div
              className="texto-muted"
              style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}
            >
              Leyenda: <strong>A</strong> Asistió · <strong>T</strong> Tarde ·{' '}
              <strong>E</strong> Excusa · <strong>F</strong> Falta · Clic en celda para
              ciclar; los cambios se guardan con «Guardar lista».
            </div>
            {alumnosAsistencia.length === 0 ? (
              <div className="empty-state">Sin alumnos que coincidan.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" data-testid="examen-asistencia-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th style={{ textAlign: 'center', minWidth: 52 }}>
                        {fechaCorta(asistencia.data.fecha)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosAsistencia.map((alumno) => {
                      const actual =
                        asistencia.estados[alumno.alumno_id] ?? alumno.estado
                      return (
                        <tr
                          key={alumno.alumno_id}
                          data-testid={`examen-asistencia-alumno-${alumno.codigo}`}
                        >
                          <td>{alumno.codigo}</td>
                          <td>{alumno.nombre}</td>
                          <td style={{ textAlign: 'center', padding: '0.15rem' }}>
                            <button
                              type="button"
                              className="asistencia-celda"
                              data-letra={actual}
                              title={estadoAsistenciaLabel(actual)}
                              disabled={asistencia.saving}
                              onClick={() =>
                                marcar(
                                  alumno.alumno_id,
                                  nextLetraSeccion(actual) as EstadoAsistenciaExamen,
                                )
                              }
                              data-testid={`examen-asistencia-${alumno.codigo}`}
                            >
                              {actual}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="texto-muted">No se pudo cargar la lista del examen.</p>
        )}
      </Modal>
    </div>
  )
}
