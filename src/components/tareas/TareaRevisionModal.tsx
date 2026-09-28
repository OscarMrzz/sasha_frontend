import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  calificarTarea,
  getTareaRevision,
  labelCriterioModo,
  listCriteriosEvaluacion,
  type CriterioEvaluacion,
  type RevisionAlumno,
  type TareaCriterioModo,
} from '#/services/tareas'

function nextCriterioId(
  current: string | null | undefined,
  criterios: CriterioEvaluacion[],
): string | null {
  if (!criterios.length) return null
  if (!current) return criterios[0].id
  const idx = criterios.findIndex((c) => c.id === current)
  if (idx < 0) return criterios[0].id
  if (idx >= criterios.length - 1) return null // ciclo: vacío al final
  return criterios[idx + 1].id
}

export function TareaRevisionModal({
  tareaId,
  onClose,
}: {
  tareaId: string
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tarea-revision', tareaId],
    queryFn: () => getTareaRevision(tareaId),
  })
  const { data: criterios = [] } = useQuery({
    queryKey: ['criterios-evaluacion'],
    queryFn: () => listCriteriosEvaluacion(false),
  })

  const [pending, setPending] = useState<string | null>(null)
  const [local, setLocal] = useState<Record<string, RevisionAlumno>>({})
  /** Borradores de puntos tipados (manual) antes de confirmar con blur/Enter. */
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const alumnos = useMemo(() => {
    const base = data?.alumnos ?? []
    return base.map((a) => local[a.alumno_id] ?? a)
  }, [data, local])

  const calificarMut = useMutation({
    mutationFn: calificarTarea,
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const applyLocal = (alumnoId: string, patch: Partial<RevisionAlumno>) => {
    setLocal((prev) => {
      const base = prev[alumnoId] ?? data?.alumnos.find((a) => a.alumno_id === alumnoId)
      if (!base) return prev
      return { ...prev, [alumnoId]: { ...base, ...patch } }
    })
  }

  const cycleSimple = async (row: RevisionAlumno) => {
    if (pending) return
    const nextEntregado = !row.entregado
    setPending(row.alumno_id)
    applyLocal(row.alumno_id, {
      entregado: nextEntregado,
      puntos: nextEntregado ? data?.tarea.puntos : undefined,
      criterio_evaluacion_id: null,
      criterio_nombre: null,
    })
    try {
      const res = await calificarMut.mutateAsync({
        tarea_id: tareaId,
        alumno_id: row.alumno_id,
        entregado: nextEntregado,
        criterio_evaluacion_id: null,
      })
      applyLocal(row.alumno_id, {
        entregado: nextEntregado,
        puntos: nextEntregado ? res.puntos : undefined,
      })
      void qc.invalidateQueries({ queryKey: ['tareas'] })
      void qc.invalidateQueries({ queryKey: ['calificaciones-clase'] })
      void qc.invalidateQueries({ queryKey: ['maestro-dashboard'] })
    } catch {
      void refetch()
      setLocal((prev) => {
        const next = { ...prev }
        delete next[row.alumno_id]
        return next
      })
    } finally {
      setPending(null)
    }
  }

  const cycleCriterio = async (row: RevisionAlumno) => {
    if (pending || !criterios.length) return
    const nextId = nextCriterioId(row.criterio_evaluacion_id, criterios)
    setPending(row.alumno_id)
    if (!nextId) {
      applyLocal(row.alumno_id, {
        entregado: false,
        puntos: undefined,
        criterio_evaluacion_id: null,
        criterio_nombre: null,
      })
      try {
        await calificarMut.mutateAsync({
          tarea_id: tareaId,
          alumno_id: row.alumno_id,
          entregado: false,
          criterio_evaluacion_id: null,
        })
        void qc.invalidateQueries({ queryKey: ['tareas'] })
      void qc.invalidateQueries({ queryKey: ['calificaciones-clase'] })
      void qc.invalidateQueries({ queryKey: ['maestro-dashboard'] })
      } catch {
        void refetch()
        setLocal((prev) => {
          const next = { ...prev }
          delete next[row.alumno_id]
          return next
        })
      } finally {
        setPending(null)
      }
      return
    }
    const crit = criterios.find((c) => c.id === nextId)
    applyLocal(row.alumno_id, {
      entregado: true,
      criterio_evaluacion_id: nextId,
      criterio_nombre: crit?.nombre ?? null,
    })
    try {
      const res = await calificarMut.mutateAsync({
        tarea_id: tareaId,
        alumno_id: row.alumno_id,
        entregado: true,
        criterio_evaluacion_id: nextId,
      })
      applyLocal(row.alumno_id, {
        entregado: true,
        puntos: res.puntos,
        criterio_evaluacion_id: nextId,
        criterio_nombre: crit?.nombre ?? null,
      })
      void qc.invalidateQueries({ queryKey: ['tareas'] })
      void qc.invalidateQueries({ queryKey: ['calificaciones-clase'] })
      void qc.invalidateQueries({ queryKey: ['maestro-dashboard'] })
    } catch {
      void refetch()
      setLocal((prev) => {
        const next = { ...prev }
        delete next[row.alumno_id]
        return next
      })
    } finally {
      setPending(null)
    }
  }

  const commitManual = async (row: RevisionAlumno, valueFromInput?: string) => {
    if (pending) return
    const max = data?.tarea.puntos ?? 0
    const shown =
      valueFromInput !== undefined
        ? valueFromInput
        : drafts[row.alumno_id] !== undefined
          ? drafts[row.alumno_id]
          : row.puntos != null
            ? String(row.puntos)
            : ''

    const trimmed = shown.trim()
    if (trimmed === '') {
      // Vaciar nota
      if (!row.entregado && row.puntos == null) {
        setDrafts((d) => {
          const next = { ...d }
          delete next[row.alumno_id]
          return next
        })
        return
      }
      setPending(row.alumno_id)
      applyLocal(row.alumno_id, {
        entregado: false,
        puntos: undefined,
        criterio_evaluacion_id: null,
        criterio_nombre: null,
      })
      try {
        await calificarMut.mutateAsync({
          tarea_id: tareaId,
          alumno_id: row.alumno_id,
          entregado: false,
          puntos: null,
          criterio_evaluacion_id: null,
        })
        setDrafts((d) => {
          const next = { ...d }
          delete next[row.alumno_id]
          return next
        })
        void qc.invalidateQueries({ queryKey: ['tareas'] })
      void qc.invalidateQueries({ queryKey: ['calificaciones-clase'] })
      void qc.invalidateQueries({ queryKey: ['maestro-dashboard'] })
      } catch {
        void refetch()
        setLocal((prev) => {
          const next = { ...prev }
          delete next[row.alumno_id]
          return next
        })
      } finally {
        setPending(null)
      }
      return
    }

    const n = Number(trimmed.replace(',', '.'))
    if (Number.isNaN(n)) {
      toast.error('Escribe un número válido')
      setDrafts((d) => {
        const next = { ...d }
        delete next[row.alumno_id]
        return next
      })
      return
    }
    if (n < 0 || n > max) {
      toast.error(`Puntos entre 0 y ${max}`)
      setDrafts((d) => ({ ...d, [row.alumno_id]: row.puntos != null ? String(row.puntos) : '' }))
      return
    }
    if (row.entregado && row.puntos === n) {
      setDrafts((d) => {
        const next = { ...d }
        delete next[row.alumno_id]
        return next
      })
      return
    }

    setPending(row.alumno_id)
    applyLocal(row.alumno_id, {
      entregado: true,
      puntos: n,
      criterio_evaluacion_id: null,
      criterio_nombre: null,
    })
    try {
      const res = await calificarMut.mutateAsync({
        tarea_id: tareaId,
        alumno_id: row.alumno_id,
        entregado: true,
        puntos: n,
        criterio_evaluacion_id: null,
      })
      applyLocal(row.alumno_id, {
        entregado: true,
        puntos: res.puntos,
      })
      setDrafts((d) => {
        const next = { ...d }
        delete next[row.alumno_id]
        return next
      })
      void qc.invalidateQueries({ queryKey: ['tareas'] })
      void qc.invalidateQueries({ queryKey: ['calificaciones-clase'] })
      void qc.invalidateQueries({ queryKey: ['maestro-dashboard'] })
    } catch {
      void refetch()
      setLocal((prev) => {
        const next = { ...prev }
        delete next[row.alumno_id]
        return next
      })
    } finally {
      setPending(null)
    }
  }

  const tipo = (data?.tarea.tipo ?? 'simple') as TareaCriterioModo
  const maxPts = data?.tarea.puntos ?? 0

  const colAccion =
    tipo === 'criterio' ? 'Criterio' : tipo === 'manual' ? `Puntos (0–${maxPts})` : 'Entregado'

  return (
    <Modal
      open={open}
      title={data ? `Revisar · ${data.tarea.titulo}` : 'Revisar tarea'}
      onClose={dismiss}
      wide
      footer={
        <button type="button" className="btn btn--primary" onClick={dismiss}>
          Listo
        </button>
      }
    >
      {isLoading ? (
        <div className="empty-state">Cargando alumnos…</div>
      ) : isError || !data ? (
        <div className="empty-state">{userMessageFromError(error)}</div>
      ) : (
        <div data-testid="tarea-revision-modal">
          <p className="texto-muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
            {data.tarea.curso_nombre} · {data.tarea.grado_nombre} sec{data.tarea.seccion_nombre} ·{' '}
            {data.tarea.puntos} pts · {labelCriterioModo(tipo)}
            {data.tarea.tipo_tarea_nombre ? ` · ${data.tarea.tipo_tarea_nombre}` : ''}
          </p>
          {tipo === 'manual' ? (
            <p className="texto-muted" style={{ fontSize: '0.8rem', marginTop: 0 }}>
              Escribe los puntos y confirma con Enter o al salir del campo. Vacío quita la nota.
            </p>
          ) : null}
          <div className="tarea-revision-table-wrap">
            <table className="tarea-revision-table" data-testid="tarea-revision-table">
              <thead>
                <tr>
                  <th>Cuenta</th>
                  <th>Nombre</th>
                  <th>{colAccion}</th>
                  {tipo !== 'manual' ? <th>Puntos</th> : null}
                </tr>
              </thead>
              <tbody>
                {alumnos.map((a) => (
                  <tr key={a.alumno_id}>
                    <td>{a.codigo}</td>
                    <td>{a.nombre}</td>
                    <td>
                      {tipo === 'simple' ? (
                        <button
                          type="button"
                          className={`btn btn--sm ${a.entregado ? 'btn--primary' : 'btn--ghost'}`}
                          data-testid={`tarea-rev-check-${a.alumno_id}`}
                          disabled={pending === a.alumno_id}
                          onClick={() => void cycleSimple(a)}
                        >
                          {a.entregado ? '✓' : '—'}
                        </button>
                      ) : tipo === 'criterio' ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm tarea-rev-criterio"
                          data-testid={`tarea-rev-crit-${a.alumno_id}`}
                          disabled={pending === a.alumno_id}
                          onClick={() => void cycleCriterio(a)}
                          title="Clic para cambiar criterio"
                        >
                          {a.criterio_nombre ?? '—'}
                        </button>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={maxPts}
                          step="0.5"
                          className="field__input tarea-rev-manual"
                          data-testid={`tarea-rev-manual-${a.alumno_id}`}
                          disabled={pending === a.alumno_id}
                          placeholder="0"
                          value={
                            drafts[a.alumno_id] !== undefined
                              ? drafts[a.alumno_id]
                              : a.puntos != null
                                ? String(a.puntos)
                                : ''
                          }
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [a.alumno_id]: e.target.value }))
                          }
                          onBlur={(e) => void commitManual(a, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                        />
                      )}
                    </td>
                    {tipo !== 'manual' ? (
                      <td>{a.puntos != null ? a.puntos : '—'}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
