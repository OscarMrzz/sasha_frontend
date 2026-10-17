import { AdjuntosTarea } from '#/components/tareas/AdjuntosTarea'
import { Modal } from '#/components/ui/Modal'
import { useLimitesAdjuntos } from '#/hooks/use-limites-adjuntos'
import { labelCriterioModo } from '#/services/tareas'
import type { Tarea } from '#/services/tareas'

/** Detalle de una tarea (solo lectura). */
export function TareaVerModal({ tarea, onClose }: { tarea: Tarea | null; onClose: () => void }) {
  // El periodo se resuelve por el parcial de la tarea (la lista de periodos ya
  // trae sus parciales). Sin parcial o sin permiso de catálogos, cae al default.
  const { maxArchivos, maxPesoMB } = useLimitesAdjuntos({ parcialId: tarea?.parcial_id })

  const filas: [string, string][] = tarea
    ? [
        ['Clase', `${tarea.curso_nombre ?? '—'} · ${tarea.grado_nombre ?? ''} sec${tarea.seccion_nombre ?? ''}`],
        ['Parcial', tarea.parcial_nombre ?? '—'],
        ['Tipo', tarea.tipo_tarea_nombre ?? '—'],
        ['Criterio', labelCriterioModo(tarea.tipo)],
        ['Puntos', String(tarea.puntos)],
        ['Fecha de asignación', tarea.fecha_asignacion],
        ['Fecha de entrega', tarea.fecha_entrega],
      ]
    : []

  return (
    <Modal
      open={Boolean(tarea)}
      title="Detalle de la tarea"
      wide
      onClose={onClose}
      testId="tarea-ver-modal"
      footer={
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      {tarea ? (
        <>
          <h3 className="ficha__section-title" style={{ marginTop: 0 }}>
            {tarea.titulo}
          </h3>
          <table className="ficha-table" data-testid="tarea-ver-detalle">
            <tbody>
              {filas.map(([k, v]) => (
                <tr key={k}>
                  <th style={{ width: '34%' }}>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tarea.descripcion ? (
            <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.75rem' }}>{tarea.descripcion}</p>
          ) : null}
          <AdjuntosTarea tareaId={tarea.id} maxArchivos={maxArchivos} maxPesoMB={maxPesoMB} />
        </>
      ) : null}
    </Modal>
  )
}
