import { apiRequest } from '#/lib/api'

export interface TareaCreate {
  asignacion_docente_id: string
  plan_estudio_item_id?: string
  parcial_id?: string
  titulo: string
  descripcion?: string
  fecha_asignacion: string
  fecha_entrega: string
}

export interface Tarea {
  id: string
  asignacion_docente_id: string
  titulo: string
  fecha_asignacion: string
  fecha_entrega: string
}

export interface CalificacionTareaCreate {
  tarea_id: string
  alumno_id: string
  criterio_evaluacion_id: string
  puntos?: number
  entregado: boolean
  observaciones?: string
}

export interface TareaAlumnoView {
  tarea_id: string
  titulo: string
  entregado: boolean
  puntos?: number
  liberado: boolean
}

export async function createTarea(body: TareaCreate) {
  return apiRequest<Tarea>('/tareas/', { method: 'POST', body })
}

export async function calificarTarea(body: CalificacionTareaCreate) {
  return apiRequest<{ id: string }>('/tareas/calificaciones', { method: 'POST', body })
}

export async function listTareasByAlumno(alumnoId: string) {
  return apiRequest<TareaAlumnoView[]>(`/tareas/alumno/${alumnoId}`)
}
