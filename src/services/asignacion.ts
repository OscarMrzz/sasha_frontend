import { apiRequest, apiRequestList } from '#/lib/api'

export interface AsignacionCreate {
  maestro_id: string
  curso_id: string
  seccion_id: string
  periodo_academico_id: string
  status?: string
}

export interface AsignacionUpdate {
  maestro_id: string
  curso_id: string
  seccion_id: string
  periodo_academico_id: string
  status: string
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
  return apiRequestList<Asignacion>('/asignacion/')
}

export async function getAsignacion(id: string) {
  return apiRequest<Asignacion>(`/asignacion/${id}`)
}

export async function createAsignacion(body: AsignacionCreate) {
  return apiRequest<Asignacion>('/asignacion/', { method: 'POST', body })
}

export async function updateAsignacion(id: string, body: AsignacionUpdate) {
  return apiRequest<Asignacion>(`/asignacion/${id}`, { method: 'PUT', body })
}

export async function deleteAsignacion(id: string) {
  return apiRequest<void>(`/asignacion/${id}`, { method: 'DELETE' })
}
