import { Modal } from '#/components/ui/Modal'
import type { FichaTarea } from '#/services/personas'

type Props = {
  open: boolean
  tareas: FichaTarea[]
  fechaHoy: string
  onClose: () => void
}

function grupoLabel(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Hoy'
  const d = new Date(fecha + 'T12:00:00')
  const h = new Date(hoy + 'T12:00:00')
  const diff = Math.round((d.getTime() - h.getTime()) / 86400000)
  if (diff === 1) return 'Mañana'
  return fecha
}

export function FichaTareasModal({ open, tareas, fechaHoy, onClose }: Props) {
  const groups = new Map<string, FichaTarea[]>()
  for (const t of tareas) {
    const f = t.fecha_entrega.slice(0, 10)
    const list = groups.get(f) ?? []
    list.push(t)
    groups.set(f, list)
  }
  const fechas = [...groups.keys()].sort()

  return (
    <Modal
      open={open}
      title="Tareas"
      onClose={onClose}
      wide
      footer={
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div data-testid="ficha-tareas-modal">
        {fechas.length === 0 ? (
          <p className="texto-muted">Sin tareas pendientes.</p>
        ) : (
          fechas.map((f) => (
            <section key={f} className="ficha__section">
              <h3 className="ficha__section-title">{grupoLabel(f, fechaHoy)}</h3>
              <table className="ficha-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Curso</th>
                    <th>Entrega</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(groups.get(f) ?? []).map((t) => (
                    <tr key={t.tarea_id}>
                      <td>{t.titulo}</td>
                      <td>{t.curso_nombre || '—'}</td>
                      <td>{t.fecha_entrega.slice(0, 10)}</td>
                      <td>
                        <span className="badge">{t.entregado ? 'Entregada' : 'Pendiente'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )}
      </div>
    </Modal>
  )
}
