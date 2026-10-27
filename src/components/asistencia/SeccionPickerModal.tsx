import { Modal } from '#/components/ui/Modal'
import type { AsistenciaSeccion } from '#/services/asistencia'

const ESTADO_LABEL: Record<AsistenciaSeccion['estado_hoy'], string> = {
  pendiente: 'Pendiente',
  incompleta: 'Incompleta',
  lista: 'Lista',
  sin_clase: 'Sin clase hoy',
}

export function SeccionPickerModal({
  secciones,
  onSelect,
  onClose,
}: {
  secciones: AsistenciaSeccion[]
  onSelect: (seccion: AsistenciaSeccion) => void
  onClose: () => void
}) {
  return (
    <Modal
      open
      title="Pasar asistencia"
      onClose={onClose}
      wide
      footer={
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cancelar
        </button>
      }
    >
      <p className="texto-muted" style={{ marginTop: 0 }}>
        Tienes {secciones.length} secciones a tu cargo. Elige la que vas a pasar lista.
      </p>
      <div style={{ display: 'grid', gap: '0.5rem' }} data-testid="seccion-picker">
        {secciones.map((s) => (
          <button
            key={s.seccion_id}
            type="button"
            data-testid={`seccion-picker-item-${s.seccion_id}`}
            disabled={s.estado_hoy === 'sin_clase'}
            onClick={() => onSelect(s)}
            style={{
              display: 'grid',
              gap: '0.15rem',
              textAlign: 'left',
              padding: '0.75rem',
              border: '1px solid var(--sasha-border, #3a3f4a)',
              borderRadius: 'var(--sasha-radius, 14px)',
              background: 'var(--sasha-bg-raised, #21242b)',
              color: 'inherit',
              cursor: s.estado_hoy === 'sin_clase' ? 'not-allowed' : 'pointer',
              opacity: s.estado_hoy === 'sin_clase' ? 0.6 : 1,
            }}
          >
            <strong>
              {s.grado_nombre} · sec{s.seccion_nombre}
            </strong>
            <span className="texto-muted">{s.modalidad_nombre}</span>
            <span className="texto-muted">
              {s.alumnos} alumnos · {ESTADO_LABEL[s.estado_hoy]}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
