import { apiRequest, apiRequestList } from '#/lib/api'

export interface TipoPermiso {
  id: string
  codigo: string
  nombre: string
  status: string
  orden: number
}

export interface TipoPermisoInput {
  nombre: string
  status: string
  orden: number
}

export interface SolicitudPermiso {
  id: string
  alumno_id: string
  alumno_codigo: string
  alumno_nombre: string
  grado: string
  seccion: string
  solicitado_por: string
  solicitado_por_codigo: string
  tipo_solicitud: 'aviso_previo' | 'justificacion'
  fecha_inicio: string
  fecha_fin: string
  detalle: string
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'
  motivo_rechazo: string | null
  adjunto_object_key: string | null
  adjunto_content_type: string | null
  tipos: TipoPermiso[]
  creado_en: string
}

export interface FaltaPermiso {
  fecha: string
  tipo: 'injustificada' | 'tarde'
  asignatura: string
  clases: number
}

export interface CrearPermisoInput {
  alumno_id: string
  fecha_inicio: string
  fecha_fin: string
  detalle: string
  tipos: string[]
  file?: File | null
}

export async function listTiposPermiso(todos = false) {
  return apiRequestList<TipoPermiso>(`/permisos/tipos${todos ? '?todos=1' : ''}`)
}

export async function crearTipoPermiso(body: TipoPermisoInput) {
  return apiRequest<TipoPermiso>('/permisos/tipos', { method: 'POST', body })
}

export async function actualizarTipoPermiso(id: string, body: TipoPermisoInput) {
  return apiRequest<TipoPermiso>(`/permisos/tipos/${id}`, { method: 'PUT', body })
}

export async function desactivarTipoPermiso(id: string) {
  return apiRequest<void>(`/permisos/tipos/${id}`, { method: 'DELETE' })
}

export async function listSolicitudesPermiso(estado = '') {
  return apiRequestList<SolicitudPermiso>(
    `/permisos/solicitudes${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`,
  )
}

export async function aprobarPermiso(id: string) {
  return apiRequest<SolicitudPermiso>(`/permisos/solicitudes/${id}/aprobar`, { method: 'PUT' })
}

export async function rechazarPermiso(id: string, motivo: string) {
  return apiRequest<SolicitudPermiso>(`/permisos/solicitudes/${id}/rechazar`, {
    method: 'PUT',
    body: { motivo },
  })
}

export async function listPermisosHijo(alumnoId: string) {
  return apiRequestList<SolicitudPermiso>(`/permisos/padre?alumno_id=${alumnoId}`)
}

export async function listFaltasHijo(alumnoId: string) {
  return apiRequestList<FaltaPermiso>(`/permisos/padre/faltas?alumno_id=${alumnoId}`)
}

export async function crearPermiso(input: CrearPermisoInput) {
  const fd = new FormData()
  fd.set('alumno_id', input.alumno_id)
  fd.set('fecha_inicio', input.fecha_inicio)
  fd.set('fecha_fin', input.fecha_fin)
  fd.set('detalle', input.detalle)
  for (const id of input.tipos) fd.append('tipos', id)
  if (input.file) fd.set('file', input.file)
  return apiRequest<SolicitudPermiso>('/permisos/padre', { method: 'POST', body: fd })
}

export async function cancelarPermiso(id: string) {
  return apiRequest<void>(`/permisos/padre/${id}/cancelar`, { method: 'POST' })
}
