import { TrendingDown, TrendingUp } from 'lucide-react'
import { TileAmpliable } from './TileAmpliable'
import { NIVEL_ETIQUETA } from '#/helpers/estadisticas-mensajes'
import type { Extremo } from '#/services/estadisticas'

function frase(e: Extremo, tipo: 'alto' | 'bajo') {
  if (e.nivel === 'insuficiente')
    return 'No hay suficientes grupos para comparar.'
  const cual = tipo === 'alto' ? 'mayor' : 'menor'
  return e.nivel === 'normal'
    ? `A pesar de ser el ${cual}, se encuentra dentro de los rangos esperados.`
    : `Siendo el ${cual}, no se encuentra dentro de los rangos esperados.`
}

export function ExtremoCard({
  extremo,
  tipo,
  unidad = '',
  compacto = false,
  testId,
}: {
  extremo: Extremo | null
  tipo: 'alto' | 'bajo'
  unidad?: string
  compacto?: boolean
  testId?: string
}) {
  const Tendencia = tipo === 'alto' ? TrendingUp : TrendingDown
  const titulo = tipo === 'alto' ? 'Dato más alto' : 'Dato más bajo'
  const clase = `analisis-bento__extremo${extremo ? ` analisis-bento__extremo--${extremo.nivel}` : ''}${compacto ? ' analisis-bento__extremo--compacto' : ''}`
  return (
    <TileAmpliable
      titulo={titulo}
      icono={<Tendencia size={14} aria-hidden />}
      className={clase}
      testId={testId}
      nivel={extremo?.nivel}
    >
      {() =>
        extremo ? (
          <>
            <p className="analisis-bento__extremo-nombre">{extremo.nombre}</p>
            <p className="analisis-bento__extremo-valor">
              {extremo.valor}
              {unidad}
            </p>
            <p className="analisis-bento__nivel">
              {NIVEL_ETIQUETA[extremo.nivel]}
            </p>
            <p
              className="analisis-bento__frase"
              data-testid={testId ? `${testId}-frase` : undefined}
            >
              {frase(extremo, tipo)}
            </p>
          </>
        ) : (
          <p className="analisis-bento__vacio">—</p>
        )
      }
    </TileAmpliable>
  )
}
