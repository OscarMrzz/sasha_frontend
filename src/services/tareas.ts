import { apiRequest } from '#/lib/api'

/** Modo de calificación / revisión. */
export type TareaCriterioModo = 'simple' | 'manual' | 'criterio'

/** @deprecated usar TareaCriterioModo */
export type TareaTipo = TareaCriterioModo

export interface TipoTarea {
  id: string
  codigo: string
  nombre: string
  orden: number
  status: string
}

export interface TareaCreate {
  asignacion_docente_id: string
  plan_estudio_item_id?: string
  parcial_id: string
  titulo: string
  descripcion?: string
  /** Si se omite, el backend usa la fecha de hoy. */
  fecha_asignacion?: string
  fecha_entrega: string
  /** Modo de calificación: simple | manual | criterio */
  tipo: TareaCriterioModo
  tipo_tarea_id: string
  puntos: number
}

export interface Tarea {
  id: string
  asignacion_docente_id: string
  titulo: string
  descripcion?: string | null
  fecha_asignacion: string
  fecha_entrega: string
  tipo: TareaCriterioModo
  tipo_tarea_id?: string
  tipo_tarea_nombre?: string
  parcial_id?: string
  parcial_nombre?: string
  puntos: number
  curso_nombre?: string
  grado_nombre?: string
  seccion_nombre?: string
  modalidad_nombre?: string
}

export interface CalificacionTareaCreate {
  tarea_id: string
  alumno_id: string
  criterio_evaluacion_id?: string | null
  /** Solo tipo manual: puntos escritos a mano (0…máx de la tarea). */
  puntos?: number | null
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

export interface CriterioEvaluacion {
  id: string
  codigo: string
  nombre: string
  descripcion?: string | null
  porcentaje?: number | null
  orden: number
  status: string
}

export interface RevisionAlumno {
  alumno_id: string
  codigo: string
  nombre: string
  entregado: boolean
  puntos?: number
  criterio_evaluacion_id?: string | null
  criterio_nombre?: string | null
}

export interface RevisionPayload {
  tarea: Tarea
  alumnos: RevisionAlumno[]
}

export function labelCriterioModo(tipo: TareaCriterioModo) {
  if (tipo === 'criterio') return 'Con criterio'
  if (tipo === 'manual') return 'Manual'
  return 'Simple'
}

export async function listTareas() {
  return apiRequest<Tarea[]>('/tareas/')
}

export async function createTarea(body: TareaCreate) {
  return apiRequest<Tarea>('/tareas/', { method: 'POST', body })
}

export async function calificarTarea(body: CalificacionTareaCreate) {
  return apiRequest<{ id: string; puntos: number }>('/tareas/calificaciones', {
    method: 'POST',
    body,
  })
}

export async function listTareasByAlumno(alumnoId: string) {
  return apiRequest<TareaAlumnoView[]>(`/tareas/alumno/${alumnoId}`)
}

export async function getTareaRevision(tareaId: string) {
  return apiRequest<RevisionPayload>(`/tareas/revision/${tareaId}`)
}

export async function listCriteriosEvaluacion(all = false) {
  const q = all ? '?all=1' : ''
  return apiRequest<CriterioEvaluacion[]>(`/tareas/criterios${q}`)
}

export async function listTiposTarea(all = false) {
  const q = all ? '?all=1' : ''
  return apiRequest<TipoTarea[]>(`/tareas/tipos${q}`)
}

/** Parciales del periodo (permiso tareas:get; para crear/filtrar tareas). */
export async function listParcialesTarea(periodoAcademicoId: string) {
  const qs = new URLSearchParams({ periodo_academico_id: periodoAcademicoId })
  return apiRequest<
    {
      id: string
      periodo_academico_id: string
      numero: number
      nombre: string
      fecha_inicio: string
      fecha_fin: string
      status: string
    }[]
  >(`/tareas/parciales?${qs}`)
}
