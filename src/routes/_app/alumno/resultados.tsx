import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  Clock,
  Lightbulb,
  Lock,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Anillo, CUADRO, claseNivelNota } from '#/components/portal/notas-ui'
import { usePortal } from '#/hooks/use-portal'
import { getResumenCalificaciones } from '#/services/portal'
import type { PortalMensajeAnalisis, PortalParcialResumen, PortalResumen, Tendencia } from '#/services/portal'

export const Route = createFileRoute('/_app/alumno/resultados')({
  component: ResultadosPage,
})

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI']

function nombreParcial(numero: number) {
  return `${ROMANOS[numero - 1] ?? numero} parcial`
}

function puntos(n: number) {
  return `${Math.abs(n)} ${Math.abs(n) === 1 ? 'punto' : 'puntos'}`
}

/** Flecha verde si subió, roja si bajó; nada si quedó igual o no hay con qué comparar. */
function Flecha({ tendencia, diferencia }: { tendencia?: Tendencia; diferencia?: number }) {
  if (diferencia == null || (tendencia !== 'sube' && tendencia !== 'baja')) {
    return <span className="nota-flecha nota-flecha--nada" aria-hidden />
  }
  const sube = tendencia === 'sube'
  const Icon = sube ? ArrowUp : ArrowDown
  return (
    <span
      className={`nota-flecha nota-flecha--${tendencia}`}
      title={`${sube ? 'Subió' : 'Bajó'} ${puntos(diferencia)}`}
      aria-label={`${sube ? 'Subió' : 'Bajó'} ${puntos(diferencia)}`}
      data-tendencia={tendencia}
    >
      <Icon size={16} strokeWidth={2.6} aria-hidden />
      {Math.abs(diferencia)}
    </span>
  )
}

function Termometro({ nota, aprobada }: { nota: number; aprobada: boolean }) {
  return (
    <div className="nota-termometro" role="presentation">
      <div
        className={`nota-termometro__fill${aprobada ? '' : ' nota-termometro__fill--reprobada'}`}
        style={{ width: `${Math.max(0, Math.min(100, nota))}%` }}
      />
    </div>
  )
}

