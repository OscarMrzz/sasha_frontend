import { apiRequest } from '#/lib/api'

export interface Notificacion {
  id: string
  titulo: string
  mensaje: string
  status: string
  tipo_codigo?: string
  tipo_nombre?: string
  fecha?: string
  es_banner?: boolean
  leida: boolean
}

export interface NotificacionSegmento {
  tipo_segmento: string
  valor_numerico?: number
  grado_id?: string
  seccion_id?: string
  modalidad_id?: string
}

export interface NotificacionCreate {
  tipo_notificacion_id?: string
  tipo_codigo?: string
  titulo: string
  mensaje: string
  vigencia_inicio?: string
  vigencia_fin?: string
  intervalo_dias?: number
  role_names?: string[]
  segmentos?: NotificacionSegmento[]
}

export interface ListNotificacionesFilters {
  grado_id?: string
  seccion_id?: string
}

export async function listNotificaciones(filters: ListNotificacionesFilters = {}) {
  const qs = new URLSearchParams()
  if (filters.grado_id) qs.set('grado_id', filters.grado_id)
  if (filters.seccion_id) qs.set('seccion_id', filters.seccion_id)
  const query = qs.toString()
  return apiRequest<Notificacion[]>(`/notificaciones/${query ? `?${query}` : ''}`)
}

export async function createNotificacion(body: NotificacionCreate) {
  return apiRequest<Notificacion>('/notificaciones/', { method: 'POST', body })
}

export async function markNotificacionLeida(id: string) {
  return apiRequest<{ status: string; id: string }>(`/notificaciones/${id}/leer`, { method: 'POST' })
}
