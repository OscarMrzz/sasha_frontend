import { apiRequest, apiRequestList } from '#/lib/api'

export type EstadoActualizacion = 'pendiente' | 'en_desarrollo' | 'etapa_pruebas' | 'finalizado'

export interface ActualizacionSistema {
  id: string
  titulo: string
  descripcion: string
  estado: EstadoActualizacion
  fecha: string
  orden: number
  version: string | null
  modulo: string | null
  created_at: string
  updated_at: string
}

export interface ActualizacionInput {
  titulo: string
  descripcion: string
  estado?: EstadoActualizacion
  fecha?: string
  orden?: number
  version?: string | null
  modulo?: string | null
}

export async function listActualizaciones() {
  return apiRequestList<ActualizacionSistema>('/actualizaciones/')
}

export async function crearActualizacion(body: ActualizacionInput) {
  return apiRequest<ActualizacionSistema>('/actualizaciones/', { method: 'POST', body })
}

export async function actualizarActualizacion(id: string, body: Partial<ActualizacionInput>) {
  return apiRequest<ActualizacionSistema>(`/actualizaciones/${id}`, { method: 'PUT', body })
}

export async function eliminarActualizacion(id: string) {
  return apiRequest<void>(`/actualizaciones/${id}`, { method: 'DELETE' })
}
