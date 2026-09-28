import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { listNotificaciones, markNotificacionLeida  } from '#/services/notificaciones'
import type {Notificacion} from '#/services/notificaciones';

function formatFecha(fecha?: string) {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return fecha
  return d.toLocaleString('es-HN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationsBell() {
  const [listOpen, setListOpen] = useState(false)
  const [detalle, setDetalle] = useState<Notificacion | null>(null)
  const [shown, setShown] = useState<Notificacion | null>(null)
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => listNotificaciones(),
    refetchInterval: 60_000,
  })

  const unread = data.filter((n) => !n.leida).length

  useEffect(() => {
    if (detalle) setShown(detalle)
  }, [detalle])

  const openDetalle = async (n: Notificacion) => {
    setDetalle(n)
    if (n.leida) return
    try {
      await markNotificacionLeida(n.id)
      qc.setQueryData<Notificacion[]>(['notificaciones'], (prev) =>
        prev?.map((it) => (it.id === n.id ? { ...it, leida: true } : it)),
      )
      void qc.invalidateQueries({ queryKey: ['notificaciones'] })
    } catch (err) {
      toast.error(userMessageFromError(err))
    }
  }

  return (
    <>
      <button
        type="button"
        className="notif-bell"
        aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : 'Notificaciones'}
        title="Notificaciones"
        data-testid="notifications-bell"
        onClick={() => setListOpen(true)}
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="notif-bell__count" data-testid="notifications-unread">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      <Modal
        open={listOpen}
        title={unread > 0 ? `Notificaciones · ${unread} sin leer` : 'Notificaciones'}
        onClose={() => {
          if (!detalle) setListOpen(false)
        }}
        footer={
          <button type="button" className="btn btn--ghost" onClick={() => setListOpen(false)}>
            Cerrar
          </button>
        }
      >
        {isLoading ? (
          <p className="empty-state">Cargando…</p>
        ) : data.length === 0 ? (
          <p className="empty-state">No tienes notificaciones</p>
        ) : (
          <ul className="notif-list" data-testid="notifications-list">
            {data.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`notif-row${n.leida ? '' : ' notif-row--unread'}`}
                  data-testid="notification-row"
                  onClick={() => void openDetalle(n)}
                >
                  <span
                    className={`notif-dot${n.leida ? ' notif-dot--read' : ''}`}
                    aria-label={n.leida ? 'Leída' : 'No leída'}
                  />
                  <span className="notif-row__body">
                    <span className="notif-row__top">
                      <span className="notif-row__title">{n.titulo}</span>
                      {n.es_banner ? <span className="badge badge--warn">Importante</span> : null}
                    </span>
                    <span className="notif-row__excerpt">{n.mensaje}</span>
                    {n.fecha ? <span className="notif-row__date">{formatFecha(n.fecha)}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={detalle != null}
        title={shown?.titulo ?? 'Notificación'}
        onClose={() => setDetalle(null)}
        footer={
          <button type="button" className="btn btn--primary" onClick={() => setDetalle(null)}>
            Cerrar
          </button>
        }
      >
        {shown ? (
          <div className="notif-detail" data-testid="notification-detail">
            <div className="notif-detail__meta">
              {shown.fecha ? <span>{formatFecha(shown.fecha)}</span> : null}
              {shown.tipo_nombre ? <span className="badge">{shown.tipo_nombre}</span> : null}
              {shown.es_banner ? <span className="badge badge--warn">Importante</span> : null}
            </div>
            <p className="notif-detail__msg">{shown.mensaje}</p>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
