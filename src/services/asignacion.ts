import { apiRequest } from '#/lib/api'

export interface AsignacionCreate {
  maestro_id: string
  curso_id: string
  seccion_id: string
  periodo_academico_id: string
  status?: string
}

export interface Asignacion {
  id: string
  maestro_id: string
  curso_id: string
  seccion_id: string
  periodo_academico_id: string
  status: string
  curso_nombre?: string
  grado_nombre?: string
  modalidad_nombre?: string
  seccion_nombre?: string
}

export async function listAsignaciones() {
  return apiRequest<Asignacion[]>('/asignacion/')
}

export async function createAsignacion(body: AsignacionCreate) {
  return apiRequest<Asignacion>('/asignacion/', { method: 'POST', body })
}
