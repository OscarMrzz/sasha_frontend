import { Modal } from '#/components/ui/Modal'
import { fechaLarga } from '#/services/disciplina'
import type { PortalTarea } from '#/services/portal'

function estadoLabel(e: PortalTarea['estado']) {
  return e === 'revisada' ? 'Revisada' : 'Pendiente'
}

/** Detalle de una tarea para el portal (padre/alumno). No muestra los puntos. */
export function TareaPortalVerModal({ tarea, onClose }: { tarea: PortalTarea | null; onClose: () => void }) {
  const filas: [string, string][] = tarea
    ? [
        ['Clase', tarea.curso_nombre || '—'],
        ['Tipo', tarea.tipo_tarea_nombre || '—'],
        ['Fecha de entrega', fechaLarga(tarea.fecha_entrega)],
        ['Estado', estadoLabel(tarea.estado)],
      ]
    : []

  return (
    <Modal
      open={Boolean(tarea)}
      title="Detalle de la tarea"
      onClose={onClose}
      testId="portal-tarea-ver-modal"
      footer={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Entendido
        </button>
      }
    >
      {tarea ? (
        <>
          <h3 className="ficha__section-title" style={{ marginTop: 0 }}>
            {tarea.titulo}
          </h3>
          <table className="ficha-table" data-testid="portal-tarea-ver-detalle">
            <tbody>
              {filas.map(([k, v]) => (
                <tr key={k}>
                  <th style={{ width: '44%' }}>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4 className="ficha__section-title" style={{ marginTop: '0.85rem', marginBottom: '0.35rem' }}>
            Detalle
          </h4>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{tarea.descripcion || 'Sin detalle.'}</p>
        </>
      ) : null}
    </Modal>
  )
}
