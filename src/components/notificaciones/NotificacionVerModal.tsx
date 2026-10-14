import { Modal, useDismiss } from '#/components/ui/Modal'
import { fechaCorta } from '#/lib/fechas-padre'
import type { Notificacion } from '#/services/notificaciones'

const TIPO_LABEL: Record<string, string> = {
  unica_temporal: 'Única temporal',
  banner: 'Banner',
  periodica: 'Periódica',
}

const ESTADO_LABEL: Record<string, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
}

export function NotificacionVerModal({
  notificacion,
  onClose,
}: {
  notificacion: Notificacion
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const n = notificacion
  const tipo = n.tipo_nombre ?? (n.tipo_codigo ? (TIPO_LABEL[n.tipo_codigo] ?? n.tipo_codigo) : '—')

  return (
    <Modal
      open={open}
      title={`Notificación · ${n.titulo}`}
      onClose={dismiss}
      wide
      footer={
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          Cerrar
        </button>
      }
    >
      <div data-testid="notif-ver">
        <dl className="ficha__grid">
          <div>
            <dt className="field__label">Título</dt>
            <dd>{n.titulo}</dd>
          </div>
          <div>
            <dt className="field__label">Tipo</dt>
            <dd>{tipo}</dd>
          </div>
          <div>
            <dt className="field__label">Estado</dt>
            <dd>
              <span className="badge">{ESTADO_LABEL[n.status] ?? n.status}</span>
            </dd>
          </div>
          <div>
            <dt className="field__label">Fecha de publicación</dt>
            <dd>{n.fecha ? fechaCorta(n.fecha) : '—'}</dd>
          </div>
          <div>
            <dt className="field__label">Leída</dt>
            <dd>{n.leida ? 'Sí' : 'No'}</dd>
          </div>
          <div>
            <dt className="field__label">Banner</dt>
            <dd>{n.es_banner ? 'Sí' : 'No'}</dd>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <dt className="field__label">Mensaje</dt>
            <dd>{n.mensaje}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  )
}
