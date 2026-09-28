import { apiRequest } from '#/lib/api'

export interface Nota {
  id: string
  user_id: string
  asignacion_docente_id?: string
  titulo?: string
  contenido: string
  created_at: string
  updated_at: string
  expires_at: string
}

export async function listNotas(asignacionDocenteId?: string) {
  const qs = new URLSearchParams()
  if (asignacionDocenteId) qs.set('asignacion_docente_id', asignacionDocenteId)
  const q = qs.toString()
  return apiRequest<Nota[]>(`/notas/${q ? `?${q}` : ''}`)
}

export async function createNota(body: {
  asignacion_docente_id?: string
  titulo?: string
  contenido?: string
}) {
  return apiRequest<Nota>('/notas/', { method: 'POST', body })
}

export async function updateNota(
  id: string,
  body: { titulo?: string; contenido?: string },
) {
  return apiRequest<Nota>(`/notas/${id}`, { method: 'PUT', body })
}

export async function deleteNota(id: string) {
  return apiRequest<null>(`/notas/${id}`, { method: 'DELETE' })
}
