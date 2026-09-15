import { Modal } from '#/components/ui/Modal'
import type { FichaPlanParcial } from '#/services/personas'

type Props = {
  open: boolean
  parciales: FichaPlanParcial[]
  onClose: () => void
}

export function FichaPlanPeriodoModal({ open, parciales, onClose }: Props) {
  return (
    <Modal
      open={open}
      title="Plan de estudio · periodo"
      onClose={onClose}
      wide
      footer={
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div data-testid="ficha-plan-periodo">
        {parciales.length === 0 ? (
          <p className="texto-muted">Sin plan de estudio registrado para este periodo.</p>
        ) : (
          parciales.map((p) => (
            <section key={p.parcial_id} className="ficha__section">
              <h3 className="ficha__section-title">{p.parcial_nombre || `Parcial ${p.parcial_id.slice(0, 8)}`}</h3>
              <table className="ficha-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Curso</th>
                    <th>Tipo</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Estado</th>
                    <th>Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {p.items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.titulo}</td>
                      <td>{it.curso_nombre || '—'}</td>
                      <td>{it.tipo_item}</td>
                      <td>{it.fecha_inicio.slice(0, 10)}</td>
                      <td>{it.fecha_fin.slice(0, 10)}</td>
                      <td>
                        <span className="badge">{it.estado_cumplimiento}</span>
                      </td>
                      <td>{it.porcentaje_avance}%</td>
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