function TendenciaCard({ data }: { data: PortalResumen }) {
  const t = data.tendencia
  if (!t) {
    return (
      <section className="mdash__tile resultado-tendencia" data-testid="resultado-tendencia" data-estado="sin">
        <h2 className="mdash__tile-title">¿Cómo va?</h2>
        <p className="notas-bento__vacio">Aún no hay dos parciales con nota para comparar.</p>
      </section>
    )
  }
  const numero = (etiqueta: string) => data.parciales.find((p) => p.etiqueta === etiqueta)?.numero
  const desde = numero(t.desde)
  const hasta = numero(t.hasta)
  const cfg = {
    mejoro: { titulo: 'Mejoró', Icon: TrendingUp, signo: '+' },
    empeoro: { titulo: 'Bajó su promedio', Icon: TrendingDown, signo: '−' },
    igual: { titulo: 'Se mantuvo', Icon: Minus, signo: '' },
  }[t.estado]
  return (
    <section
      className={`mdash__tile resultado-tendencia resultado-tendencia--${t.estado}`}
      data-testid="resultado-tendencia"
      data-estado={t.estado}
    >
      <h2 className="mdash__tile-title">¿Cómo va?</h2>
      <div className="resultado-tendencia__cuerpo">
        <cfg.Icon size={40} aria-hidden />
        <div>
          <p className="resultado-tendencia__titulo">{cfg.titulo}</p>
          <p className="notas-bento__nota">
            Pasó de <strong>{t.anterior}</strong> en el {desde ? nombreParcial(desde) : t.desde} a{' '}
            <strong>{t.actual}</strong> en el {hasta ? nombreParcial(hasta) : t.hasta}
            {t.diferencia !== 0 ? ` (${cfg.signo}${Math.abs(t.diferencia)})` : ''}.
          </p>
          {t.suben + t.bajan > 0 ? (
            <p className="notas-bento__nota">
              {t.suben} {t.suben === 1 ? 'materia subió' : 'materias subieron'} · {t.bajan}{' '}
              {t.bajan === 1 ? 'bajó' : 'bajaron'}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

const TITULO_CATEGORIA: Record<PortalMensajeAnalisis['categoria'], string> = {
  casa: 'Tareas en casa',
  clase: 'Trabajo en clase',
  evaluaciones: 'Exámenes y pruebas',
  labor_social: 'Labor social',
  asistencia: 'Asistencia',
}

function AnalisisCard({
  tipo,
  titulo,
  mensajes,
  testId,
}: {
  tipo: 'mejorar' | 'destaca'
  titulo: string
  mensajes: PortalMensajeAnalisis[]
  testId: string
}) {
  const Icono = tipo === 'mejorar' ? Lightbulb : Award
  return (
    <div className={`analisis-card analisis-card--${tipo}`} data-testid={testId}>
      <h3 className="analisis-card__titulo">
        <Icono size={18} aria-hidden /> {titulo}
      </h3>
      {mensajes.length === 0 ? (
        <p className="analisis-card__vacio">Sin observaciones en este parcial.</p>
      ) : (
        <ul className="analisis-card__lista">
          {mensajes.map((m) => (
            <li
              key={m.categoria}
              className={`analisis-msg analisis-msg--${m.nivel}`}
              data-nivel={m.nivel}
              data-categoria={m.categoria}
            >
              <h4 className="analisis-msg__titulo">
                {m.nivel === 'urgente' ? (
                  <AlertTriangle size={16} aria-hidden className="analisis-msg__icono" />
                ) : null}
                {TITULO_CATEGORIA[m.categoria]}
              </h4>
              <p className="analisis-msg__texto">{m.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ParcialBloque({ p }: { p: PortalParcialResumen }) {
  return (
    <section className="mdash__tile parcial-bloque" data-testid={`resultado-parcial-${p.numero}`} data-estado={p.estado}>
      <header className="parcial-bloque__head">
        <div>
          <h2 className="parcial-bloque__titulo">{nombreParcial(p.numero)}</h2>
          {p.estado === 'visible' && p.promedio != null ? (
            <p className="parcial-bloque__sub">
              {p.aprobadas} {p.aprobadas === 1 ? 'aprobada' : 'aprobadas'} · {p.reprobadas}{' '}
              {p.reprobadas === 1 ? 'reprobada' : 'reprobadas'}
            </p>
          ) : null}
        </div>
        {p.promedio != null ? (
          <div className="parcial-bloque__promedio" data-testid={`resultado-parcial-${p.numero}-promedio`}>
            <span className="parcial-bloque__promedio-label">Promedio</span>
            <span className="parcial-bloque__promedio-n">{p.promedio}</span>
            <Flecha tendencia={p.tendencia} diferencia={p.diferencia} />
          </div>
        ) : null}
      </header>

      {p.estado === 'bloqueado_pago' ? (
        <p className="parcial-bloque__aviso">
          <Lock size={18} aria-hidden /> {p.mensaje ?? 'Calificación pendiente de habilitar.'}
        </p>
      ) : p.promedio == null ? (
        <p className="parcial-bloque__aviso">
          <Clock size={18} aria-hidden /> Aún no hay notas en este parcial.
        </p>
      ) : (
        <ul className="parcial-bloque__materias">
          {[...p.materias.filter((m) => m.nota != null), ...p.materias.filter((m) => m.nota == null)].map((m) => (
            <li
              key={m.asignacion_docente_id}
              className="parcial-bloque__materia"
              data-testid={`resultado-parcial-${p.numero}-materia-${m.asignacion_docente_id}`}
            >
              <span className="parcial-bloque__curso">{m.curso}</span>
              {m.nota != null ? (
                <>
                  <Termometro nota={m.nota} aprobada={m.aprobada} />
                  <span className="parcial-bloque__nota">{m.nota}</span>
                  <Flecha tendencia={m.tendencia} diferencia={m.diferencia} />
                </>
              ) : (
                <>
                  <div className="nota-termometro" role="presentation" />
                  <span className="parcial-bloque__nota parcial-bloque__nota--sin">Sin nota</span>
                  <span className="nota-flecha nota-flecha--nada" aria-hidden />
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {p.estado === 'visible' && p.analisis ? (
        <div className="analisis-grid">
          <AnalisisCard
            tipo="mejorar"
            titulo="Oportunidades de mejora"
            mensajes={p.analisis.mejorar}
            testId={`resultado-parcial-${p.numero}-mejorar`}
          />
          <AnalisisCard
            tipo="destaca"
            titulo="En qué destaca"
            mensajes={p.analisis.destaca}
            testId={`resultado-parcial-${p.numero}-destaca`}
          />
        </div>
      ) : null}
    </section>
  )
}

function Resultados({ data }: { data: PortalResumen }) {
  const cuadro = data.indicador ? CUADRO[data.indicador] : undefined
  const liberados = data.parciales.filter((p) => p.estado !== 'no_liberado')
  const pendientes = data.parciales.filter((p) => p.estado === 'no_liberado')
  return (
    <>
      <div className="mdash__bento notas-bento">
        <section className="mdash__tile resultado-bento__promedio" data-testid="resultado-promedio">
          <h2 className="mdash__tile-title">Promedio general</h2>
          <div className="notas-bento__promedio-body" style={{ flexDirection: 'column' }}>
            <div className={`notas-bento__anillo-wrap ${claseNivelNota(data.indicador)}`}>
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

        <TendenciaCard data={data} />

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
      </div>

      <div className="parciales-lista" data-testid="resultado-parciales">
        {liberados.map((p) => (
          <ParcialBloque key={p.parcial_id} p={p} />
        ))}
        {pendientes.length > 0 ? (
          <p className="parciales-lista__pendientes" data-testid="resultado-parciales-pendientes">
            <Clock size={16} aria-hidden /> Aún no liberados:{' '}
            {pendientes
              .map((p) => p.numero)
              .sort((a, b) => a - b)
              .map(nombreParcial)
              .join(', ')}
            .
          </p>
        ) : null}
      </div>
    </>
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
      {responsable ? (
        <header className="app-topbar">
          <Link to="/alumno" className="app-topbar__atras" data-testid="padre-atras">
            <ArrowLeft size={22} aria-hidden />
            <span>Atrás</span>
          </Link>
          <h1 className="app-topbar__titulo">Calificaciones</h1>
        </header>
      ) : (
        <header className="portal-home__header">
          <h1 className="page-title" style={{ margin: 0 }}>
            Resultado general
          </h1>
          <Link to="/alumno" className="btn btn--ghost btn--sm" data-testid="alumno-resultados-volver">
            <ArrowLeft size={16} aria-hidden /> Volver al inicio
          </Link>
        </header>
      )}
      {isLoading ? (
        <div className="empty-state">Cargando…</div>
      ) : isError || !data ? (
        <div className="empty-state">Hay problemas de conexión.</div>
      ) : data.promedio == null ? (
        <div className="empty-state" data-testid="alumno-resultados-vacio">
          Aún no hay calificaciones liberadas.
        </div>
      ) : (
        <Resultados data={data} />
      )}
    </div>
  )
}
