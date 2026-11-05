import { apiRequest } from '#/lib/api'

export type RolComentario = 'maestro' | 'alumno' | 'responsable' | 'admin' | 'admin_temporal'

export interface ComentarioTarea {
  id: string
  tarea_id: string
  autor_id: string
  autor_nombre: string
  autor_rol: RolComentario
  texto: string
  creado_en: string
  eliminado: boolean
  es_propio: boolean
}

export interface HiloComentarios {
  comentarios: ComentarioTarea[]
  total: number
  no_leidos: number
  silenciado: boolean
  puede_escribir: boolean
}

export interface ChatTareaResumen {
  tarea_id: string
  titulo: string
  clase: string
  seccion: string
  ultimo_mensaje: string
  ultimo_autor: string
  ultimo_en: string
  no_leidos: number
  silenciado: boolean
  fecha_entrega: string
}

export async function getHiloComentarios(tareaId: string) {
  return apiRequest<HiloComentarios>(`/comentarios/tarea/${tareaId}`)
}

export async function enviarComentario(tareaId: string, texto: string) {
  return apiRequest<ComentarioTarea>(`/comentarios/tarea/${tareaId}`, {
    method: 'POST',
    body: { texto },
  })
}

export async function marcarComentariosLeidos(tareaId: string) {
  return apiRequest<{ status: string }>(`/comentarios/tarea/${tareaId}/leido`, { method: 'POST' })
}

export async function borrarComentario(id: string) {
  return apiRequest<void>(`/comentarios/${id}`, { method: 'DELETE' })
}

export async function listarChatsTareas() {
  return apiRequest<ChatTareaResumen[]>('/comentarios/chats')
}

export async function silenciarChatTarea(tareaId: string, silenciado: boolean) {
  return apiRequest<{ status: string; silenciado: boolean }>(
    `/comentarios/tarea/${tareaId}/silencio`,
    { method: 'POST', body: { silenciado } },
  )
}
