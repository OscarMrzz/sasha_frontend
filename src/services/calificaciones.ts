import { apiRequest } from '#/lib/api'

export interface LiberacionCreate {
  periodo_academico_id: string
  parcial_id?: string
  grado_id?: string
  seccion_id?: string
  modalidad_id?: string
  alcance?: string
  liberado_por_user_id: string
}

export interface CalificacionUpsert {
  alumno_id: string
  matricula_id: string
  curso_id: string
  parcial_id: string
  puntos: number[]
  promedio?: number
  indicador_nivel?: string
}

export interface CalificacionUpsertResponse {
  id: string
  alumno_id: string
  curso_id: string
  parcial_id: string
  promedio: number
  indicador_nivel: string
  warning_mora: boolean
  mensaje?: string
}

export interface NotaView {
  alumno_id: string
  curso_id?: string
  parcial_id?: string
  promedio?: number
  indicador_nivel?: string
  liberado: boolean
  bloqueado_mora?: boolean
  mensaje?: string
}

export interface ParcialColumna {
  id: string
  numero: number
  nombre: string
  etiqueta: string
}

export interface NotaClaseRow {
  alumno_id: string
  codigo: string
  nombre: string
  /** Puntos por parcial, alineados con `ClaseNotasResponse.parciales`. null = sin nota en ese parcial. */
  puntos_parcial: (number | null)[]
  total?: number
  /** Promedio 0–100 sobre parciales ya evaluados en la clase. */
  promedio?: number
  indicador?: string
  etiqueta: string
}

export interface ClaseNotasResponse {
  parciales: ParcialColumna[]
  filas: NotaClaseRow[]
}

export async function upsertCalificacion(body: CalificacionUpsert, method: 'POST' | 'PUT' = 'POST') {
  return apiRequest<CalificacionUpsertResponse>(`/calificaciones/upsert`, { method, body })
}

export async function liberarCalificaciones(body: LiberacionCreate) {
  return apiRequest<{ id: string }>('/calificaciones/liberacion', { method: 'POST', body })
}

export async function getNotas(alumnoId: string, periodoAcademicoId: string) {
  const qs = new URLSearchParams({
    alumno_id: alumnoId,
    periodo_academico_id: periodoAcademicoId,
  })
  return apiRequest<NotaView[]>(`/calificaciones/notas?${qs}`)
}

export async function listNotasClase(asignacionDocenteId: string, parcialId?: string) {
  const qs = new URLSearchParams({ asignacion_docente_id: asignacionDocenteId })
  if (parcialId) qs.set('parcial_id', parcialId)
  return apiRequest<ClaseNotasResponse>(`/calificaciones/clase?${qs}`)
}
