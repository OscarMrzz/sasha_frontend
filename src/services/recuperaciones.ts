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
  fecha_fin: string
  terminado: boolean
  evaluado: boolean
}

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
  asignacion_id: string
  curso_nombre: string
  periodo_status: string
  finalizado: boolean
  config: ConfigPeriodo
  parciales: ParcialRecuperacion[]
  ultimo_terminado: boolean
  filas: FilaRecuperacion[]
}

export interface CandidatoRecuperacion {
  alumno_id: string
  codigo: string
  nombre: string
  nota_original: number
  nota: number | null
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

export function listRecuperaciones(asignacionId: string) {
  const qs = new URLSearchParams({ asignacion_docente_id: asignacionId })
  return apiRequest<ListaRecuperaciones>(`/recuperaciones/?${qs}`)
}

export function getCandidatos(asignacionId: string, tipo: TipoRecuperacion, parcialId?: string, numero?: number) {
  const qs = new URLSearchParams({ asignacion_docente_id: asignacionId, tipo })
  if (parcialId) qs.set('parcial_id', parcialId)
  if (numero) qs.set('numero', String(numero))
  return apiRequest<CandidatosRecuperacion>(`/recuperaciones/candidatos?${qs}`)
}

export function guardarRecuperaciones(body: GuardarRecuperaciones) {
  return apiRequest<CandidatosRecuperacion>('/recuperaciones/', { method: 'PUT', body })
}

/** Nota que cuenta en una recuperación de parcial: la mayor entre la original y la recuperación topada. */
export function notaParcialEfectiva(original: number, recuperacion: number | null, tope: number) {
  if (recuperacion == null) return original
  return Math.round(Math.max(original, Math.min(recuperacion, tope)) * 100) / 100
}

/** Nota que cuenta en una recuperación de periodo: si aprueba, la recuperación topada; si no, la mayor. */
export function notaPeriodoEfectiva(original: number, recuperacion: number | null, tope: number, minima: number) {
  if (recuperacion == null) return original
  const r = Math.min(recuperacion, tope)
  return Math.round((r >= minima ? r : Math.max(original, r)) * 100) / 100
}
