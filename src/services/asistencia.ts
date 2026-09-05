import { apiRequest } from '#/lib/api'

export interface AsistenciaItem {
  alumno_id: string
  asignacion_docente_id: string
  fecha: string
  tipo_asistencia_id?: string
  tipo_codigo?: string
  observaciones?: string
}

export interface AsistenciaBulk {
  items: AsistenciaItem[]
}

export interface Asistencia {
  id: string
  alumno_id: string
  asignacion_docente_id: string
  fecha: string
  tipo_asistencia_id: string
}

export async function postAsistencia(item: AsistenciaItem) {
  return apiRequest<Asistencia[]>('/asistencia/', { method: 'POST', body: item })
}

export async function postAsistenciaBatch(items: AsistenciaItem[]) {
  return apiRequest<Asistencia[]>('/asistencia/', { method: 'POST', body: { items } })
}
