import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { listNotificaciones, markNotificacionLeida } from '#/services/notificaciones'
import { toast } from 'sonner'
import { userMessageFromError } from '#/lib/api'

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { data = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => listNotificaciones(),
    enabled: open,
  })

  const unread = data.filter((n) => !n.leida).length

  return (
    <>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-label="Notificaciones"
        data-testid="notifications-bell"
        onClick={() => setOpen(true)}
      >
        <Bell size={16} />
        {unread > 0 ? <span className="badge badge--warn">{unread}</span> : null}
      </button>

      {open ? (
        <>
          <div
            className="modal-backdrop"
            style={{ background: 'transparent' }}
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <aside className="notif-drawer" aria-label="Panel de notificaciones">
            <div className="notif-drawer__header">
              <h2 className="modal__title">Notificaciones</h2>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>
            <div className="notif-drawer__list">
              {data.length === 0 ? (
                <p className="empty-state">No hay notificaciones</p>
              ) : (
                data.map((n) => (
                  <article key={n.id} className="notif-item">
                    <strong className="texto-emphasis">{n.titulo}</strong>
                    <p className="texto-muted" style={{ fontSize: '0.8rem', margin: '0.35rem 0' }}>
                      {n.mensaje}
                    </p>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={async () => {
                        try {
                          await markNotificacionLeida(n.id)
                          await qc.invalidateQueries({ queryKey: ['notificaciones'] })
                          toast.success('Marcada como leída')
                        } catch (err) {
                          toast.error(userMessageFromError(err))
                        }
                      }}
                    >
                      Marcar leída
                    </button>
                  </article>
                ))
              )}
            </div>
            <p className="texto-muted" style={{ fontSize: '0.7rem', padding: '0.75rem 1rem' }}>
              Actualización bajo demanda (sin push en tiempo real — ver EVOLUCION.md).
            </p>
          </aside>
        </>
      ) : null}
    </>
  )
}
