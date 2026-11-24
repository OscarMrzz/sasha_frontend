import { apiRequest } from '#/lib/api'

export type TipoRecuperacion = 'parcial' | 'periodo'

export interface ConfigPeriodo {
  nota_minima: number
  max_clases_reprobadas: number
  recuperaciones_periodo: number
  tope_recuperacion_parcial: number
  tope_recuperacion_periodo: number
}

export interface ParcialRecuperacion {
  id: string
  numero: number
  etiqueta: string
  fecha_inicio: string
  fecha_fin: string
  iniciado: boolean
  terminado: boolean
  evaluado: boolean
}

export interface EtapaRecuperacion {
  id: string
  tipo: TipoRecuperacion
  parcial_id: string | null
  numero: number
  etiqueta: string
  disponible: boolean
  mensaje?: string
}

export interface OpcionesRecuperaciones {
  periodo_id: string | null
  periodos: {
    id: string
    nombre: string
    anio_lectivo: number
    status: string
  }[]
  clases: {
    asignacion_docente_id: string
    curso_nombre: string
    grado_nombre: string
    seccion_nombre: string
    maestro_nombre: string
    periodo_academico_id: string
  }[]
}

export type ClaseRecuperacion = OpcionesRecuperaciones['clases'][number]

export interface FilaRecuperacion {
  alumno_id: string
  codigo: string
  nombre: string
  tipo: TipoRecuperacion
  parcial_id: string | null
  numero: number
  etiqueta: string
  nota_original: number
  nota: number
  /** Nota que cuenta después de aplicar la recuperación. */
  cuenta: number
  aprobo: boolean
}

export interface ListaRecuperaciones {
  periodo_id: string
  asignacion_id: string
  curso_nombre: string
  periodo_status: string
  finalizado: boolean
  config: ConfigPeriodo
  parciales: ParcialRecuperacion[]
  ultimo_terminado: boolean
  filas: FilaRecuperacion[]
  etapas: EtapaRecuperacion[]
}

export interface CandidatoRecuperacion {
  alumno_id: string
  codigo: string
  nombre: string
  nota_original: number
  nota: number | null
  recuperaciones_periodo: (number | null)[]
  nota_final: number
}

export interface CandidatosRecuperacion {
  tipo: TipoRecuperacion
  parcial_id?: string
  numero?: number
  etiqueta: string
  nota_minima: number
  tope: number
  finalizado: boolean
  disponible: boolean
  mensaje?: string
  alumnos: CandidatoRecuperacion[]
}

export interface GuardarRecuperaciones {
  asignacion_docente_id: string
  tipo: TipoRecuperacion
  parcial_id?: string
  numero?: number
  items: { alumno_id: string; nota: number | null }[]
}

export function listOpcionesRecuperaciones(periodoId?: string) {
  const qs = periodoId
    ? `?${new URLSearchParams({ periodo_academico_id: periodoId })}`
    : ''
  return apiRequest<OpcionesRecuperaciones>(`/recuperaciones/opciones${qs}`)
}

export function listRecuperaciones(asignacionId: string, periodoId?: string) {
  const qs = new URLSearchParams({ asignacion_docente_id: asignacionId })
  if (periodoId) qs.set('periodo_academico_id', periodoId)
  return apiRequest<ListaRecuperaciones>(`/recuperaciones/?${qs}`)
}

export function getCandidatos(
  asignacionId: string,
  tipo: TipoRecuperacion,
  parcialId?: string,
  numero?: number,
  periodoId?: string,
) {
  const qs = new URLSearchParams({ asignacion_docente_id: asignacionId, tipo })
  if (parcialId) qs.set('parcial_id', parcialId)
  if (numero) qs.set('numero', String(numero))
  if (periodoId) qs.set('periodo_academico_id', periodoId)
  return apiRequest<CandidatosRecuperacion>(`/recuperaciones/candidatos?${qs}`)
}

export function guardarRecuperaciones(body: GuardarRecuperaciones) {
  return apiRequest<CandidatosRecuperacion>('/recuperaciones/', {
    method: 'PUT',
    body,
  })
}

/** Nota que cuenta en una recuperación de parcial: la mayor entre la original y la recuperación topada. */
export function notaParcialEfectiva(
  original: number,
  recuperacion: number | null,
  tope: number,
) {
  if (recuperacion == null) return original
  return (
    Math.round(Math.max(original, Math.min(recuperacion, tope)) * 100) / 100
  )
}

/** Mayor nota entre el promedio anual y las finales registradas, respetando el tope. */
export function notaPeriodoEfectiva(
  original: number,
  recuperaciones: (number | null)[],
  tope: number,
) {
  return (
    Math.round(
      recuperaciones.reduce<number>(
        (mejor, nota) =>
          nota == null ? mejor : Math.max(mejor, Math.min(nota, tope)),
        original,
      ) * 100,
    ) / 100
  )
}
