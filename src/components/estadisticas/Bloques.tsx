import { createContext, useContext } from 'react'
import { Sigma, TrendingDown, TrendingUp } from 'lucide-react'
import { ExtremoCard } from './ExtremoCard'
import { BarrasHorizontales, CajaBigotes } from './Graficas'
import { TileAmpliable } from './TileAmpliable'
import { Anillo } from '#/components/portal/notas-ui'
import {
  coeficienteVariacion,
  CORTES_CV,
  formatoCV,
  NIVEL_ETIQUETA,
  nivelHomogeneidad,
  SIN_CV,
} from '#/helpers/estadisticas-mensajes'
import type { Bloque, BloqueTipo, Dimension } from '#/services/estadisticas'

/** Cómo se nombra el grupo «general»: la institución, o las clases del maestro en sus analíticas. */
export const GeneralPluralContext = createContext('la institución')

const PLURAL: Record<Exclude<Dimension, 'general'>, string> = {
  clase: 'cada clase',
  maestro: 'cada maestro',
  alumno: 'cada alumno',
  curso: 'cada materia',
  grado: 'cada grado',
  seccion: 'cada sección',
  modalidad: 'cada modalidad',
  periodo: 'cada periodo',
  parcial: 'cada parcial',
  mes: 'cada mes',
}

function usePlural(dim: Dimension) {
  const general = useContext(GeneralPluralContext)
  return dim === 'general' ? general : PLURAL[dim]
}

function PromedioTile({
  bloque,
  unidad,
  titulo,
}: {
  bloque: Bloque
  unidad: string
  titulo: string
}) {
  return (
    <TileAmpliable
      titulo={titulo}
      className="analisis-bento__promedio"
      testId="analisis-promedio"
    >
      {() => (
        <div className="notas-bento__promedio-body">
          <div className="notas-bento__anillo-wrap">
            <Anillo valor={bloque.resumen.media_general} />
            <span className="notas-bento__promedio-n">
              {bloque.resumen.media_general}
              {unidad}
            </span>
          </div>
          <p className="analisis-bento__nota">
            {bloque.resumen.n_grupos}{' '}
            {bloque.resumen.n_grupos === 1 ? 'grupo' : 'grupos'} ·{' '}
            {bloque.resumen.n_datos} datos
          </p>
        </div>
      )}
    </TileAmpliable>
  )
}

