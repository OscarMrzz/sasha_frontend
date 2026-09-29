import { apiRequest } from '#/lib/api'

export type Dimension =
  | 'general'
  | 'alumno'
  | 'grado'
  | 'seccion'
  | 'modalidad'
  | 'curso'
  | 'maestro'
  | 'periodo'
  | 'parcial'
  | 'mes'

export type Nivel = 'normal' | 'inusual' | 'muy_atipico' | 'insuficiente'

/** z entre grupos (8 o más) o d de Cohen (menos de 8). */
export type Metodo = 'z' | 'd'

export interface OpcionItem {
  id: string
  nombre: string
}

export interface OpcionParcial extends OpcionItem {
  numero: number
  periodo_id: string
}

export interface OpcionSeccion extends OpcionItem {
  grado_id: string
  modalidad_id: string
}

export interface OpcionAlumno extends OpcionItem {
  codigo: string
  seccion_id: string | null
}

export interface OpcionesAnalisis {
  periodos: OpcionItem[]
  parciales: OpcionParcial[]
  grados: OpcionItem[]
  modalidades: OpcionItem[]
  secciones: OpcionSeccion[]
  cursos: OpcionItem[]
  maestros: OpcionItem[]
  alumnos: OpcionAlumno[]
  tipos_tarea: OpcionItem[]
}

/** Arreglo vacío = todos. */
export interface FiltrosAnalisis {
  periodo_ids: string[]
  parcial_ids: string[]
  grado_ids: string[]
  seccion_ids: string[]
  modalidad_ids: string[]
  curso_ids: string[]
  maestro_ids: string[]
  alumno_ids: string[]
  tipo_tarea_ids: string[]
  meses: number[]
  solo_liberadas: boolean
}

export const FILTROS_VACIOS: FiltrosAnalisis = {
  periodo_ids: [],
  parcial_ids: [],
  grado_ids: [],
  seccion_ids: [],
  modalidad_ids: [],
  curso_ids: [],
  maestro_ids: [],
  alumno_ids: [],
  tipo_tarea_ids: [],
  meses: [],
  solo_liberadas: false,
}

export interface Grupo {
  id: string
  nombre: string
  n: number
  valor: number
  mediana: number
  q1: number
  q3: number
  bigote_inf: number
  bigote_sup: number
  min: number
  max: number
  atipicos: number[]
  z: number
  /** d de Cohen frente a la mediana de los grupos (solo con menos de 8 grupos). */
  d: number
  metodo: Metodo
  nivel: Nivel
}

export interface Extremo {
  grupo_id: string
  nombre: string
  valor: number
  z: number
  d: number
  metodo: Metodo
  nivel: Nivel
}

export interface Resumen {
  media_general: number
  media_grupos: number
  desviacion: number
  n_grupos: number
  n_datos: number
}

/** Una sola caja y bigotes con el valor de cada grupo del ranking. `atipicos` sin repetir; `n_atipicos` los cuenta todos. */
export interface Distribucion {
  n: number
  media: number
  mediana: number
  q1: number
  q3: number
  bigote_inf: number
  bigote_sup: number
  min: number
  max: number
  atipicos: number[]
  n_atipicos: number
}

export interface Bloque {
  grupos: Grupo[]
  distribucion: Distribucion
  resumen: Resumen
  mas_alto: Extremo | null
  mas_bajo: Extremo | null
}

export interface BloqueTipo {
  tipo_id: string
  tipo_codigo: string
  tipo_nombre: string
  bloque: Bloque
}

export interface AnalisisResponse {
  agrupar_por: Dimension
  calificaciones: { general: Bloque | null; por_tipo: BloqueTipo[] } | null
  asistencia: Bloque | null
  cumplimiento: Bloque | null
}

export async function getAnalisisOpciones() {
  return apiRequest<OpcionesAnalisis>('/estadisticas/analisis/opciones')
}

export async function postAnalisis(agrupar_por: Dimension, filtros: FiltrosAnalisis) {
  return apiRequest<AnalisisResponse>('/estadisticas/analisis', {
    method: 'POST',
    body: { agrupar_por, filtros },
  })
}
