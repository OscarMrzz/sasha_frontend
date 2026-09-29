import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, TrendingDown, TrendingUp, XCircle } from 'lucide-react'
import { Anillo, CUADRO } from '#/components/portal/notas-ui'
import { usePortal } from '#/hooks/use-portal'
import { getResumenCalificaciones } from '#/services/portal'
import type { PortalMateriaResumen, PortalResumen } from '#/services/portal'

export const Route = createFileRoute('/_app/alumno/resultados')({
  component: ResultadosPage,
})

function TileMateria({
  titulo,
  materia,
  tipo,
}: {
  titulo: string
  materia?: PortalMateriaResumen
  tipo: 'mejor' | 'peor'
}) {
  const Icon = tipo === 'mejor' ? TrendingUp : TrendingDown
  return (
    <section
      className={`mdash__tile resultado-bento__materia resultado-bento__materia--${tipo}`}
      data-testid={`resultado-${tipo}`}
    >
      <h2 className="mdash__tile-title">{titulo}</h2>
      {materia ? (
        <>
          <p className="resultado-bento__materia-nombre">{materia.curso}</p>
          <p className="notas-bento__nota" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Icon size={14} aria-hidden /> Promedio {materia.promedio}
          </p>
        </>
      ) : (
        <p className="notas-bento__vacio">
          {tipo === 'peor' ? 'Se necesita más de una materia con nota.' : 'Sin nota'}
        </p>
      )}
    </section>
  )
}

function Bento({ data }: { data: PortalResumen }) {
  const cuadro = data.indicador ? CUADRO[data.indicador] : undefined
  return (
    <div className="mdash__bento notas-bento">
      <section className="mdash__tile resultado-bento__promedio" data-testid="resultado-promedio">
        <h2 className="mdash__tile-title">Promedio general</h2>
        <div className="notas-bento__promedio-body" style={{ flexDirection: 'column' }}>
          <div className="notas-bento__anillo-wrap">
            <Anillo valor={data.promedio ?? 0} />
            <span className="notas-bento__promedio-n">{data.promedio}</span>
          </div>
          <p className="notas-bento__nota" style={{ textAlign: 'center' }}>
            Promedio de todas las materias con parciales liberados.
          </p>
          {data.promedio_parcial ? (
            <p className="notas-bento__nota" data-testid="resultado-promedio-parcial" style={{ textAlign: 'center' }}>
              Hay parciales pendientes de habilitar; el promedio puede cambiar.
            </p>
          ) : null}
        </div>
      </section>

      <section
        className={`mdash__tile resultado-bento__cuadro notas-bento__cuadro--${data.indicador ?? 'sin'}`}
        data-testid="resultado-cuadro"
      >
        <h2 className="mdash__tile-title">Cuadro</h2>
        {cuadro ? (
          <div className="notas-bento__cuadro-body">
            <cuadro.Icon size={40} aria-hidden />
            <div>
              <p className="notas-bento__cuadro-titulo">{cuadro.titulo}</p>
              <p className="notas-bento__nota">{cuadro.detalle}</p>
            </div>
          </div>
        ) : (
          <p className="notas-bento__vacio">{data.etiqueta}</p>
        )}
      </section>

      <div className="resultado-bento__stat">
        <section className="mdash__tile" data-testid="resultado-total">
          <h2 className="mdash__tile-title">Total de puntos</h2>
          <p className="notas-bento__puntos">{data.total_puntos ?? '—'}</p>
        </section>
        <section className="mdash__tile" data-testid="resultado-aprobadas">
          <h2 className="mdash__tile-title">
            <CheckCircle2 size={14} aria-hidden /> Aprobadas
          </h2>
          <p className="notas-bento__puntos">{data.aprobadas}</p>
        </section>
        <section className="mdash__tile" data-testid="resultado-reprobadas">
          <h2 className="mdash__tile-title">
            <XCircle size={14} aria-hidden /> Reprobadas
          </h2>
          <p className="notas-bento__puntos">{data.reprobadas}</p>
        </section>
      </div>

      <TileMateria titulo="Mejor materia" materia={data.mejor} tipo="mejor" />
      <TileMateria titulo="Materia a reforzar" materia={data.peor} tipo="peor" />

      <section className="mdash__tile resultado-bento__lista" data-testid="resultado-materias">
        <h2 className="mdash__tile-title">Materias</h2>
        <ul className="resultado-bento__filas">
          {data.materias.map((m) => (
            <li
              key={m.asignacion_docente_id}
              className="resultado-bento__fila"
              data-testid={`resultado-materia-${m.asignacion_docente_id}`}
            >
              <span>{m.curso}</span>
              <div className="resultado-bento__barra">
                {m.promedio != null ? (
                  <div
                    className={`resultado-bento__barra-fill${m.aprobada ? '' : ' resultado-bento__barra-fill--reprobada'}`}
                    style={{ width: `${Math.max(0, Math.min(100, m.promedio))}%` }}
                  />
                ) : null}
              </div>
              <span
                className={`resultado-bento__valor${m.promedio == null ? ' resultado-bento__valor--sin' : ''}`}
              >
                {m.promedio ?? 'Sin nota'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ResultadosPage() {
  const { portal, responsable, alumnoId } = usePortal()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-resumen', alumnoId ?? 'self'],
    queryFn: () => getResumenCalificaciones(alumnoId),
    enabled: portal && (!responsable || Boolean(alumnoId)),
  })

  if (!portal) {
    return (
      <div className="empty-state" role="alert">
        Esta pantalla es solo para alumnos y responsables.
      </div>
    )
  }
  if (responsable && !alumnoId) return <Navigate to="/responsable" replace />

  return (
    <div className="mdash" data-testid="alumno-resultados">
      <header className="portal-home__header">
        <h1 className="page-title" style={{ margin: 0 }}>
          Resultado general
        </h1>
        <Link to="/alumno" className="btn btn--ghost btn--sm" data-testid="alumno-resultados-volver">
          <ArrowLeft size={16} aria-hidden /> Volver al inicio
        </Link>
      </header>
      {isLoading ? (
        <div className="empty-state">Cargando…</div>
      ) : isError || !data ? (
        <div className="empty-state">Hay problemas de conexión.</div>
      ) : data.promedio == null ? (
        <div className="empty-state" data-testid="alumno-resultados-vacio">
          Aún no hay calificaciones liberadas.
        </div>
      ) : (
        <Bento data={data} />
      )}
    </div>
  )
}