function DesviacionTile({ bloque }: { bloque: Bloque }) {
  const r = bloque.resumen
  const cv = coeficienteVariacion(r.desviacion, r.media_general, r.n_grupos)
  const h = cv === null ? null : nivelHomogeneidad(cv)
  return (
    <TileAmpliable
      titulo="Desviación y variación"
      icono={<Sigma size={14} aria-hidden />}
      className="analisis-bento__sigma"
      testId="analisis-desviacion"
    >
      {(grande) => (
        <>
          <p className="analisis-bento__cifra">
            σ {r.n_grupos > 1 ? r.desviacion : '—'}
          </p>
          <p className="analisis-bento__cv" data-testid={grande ? undefined : 'analisis-cv'} data-nivel={h?.nivel}>
            <span>
              CV <b>{cv === null ? '—' : formatoCV(cv)}</b>
            </span>
            {h ? (
              <span className={`analisis-bento__badge analisis-bento__badge--${h.nivel}`}>
                {h.etiqueta}
              </span>
            ) : null}
          </p>
          <p className="analisis-bento__nota">{h ? h.comentario : SIN_CV}</p>
          {grande ? (
            <div className="analisis-bento__cv-regla">
              <p className="analisis-bento__nota">
                Coeficiente de Variación = desviación estándar ÷ promedio × 100. Mide qué tan
                parejos son los promedios de los grupos respecto al promedio general.
              </p>
              <table className="analisis-bento__cv-tabla">
                <thead>
                  <tr>
                    <th>CV</th>
                    <th>Lectura</th>
                  </tr>
                </thead>
                <tbody>
                  {CORTES_CV.map((c, i) => {
                    const desde = i === 0 ? 0 : CORTES_CV[i - 1].hasta
                    const rango =
                      c.hasta === Infinity ? `${desde}% o más` : i === 0 ? `Menos de ${c.hasta}%` : `${desde}% a ${c.hasta}%`
                    return (
                      <tr key={c.nivel} aria-current={h?.nivel === c.nivel ? 'true' : undefined}>
                        <td>{rango}</td>
                        <td>
                          <b>{c.etiqueta}.</b> {c.comentario}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </TileAmpliable>
  )
}

/** Grupos fuera de los bigotes de la caja (los puntos atípicos), de un lado. */
function AtipicosTile({
  bloque,
  lado,
  unidad,
  testId,
}: {
  bloque: Bloque
  lado: 'arriba' | 'abajo'
  unidad: string
  testId: string
}) {
  const d = bloque.distribucion
  const lista = bloque.grupos
    .filter((g) =>
      lado === 'arriba' ? g.valor > d.bigote_sup : g.valor < d.bigote_inf,
    )
    .sort((a, b) => (lado === 'arriba' ? b.valor - a.valor : a.valor - b.valor))
  return (
    <TileAmpliable
      titulo={lado === 'arriba' ? 'Atípicos por arriba' : 'Atípicos por abajo'}
      icono={
        lado === 'arriba' ? (
          <TrendingUp size={14} aria-hidden />
        ) : (
          <TrendingDown size={14} aria-hidden />
        )
      }
      className={`analisis-bento__atipicos analisis-bento__atipicos--${lado}`}
      testId={testId}
    >
      {() =>
        lista.length === 0 ? (
          <p className="analisis-bento__vacio">Ninguno</p>
        ) : (
          <ul className="analisis-bento__atipicos-lista">
            {lista.map((g) => (
              <li key={g.id} data-testid={`${testId}-fila`}>
                <span title={g.nombre}>{g.nombre}</span>
                <b>
                  {g.valor}
                  {unidad}
                </b>
              </li>
            ))}
          </ul>
        )
      }
    </TileAmpliable>
  )
}

/** Bento principal: promedio, desviación, extremos, caja y bigotes (de los valores del ranking), atípicos y ranking. */
export function BloquePrincipal({
  bloque,
  dim,
  unidad = '',
  prefijo,
  titulo = 'Promedio general',
}: {
  bloque: Bloque
  dim: Dimension
  unidad?: string
  prefijo: string
  titulo?: string
}) {
  const etiqueta = `Promedio de ${usePlural(dim)}`
  return (
    <div className="mdash__bento analisis-bento">
      <PromedioTile bloque={bloque} unidad={unidad} titulo={titulo} />
      <DesviacionTile bloque={bloque} />
      <ExtremoCard
        extremo={bloque.mas_bajo}
        tipo="bajo"
        unidad={unidad}
        testId={`${prefijo}-bajo`}
      />
      <ExtremoCard
        extremo={bloque.mas_alto}
        tipo="alto"
        unidad={unidad}
        testId={`${prefijo}-alto`}
      />

      <TileAmpliable
        titulo="Distribución (caja y bigotes)"
        className="analisis-bento__caja"
      >
        {(grande) =>
          grande ? (
            <CajaBigotes
              dist={bloque.distribucion}
              etiqueta={etiqueta}
              height={300}
            />
          ) : (
            <CajaBigotes
              dist={bloque.distribucion}
              etiqueta={etiqueta}
              exportKey={`${prefijo}-caja`}
              testId={`${prefijo}-caja`}
            />
          )
        }
      </TileAmpliable>
      <AtipicosTile
        bloque={bloque}
        lado="abajo"
        unidad={unidad}
        testId={`${prefijo}-atipicos-abajo`}
      />
      <AtipicosTile
        bloque={bloque}
        lado="arriba"
        unidad={unidad}
        testId={`${prefijo}-atipicos-arriba`}
      />
      <TileAmpliable titulo="Ranking" className="analisis-bento__lista">
        {(grande) => (
          <BarrasHorizontales
            grupos={bloque.grupos}
            unidad={unidad}
            paginar={{ modo: 'puestos', porPagina: 10 }}
            testId={grande ? undefined : `${prefijo}-barras`}
          />
        )}
      </TileAmpliable>
    </div>
  )
}

/** Mini tarjeta por tipo de tarea. */
export function MiniTipoCard({ bt, dim }: { bt: BloqueTipo; dim: Dimension }) {
  const b = bt.bloque
  const plural = usePlural(dim)
  const alerta = [b.mas_alto, b.mas_bajo].find(
    (e) => e && (e.nivel === 'inusual' || e.nivel === 'muy_atipico'),
  )
  return (
    <TileAmpliable
      titulo={bt.tipo_nombre}
      className="analisis-bento__mini"
      testId={`analisis-mini-${bt.tipo_codigo}`}
    >
      {(grande) => (
        <>
          <CajaBigotes
            dist={b.distribucion}
            etiqueta={`Promedio de ${plural}`}
            height={grande ? 260 : 110}
            compacto={!grande}
          />
          {grande ? null : (
            <span className="analisis-bento__mini-stats">
              <span>
                Prom. <b>{b.resumen.media_general}%</b>
              </span>
              <span>
                σ <b>{b.resumen.n_grupos > 1 ? b.resumen.desviacion : '—'}</b>
              </span>
            </span>
          )}
          {b.mas_bajo ? (
            <span className="analisis-bento__mini-extremo">
              <TrendingDown size={12} aria-hidden /> {b.mas_bajo.nombre} ·{' '}
              {b.mas_bajo.valor}%
            </span>
          ) : null}
          {b.mas_alto ? (
            <span className="analisis-bento__mini-extremo">
              <TrendingUp size={12} aria-hidden /> {b.mas_alto.nombre} ·{' '}
              {b.mas_alto.valor}%
            </span>
          ) : null}
          {alerta ? (
            <span
              className={`analisis-bento__badge analisis-bento__badge--${alerta.nivel}`}
            >
              {NIVEL_ETIQUETA[alerta.nivel]}
            </span>
          ) : null}
        </>
      )}
    </TileAmpliable>
  )
}

/** Sección secundaria (asistencia, cumplimiento): cifras y barras, sin gráficas grandes. */
export function SeccionSobria({
  bloque,
  prefijo,
  titulo,
}: {
  bloque: Bloque
  prefijo: string
  titulo: string
}) {
  return (
    <div className="mdash__bento analisis-bento analisis-bento--sobria">
      <TileAmpliable
        titulo={titulo}
        className="analisis-bento__sobria-cifra"
        testId={`${prefijo}-promedio`}
      >
        {() => (
          <>
            <p className="analisis-bento__cifra">
              {bloque.resumen.media_general}%
            </p>
            <p className="analisis-bento__nota">
              {bloque.resumen.n_datos} datos · σ{' '}
              {bloque.resumen.n_grupos > 1 ? bloque.resumen.desviacion : '—'}
            </p>
          </>
        )}
      </TileAmpliable>
      <ExtremoCard
        extremo={bloque.mas_bajo}
        tipo="bajo"
        unidad="%"
        compacto
        testId={`${prefijo}-bajo`}
      />
      <ExtremoCard
        extremo={bloque.mas_alto}
        tipo="alto"
        unidad="%"
        compacto
        testId={`${prefijo}-alto`}
      />
      <TileAmpliable titulo={titulo} sinTitulo className="analisis-bento__sobria-barras">
        {(grande) => (
          <BarrasHorizontales
            grupos={bloque.grupos}
            unidad="%"
            paginar={{ modo: 'filas', porPagina: 25 }}
            testId={grande ? undefined : `${prefijo}-barras`}
          />
        )}
      </TileAmpliable>
    </div>
  )
}
