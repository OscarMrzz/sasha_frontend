import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { getPuntosAsistencia, guardarPuntosAsistencia } from '#/services/asistencia'
import type { AsistenciaMateria, PuntosAsistenciaParcial } from '#/services/asistencia'

function fechaCorta(iso: string) {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}`
}

function numero(v: string | undefined, fallback: number) {
  if (v === undefined) return fallback
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** Puntos de asistencia por parcial: se reparten entre los días de clase; F descuenta un día y T medio. */
export function PuntosAsistenciaModal({
  materia,
  onClose,
}: {
  materia: AsistenciaMateria
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const asigId = materia.asignacion_docente_id
  const { data: parciales = [], isLoading } = useQuery({
    queryKey: ['asistencia-puntos', asigId],
    queryFn: () => getPuntosAsistencia(asigId),
  })
  const [valores, setValores] = useState<Partial<Record<string, string>>>({})
  const [confirmar, setConfirmar] = useState(false)

  const puntosDe = (p: PuntosAsistenciaParcial) => numero(valores[p.parcial_id], p.puntos)
  const invalido = parciales.some((p) => {
    const v = puntosDe(p)
    return Number.isNaN(v) || v < 0 || v > 100
  })
  const cambiado = parciales.some((p) => puntosDe(p) !== p.puntos)

  const mut = useMutation({
    mutationFn: () =>
      guardarPuntosAsistencia(
        asigId,
        parciales.map((p) => ({ parcial_id: p.parcial_id, puntos: puntosDe(p) })),
      ),
    onSuccess: (data) => {
      toast.success('Puntos de asistencia guardados')
      qc.setQueryData(['asistencia-puntos', asigId], data)
      void qc.invalidateQueries()
      setValores({})
      setConfirmar(false)
      dismiss()
    },
    onError: (e) => {
      setConfirmar(false)
      toast.error(userMessageFromError(e))
    },
  })

  return (
    <>
      <Modal
        open={open}
        title={`Puntos por parcial — ${materia.curso_nombre}`}
        onClose={dismiss}
        wide
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="puntos-asistencia-guardar"
              disabled={!cambiado || invalido || mut.isPending}
              onClick={() => setConfirmar(true)}
            >
              Guardar
            </button>
          </>
        }
      >
        <div data-testid="puntos-asistencia-modal">
          <p className="texto-muted" style={{ marginTop: 0 }}>
            Cada falta (F) quita 1 punto y cada llegada tarde (T) quita 0.25. Nunca se quita más de lo que
            vale la asistencia del parcial.
          </p>
          {isLoading ? (
            <div className="empty-state">Cargando…</div>
          ) : parciales.length === 0 ? (
            <div className="empty-state">El periodo no tiene parciales</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parcial</th>
                  <th style={{ width: '8rem' }}>Puntos</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {parciales.map((p) => {
                  const v = puntosDe(p)
                  const ok = !Number.isNaN(v) && v >= 0 && v <= 100
                  const total = ok ? p.plan_suma + v : NaN
                  const descuadre = ok && p.plan_suma > 0 && Math.abs(total - 100) > 0.001
                  return (
                    <tr key={p.parcial_id} data-testid={`puntos-asistencia-fila-${p.numero}`}>
                      <td>
                        <strong>{p.etiqueta}</strong>
                        <div className="texto-muted" style={{ fontSize: '0.8rem' }}>
                          {fechaCorta(p.fecha_inicio)}–{fechaCorta(p.fecha_fin)}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.25"
                          className="field__input"
                          aria-label={`Puntos de asistencia del ${p.etiqueta}`}
                          data-testid={`puntos-asistencia-input-${p.numero}`}
                          value={valores[p.parcial_id] ?? String(p.puntos)}
                          onChange={(e) => setValores((s) => ({ ...s, [p.parcial_id]: e.target.value }))}
                        />
                      </td>
                      <td data-testid={`puntos-asistencia-detalle-${p.numero}`}>
                        {!ok ? (
                          <span style={{ color: 'var(--sasha-danger)' }}>De 0 a 100</span>
                        ) : v === 0 ? (
                          <span className="texto-muted">Sin puntos</span>
                        ) : (
                          <>
                            Se pierden todos con {Math.ceil(v)} {Math.ceil(v) === 1 ? 'falta' : 'faltas'} o{' '}
                            {Math.ceil(v * 4)} tardes
                          </>
                        )}
                        {descuadre ? (
                          <div
                            style={{ color: 'var(--sasha-warning)', fontSize: '0.8rem' }}
                            data-testid={`puntos-asistencia-aviso-${p.numero}`}
                          >
                            El plan suma {p.plan_suma}; con asistencia da {total.toFixed(2)} de 100
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Guardar puntos de asistencia"
        message={`¿Guardar los puntos de asistencia por parcial de ${materia.curso_nombre}? Las notas de los parciales se recalculan.`}
        confirmLabel="Guardar"
        onConfirm={() => mut.mutate()}
        onCancel={() => setConfirmar(false)}
      />
    </>
  )
}
