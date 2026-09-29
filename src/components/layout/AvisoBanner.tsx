import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Megaphone } from 'lucide-react'
import { listNotificaciones } from '#/services/notificaciones'

function formatFecha(fecha?: string) {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function AvisoBanner() {
  const { data = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => listNotificaciones(),
    refetchInterval: 60_000,
  })
  const banner = data.find((n) => n.es_banner)
  if (!banner) return null
  const fecha = formatFecha(banner.fecha)

  return (
    <section className="aviso-banner" role="region" aria-label="Aviso importante" data-testid="aviso-banner">
      <Megaphone className="aviso-banner__fondo" aria-hidden="true" />
      <div className="aviso-banner__icono" aria-hidden="true">
        <Megaphone size={40} strokeWidth={2.2} />
      </div>
      <div className="aviso-banner__cuerpo">
        <div className="aviso-banner__meta">
          <span className="aviso-banner__etiqueta">Aviso importante</span>
          {fecha ? (
            <span className="aviso-banner__fecha">
              <CalendarDays size={14} aria-hidden="true" /> {fecha}
            </span>
          ) : null}
        </div>
        <h2 className="aviso-banner__titulo" data-testid="aviso-banner-titulo">
          {banner.titulo}
        </h2>
        <p className="aviso-banner__mensaje">{banner.mensaje}</p>
      </div>
    </section>
  )
}
