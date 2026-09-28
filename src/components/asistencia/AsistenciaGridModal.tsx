import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { SearchInput } from '#/components/ui/SearchInput'
import { userMessageFromError } from '#/lib/api'
import {
  downloadAsistenciaPdf,
  getSemanaAsistencia,
  LETRA_TO_CODIGO,
  nextLetra,
  putCeldaAsistencia,
  type AsistenciaMateria,
  type SemanaAlumno,
  type SemanaResponse,
} from '#/services/asistencia'

export type AsistenciaGridMode = 'pasar' | 'editar' | 'ver'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function diaRelativo(fecha: string, hoy: string): 'pasado' | 'hoy' | 'futuro' {
  if (fecha === hoy) return 'hoy'
  if (fecha > hoy) return 'futuro'
  return 'pasado'
}

export function AsistenciaGridModal({
  materia,
  mode,
  onClose,
}: {
  materia: AsistenciaMateria
  mode: AsistenciaGridMode
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const readOnly = mode === 'ver'
  const [fechaRef, setFechaRef] = useState(todayISO)
  const [semana, setSemana] = useState<SemanaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [alumnoFilter, setAlumnoFilter] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  const effectiveFecha = mode === 'pasar' ? todayISO() : fechaRef

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s = await getSemanaAsistencia(materia.asignacion_docente_id, effectiveFecha)
      setSemana(s)
    } catch (e) {
      toast.error(userMessageFromError(e))
      setSemana(null)
    } finally {
      setLoading(false)
    }
  }, [materia.asignacion_docente_id, effectiveFecha])

  useEffect(() => {
    void load()
  }, [load])

  const title =
    mode === 'pasar'
      ? `Pasar asistencia — ${materia.curso_nombre}`
      : mode === 'editar'
        ? `Editar asistencia — ${materia.curso_nombre}`
        : `Ver asistencia — ${materia.curso_nombre}`

  const alumnosFiltrados = useMemo(() => {
    if (!semana) return []
    const q = alumnoFilter.trim().toLowerCase()
    if (!q) return semana.alumnos
    return semana.alumnos.filter(
      (a) => a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q),
    )
  }, [semana, alumnoFilter])

  const cycleCelda = async (alumno: SemanaAlumno, fecha: string, letraActual: string) => {
    if (readOnly || pending) return
    if (diaRelativo(fecha, todayISO()) === 'futuro') {
      toast.message('No se puede marcar asistencia en días futuros')
      return
    }
    const nueva = nextLetra(letraActual)
    const codigo = LETRA_TO_CODIGO[nueva]
    const key = `${alumno.alumno_id}:${fecha}`
    setPending(key)
    setSemana((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        alumnos: prev.alumnos.map((a) => {
          if (a.alumno_id !== alumno.alumno_id) return a
          return {
            ...a,
            marcas: a.marcas.map((m) =>
              m.fecha === fecha ? { ...m, letra: nueva, tipo_codigo: codigo } : m,
            ),
          }
        }),
      }
    })
    try {
      await putCeldaAsistencia({
        alumno_id: alumno.alumno_id,
        asignacion_docente_id: materia.asignacion_docente_id,
        fecha,
        tipo_codigo: codigo,
      })
    } catch (e) {
      toast.error(userMessageFromError(e))
      await load()
    } finally {
      setPending(null)
    }
  }

  const onDownloadPdf = async () => {
    try {
      await downloadAsistenciaPdf(materia.asignacion_docente_id, effectiveFecha)
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={dismiss}
      xl
      footer={
        <>
          {mode === 'ver' ? (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="asistencia-download-pdf"
              onClick={() => void onDownloadPdf()}
            >
              Descargar PDF
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Cerrar
          </button>
        </>
      }
    >
      <div data-testid="asistencia-grid-modal">
        <p className="texto-muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
          {semana
            ? `Semana ${semana.semana_inicio} — ${semana.semana_fin}`
            : 'Cargando semana…'}
          {' · '}
          {materia.seccion_nombre}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem 1.25rem',
            alignItems: 'end',
            marginBottom: '0.75rem',
          }}
        >
          {mode !== 'pasar' ? (
            <Field label="Fecha (semana)">
              <input
                type="date"
                className="field__input"
                data-testid="asistencia-fecha-ref"
                value={fechaRef}
                onChange={(e) => setFechaRef(e.target.value)}
              />
            </Field>
          ) : null}
          <SearchInput
            data-testid="asistencia-alumno-filter"
            value={alumnoFilter}
            onChange={(e) => setAlumnoFilter(e.target.value)}
            style={{ minWidth: 200 }}
          />
        </div>

        <div
          className="texto-muted"
          style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}
          data-testid="asistencia-leyenda"
        >
          Leyenda: <strong>A</strong> Asistió · <strong>T</strong> Tarde · <strong>E</strong> Excusa ·{' '}
          <strong>F</strong> Falta
          {!readOnly ? ' · Clic en celda para ciclar' : null}
        </div>

        {loading ? (
          <div className="empty-state">Cargando…</div>
        ) : !semana ? (
          <div className="empty-state">No se pudo cargar la semana</div>
        ) : alumnosFiltrados.length === 0 ? (
          <div className="empty-state">Sin alumnos matriculados</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" data-testid="asistencia-semana-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  {semana.dias.map((d) => (
                    <th key={d.fecha} style={{ textAlign: 'center', minWidth: 52 }}>
                      {d.etiqueta}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alumnosFiltrados.map((al) => (
                  <tr key={al.alumno_id}>
                    <td>{al.codigo}</td>
                    <td>{al.nombre}</td>
                    {al.marcas.map((m) => {
                      const key = `${al.alumno_id}:${m.fecha}`
                      const busy = pending === key
                      const rel = diaRelativo(m.fecha, todayISO())
                      const locked = rel === 'futuro'
                      const canEdit = !readOnly && !locked
                      return (
                        <td key={m.fecha} style={{ textAlign: 'center', padding: '0.15rem' }}>
                          {canEdit ? (
                            <button
                              type="button"
                              className="asistencia-celda"
                              data-testid={`asistencia-celda-${al.codigo}-${m.fecha}`}
                              data-letra={m.letra || ''}
                              data-dia={rel}
                              disabled={busy}
                              onClick={() => void cycleCelda(al, m.fecha, m.letra || '')}
                            >
                              {m.letra || ''}
                            </button>
                          ) : (
                            <span
                              className={`asistencia-celda asistencia-celda--ro${locked ? ' asistencia-celda--futuro' : ''}`}
                              data-testid={`asistencia-celda-${al.codigo}-${m.fecha}`}
                              data-letra={m.letra || ''}
                              data-dia={rel}
                              title={locked ? 'Día futuro: no editable' : undefined}
                            >
                              {m.letra || '·'}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}
