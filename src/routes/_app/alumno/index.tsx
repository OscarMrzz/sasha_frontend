import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { Award, BookOpen, CalendarDays, ChevronRight, ListTodo } from 'lucide-react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AvisoBanner } from '#/components/layout/AvisoBanner'
import { HijoHub } from '#/components/portal/padre/HijoHub'
import { useMiFoto } from '#/hooks/use-mi-foto'
import { usePortal, usePortalInicio } from '#/hooks/use-portal'
import { writePortalClase } from '#/lib/portal-context'

export const Route = createFileRoute('/_app/alumno/')({
  component: AlumnoHomePage,
})

type Tile = {
  to: '/alumno/tareas' | '/alumno/clases' | '/alumno/horario' | '/alumno/resultados'
  id: string
  label: string
  detalle: string
  icon: ReactNode
  badge?: number
}

/** Inicio del alumno estilo app: bienvenida + botones grandes a cada sección. */
function AlumnoHomePage() {
  const { portal, responsable, alumnoId } = usePortal()
  const { data, isLoading, isError } = usePortalInicio()
  const foto = useMiFoto()

  useEffect(() => {
    writePortalClase(null)
  }, [])

  if (!portal) {
    return (
      <div className="empty-state" role="alert">
        Esta pantalla es solo para alumnos y responsables.
      </div>
    )
  }
  if (responsable && !alumnoId) return <Navigate to="/responsable" replace />
  if (responsable && alumnoId) {
    return (
      <div className="maestro-hub" data-testid="alumno-home">
        <HijoHub alumnoId={alumnoId} />
      </div>
    )
  }

  const alumno = data?.alumno
  const pendientes = (data?.clases ?? []).reduce((n, c) => n + c.tareas_pendientes, 0)
  const primerNombre = (alumno?.nombre ?? '').split(' ')[0]

  const tiles: Tile[] = [
    {
      to: '/alumno/tareas',
      id: 'tareas',
      label: 'Tareas',
      detalle: pendientes > 0 ? `${pendientes} para hoy o mañana` : 'Todas mis tareas',
      icon: <ListTodo size={30} />,
      badge: pendientes,
    },
    {
      to: '/alumno/clases',
      id: 'clases',
      label: 'Clases',
      detalle: `${data?.clases.length ?? 0} materia${(data?.clases.length ?? 0) === 1 ? '' : 's'}`,
      icon: <BookOpen size={30} />,
    },
    {
      to: '/alumno/horario',
      id: 'horario',
      label: 'Horario',
      detalle: 'Mi semana de clases',
      icon: <CalendarDays size={30} />,
    },
    {
      to: '/alumno/resultados',
      id: 'notas',
      label: 'Notas',
      detalle: 'Promedio y calificaciones',
      icon: <Award size={30} />,
    },
  ]

  return (
    <div className="padre-hub" data-testid="alumno-home">
      <AvisoBanner />

      <header className="padre-hub__hijo">
        {foto ? (
          <img className="padre-hub__foto" src={foto} alt={`Foto de ${alumno?.nombre ?? 'alumno'}`} />
        ) : (
          <div className="padre-hub__foto padre-hub__foto--placeholder" aria-hidden="true">
            {(primerNombre || 'A').slice(0, 1)}
          </div>
        )}
        <div className="padre-hub__datos">
          <h1 className="padre-hub__nombre" data-testid="alumno-home-title">
            {primerNombre ? `¡Hola, ${primerNombre}!` : 'Mi inicio'}
          </h1>
          {alumno ? (
            <p className="padre-hub__meta">
              {alumno.grado} · sección {alumno.seccion}
            </p>
          ) : null}
          {alumno ? (
            <p className="padre-hub__meta">
              {alumno.modalidad} · {alumno.periodo}
            </p>
          ) : null}
        </div>
      </header>

      {isLoading ? (
        <div className="empty-state">Cargando…</div>
      ) : isError || !data ? (
        <div className="empty-state" data-testid="alumno-home-error">
          No se pudo cargar el inicio.
        </div>
      ) : !alumno ? (
        <div className="empty-state" data-testid="alumno-home-sin-matricula">
          {data.mensaje || 'Sin matrícula activa'}
        </div>
      ) : (
        <nav className="app-tiles" aria-label="Secciones" data-testid="alumno-tiles">
          {tiles.map((t) => (
            <Link key={t.id} to={t.to} className="app-tile" data-testid={`alumno-tile-${t.id}`}>
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
      )}
    </div>
  )
}
