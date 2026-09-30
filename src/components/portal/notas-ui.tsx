import { Award, Medal, Star, TrendingDown } from 'lucide-react'

export const CUADRO: Record<string, { titulo: string; detalle: string; Icon: typeof Award }> = {
  excelencia: { titulo: 'Cuadro de excelencia', detalle: 'Excelencia académica', Icon: Star },
  honor_merito: { titulo: 'Cuadro de honor', detalle: 'Honor al mérito', Icon: Medal },
  aprobado: { titulo: 'Aprobado', detalle: 'Va por buen camino', Icon: Award },
  reprobado: { titulo: 'Reprobado', detalle: 'Necesita reforzar', Icon: TrendingDown },
}

/** Clase de color del promedio según el indicador que calcula el backend con los umbrales de configuración:
 * rojo reprobado, amarillo aprobado, verde cuadro de honor o excelencia. */
export function claseNivelNota(indicador?: string) {
  switch (indicador) {
    case 'reprobado':
      return 'nota-nivel--reprobado'
    case 'aprobado':
      return 'nota-nivel--aprobado'
    case 'honor_merito':
    case 'excelencia':
      return 'nota-nivel--destacado'
    default:
      return ''
  }
}

export function Anillo({ valor }: { valor: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, valor))
  return (
    <svg viewBox="0 0 100 100" className="notas-bento__anillo" aria-hidden>
      <circle cx="50" cy="50" r={r} className="notas-bento__anillo-track" />
      <circle
        cx="50"
        cy="50"
        r={r}
        className="notas-bento__anillo-fill"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
      />
    </svg>
  )
}
