import type { Dimension, Extremo, Nivel } from '#/services/estadisticas'

export const DIMENSIONES: { id: Dimension; label: string; plural: string }[] = [
  { id: 'general', label: 'Institución', plural: 'la institución' },
  { id: 'clase', label: 'Clase', plural: 'clases' },
  { id: 'maestro', label: 'Maestro', plural: 'maestros' },
  { id: 'alumno', label: 'Alumno', plural: 'alumnos' },
  { id: 'curso', label: 'Materia', plural: 'materias' },
  { id: 'grado', label: 'Grado', plural: 'grados' },
  { id: 'seccion', label: 'Sección', plural: 'secciones' },
  { id: 'modalidad', label: 'Modalidad', plural: 'modalidades' },
  { id: 'periodo', label: 'Periodo (año)', plural: 'periodos' },
  { id: 'parcial', label: 'Parcial', plural: 'parciales' },
  { id: 'mes', label: 'Mes', plural: 'meses' },
]

export function dimensionLabel(d: Dimension) {
  return DIMENSIONES.find((x) => x.id === d)?.label ?? d
}

export const NIVEL_ETIQUETA: Record<Nivel, string> = {
  normal: 'Dentro de lo normal',
  inusual: 'Inusual',
  muy_atipico: 'Muy atípico',
  insuficiente: 'Pocos datos',
}

export type NivelHomogeneidad = 'muy_homogeneo' | 'homogeneo' | 'moderado' | 'heterogeneo'

/** Cortes del Coeficiente de Variación (en %), de menor a mayor. */
export const CORTES_CV: { hasta: number; nivel: NivelHomogeneidad; etiqueta: string; comentario: string }[] = [
  {
    hasta: 10,
    nivel: 'muy_homogeneo',
    etiqueta: 'Muy homogéneo',
    comentario: 'Los grupos están muy parejos: el promedio los representa muy bien.',
  },
  {
    hasta: 20,
    nivel: 'homogeneo',
    etiqueta: 'Homogéneo',
    comentario: 'Hay poca variación entre los grupos: el promedio es representativo.',
  },
  {
    hasta: 30,
    nivel: 'moderado',
    etiqueta: 'Moderadamente heterogéneo',
    comentario: 'Hay diferencias notables entre los grupos: el promedio debe tomarse con cautela.',
  },
  {
    hasta: Infinity,
    nivel: 'heterogeneo',
    etiqueta: 'Heterogéneo',
    comentario: 'Los grupos están muy dispersos: el promedio no representa bien al conjunto.',
  },
]

/** CV = σ / media × 100. `null` si no hay al menos dos grupos o la media es 0. */
export function coeficienteVariacion(desviacion: number, media: number, nGrupos: number): number | null {
  if (nGrupos < 2 || !media) return null
  return Math.round((Math.abs(desviacion / media) * 100) * 10) / 10
}

export function nivelHomogeneidad(cv: number) {
  return CORTES_CV.find((c) => cv < c.hasta) ?? CORTES_CV[CORTES_CV.length - 1]
}

export const SIN_CV = 'Se necesita más de un grupo para medir la variación.'

export function formatoCV(cv: number) {
  return `${cv.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function sigmas(z: number) {
  return Math.abs(z).toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function efecto(d: number) {
  return Math.abs(d).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function tamanoEfecto(d: number) {
  const a = Math.abs(d)
  if (a >= 0.8) return 'grande'
  if (a >= 0.5) return 'moderado'
  if (a >= 0.2) return 'pequeño'
  return 'mínimo'
}

/** Comentario cuando hay pocos grupos (menos de 8) y el nivel sale de la d de Cohen. */
function mensajeEfecto(e: Extremo, cual: string): string {
  const lado = e.d >= 0 ? 'por encima' : 'por debajo'
  const detalle = `tamaño del efecto de ${efecto(e.d)} (${tamanoEfecto(e.d)}) ${lado} de la mediana de los grupos`
  switch (e.nivel) {
    case 'normal':
      return `A pesar de ser ${cual}, se encuentra dentro de los límites de la normalidad: ${detalle}.`
    case 'inusual':
      return `Su promedio se separa de los demás con un ${detalle}; no se encuentra dentro de los rangos esperados. Conviene revisarlo.`
    case 'muy_atipico':
      return `Su promedio se separa mucho de los demás, con un ${detalle}: está sucediendo algo inusual.`
    default:
      return 'Se necesita más de un grupo con datos para compararlo.'
  }
}

/** Comentario del más alto / más bajo según el nivel que devuelve el backend. */
export function mensajeExtremo(e: Extremo, tipo: 'alto' | 'bajo'): string {
  const cual = tipo === 'alto' ? 'el más alto' : 'el más bajo'
  if (e.metodo === 'd') return mensajeEfecto(e, cual)
  const lado = e.z >= 0 ? 'por encima' : 'por debajo'
  switch (e.nivel) {
    case 'normal':
      return `A pesar de ser ${cual}, se encuentra dentro de los límites de la normalidad (${sigmas(e.z)} desviaciones estándar ${lado} del promedio).`
    case 'inusual':
      return `Está a ${sigmas(e.z)} desviaciones estándar ${lado} del promedio, lo cual no se encuentra dentro de los rangos esperados. Conviene revisarlo.`
    case 'muy_atipico':
      return `Está a ${sigmas(e.z)} desviaciones estándar ${lado} del promedio, muy fuera de los rangos esperados: está sucediendo algo inusual.`
    default:
      return 'No hay datos suficientes para saber si este dato es atípico.'
  }
}
