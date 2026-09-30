import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Award, BookOpen, CalendarDays, ChevronRight, ListTodo, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useBovedaImage } from '#/hooks/use-boveda-image'
import { usePortalInicio } from '#/hooks/use-portal'
import { getPagosHijo, listHijos } from '#/services/portal'

type Tile = {
  to: '/hijo/tareas' | '/hijo/horario' | '/hijo/plan' | '/hijo/pagos' | '/alumno/resultados'
  id: string
  label: string
  detalle: string
  icon: ReactNode
  badge?: number
  alerta?: boolean
}

/** Inicio del hijo para el padre: foto, nombre y botones grandes a cada sección. */
export function HijoHub({ alumnoId }: { alumnoId: string }) {
  const { data: inicio } = usePortalInicio()
  const { data: hijos = [] } = useQuery({ queryKey: ['portal-hijos'], queryFn: listHijos })
  const { data: pagos } = useQuery({
    queryKey: ['portal-pagos', alumnoId],
    queryFn: () => getPagosHijo(alumnoId),
  })
  const hijo = hijos.find((h) => h.alumno_id === alumnoId)
  const foto = useBovedaImage(hijo?.path_imagen)
  const nombre = hijo?.nombre || inicio?.alumno?.nombre || 'Alumno'
  const alumno = inicio?.alumno

  const tareasPendientes = (inicio?.clases ?? []).reduce((n, c) => n + c.tareas_pendientes, 0)
  const vencidos = pagos?.vencidos ?? 0

  const tiles: Tile[] = [
    {
      to: '/hijo/tareas',
      id: 'tareas',
      label: 'Tareas',
      detalle: tareasPendientes > 0 ? `${tareasPendientes} para hoy o mañana` : 'Ver todas las tareas',
      icon: <ListTodo size={30} />,
      badge: tareasPendientes,
    },
    {
      to: '/hijo/horario',
      id: 'horario',
      label: 'Horario',
      detalle: 'Clases de cada día',
      icon: <CalendarDays size={30} />,
    },
    {
      to: '/hijo/plan',
      id: 'plan',
      label: 'Plan de estudio',
      detalle: 'Qué verá en cada materia',
      icon: <BookOpen size={30} />,
    },
    {
      to: '/hijo/pagos',
      id: 'pagos',
      label: 'Pagos',
      detalle:
        vencidos > 0
          ? `Debe ${vencidos} ${vencidos === 1 ? 'mes' : 'meses'}`
          : pagos?.proximo
            ? `Próximo: ${pagos.proximo.etiqueta}`
            : 'Mensualidades y recibos',
      icon: <Wallet size={30} />,
      badge: vencidos,
      alerta: vencidos > 0,
    },
    {
      to: '/alumno/resultados',
      id: 'calificaciones',
      label: 'Calificaciones',
      detalle: 'Promedio y notas',
      icon: <Award size={30} />,
    },
  ]

  return (
    <div className="padre-hub">
      <header className="padre-hub__hijo">
        {foto ? (
          <img className="padre-hub__foto" src={foto} alt={`Foto de ${nombre}`} />
        ) : (
          <div className="padre-hub__foto padre-hub__foto--placeholder" aria-hidden="true">
            {nombre.slice(0, 1)}
          </div>
        )}
        <div className="padre-hub__datos">
          <h1 className="padre-hub__nombre" data-testid="alumno-home-title">
            {nombre}
          </h1>
          {alumno ? (
            <p className="padre-hub__meta">
              {alumno.grado} · sección {alumno.seccion}
            </p>
          ) : null}
          {hijo?.user_code ? <p className="padre-hub__meta">N.º de cuenta {hijo.user_code}</p> : null}
        </div>
        <Link to="/responsable" className="btn btn--ghost btn--sm padre-hub__cambiar" data-testid="alumno-cambiar">
          {hijos.length > 1 ? 'Cambiar alumno' : 'Mis alumnos'}
        </Link>
      </header>

      <nav className="app-tiles" aria-label="Secciones" data-testid="padre-tiles">
        {tiles.map((t) => (
          <Link
            key={t.id}
            to={t.to}
            className={`app-tile${t.alerta ? ' app-tile--alerta' : ''}`}
            data-testid={`padre-tile-${t.id}`}
          >
            <span className="app-tile__icono" aria-hidden>
              {t.icon}
            </span>
            <span className="app-tile__texto">
              <span className="app-tile__label">{t.label}</span>
              <span className="app-tile__detalle">{t.detalle}</span>
            </span>
            {t.badge ? (
              <span className="app-tile__badge" aria-label={`${t.badge} pendientes`}>
                {t.badge}
              </span>
            ) : null}
            <ChevronRight size={22} className="app-tile__flecha" aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  )
}
