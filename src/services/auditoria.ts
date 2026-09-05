import { apiRequest } from '#/lib/api'

export interface AuditoriaEvento {
  id: string
  creado_en: string
  actor_codigo?: string
  actor_username?: string
  actor_rol?: string
  accion: string
  recurso: string
  recurso_id?: string
  estado: string
  detalle?: unknown
  ip?: string
  user_agent?: string
}

export interface AuditoriaListFilters {
  actor?: string
  recurso?: string
  accion?: string
  desde?: string
  hasta?: string
  limite?: number
}

export interface AuditoriaListResponse {
  status: string
  total: number
  eventos: AuditoriaEvento[]
}

export async function listAuditoria(filters: AuditoriaListFilters = {}) {
  const qs = new URLSearchParams()
  if (filters.actor) qs.set('actor', filters.actor)
  if (filters.recurso) qs.set('recurso', filters.recurso)
  if (filters.accion) qs.set('accion', filters.accion)
  if (filters.desde) qs.set('desde', filters.desde)
  if (filters.hasta) qs.set('hasta', filters.hasta)
  if (filters.limite !== undefined) qs.set('limite', String(filters.limite))
  const query = qs.toString()
  return apiRequest<AuditoriaListResponse>(`/auditoria/${query ? `?${query}` : ''}`)
}
