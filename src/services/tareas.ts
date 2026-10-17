import { apiRequest, apiRequestList } from '#/lib/api'
import { descargarArchivo } from '#/lib/descargas'

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

/** Una fila por clase (asignación docente) del periodo activo. */
export interface ClaseResumen {
  asignacion_docente_id: string
  curso_nombre: string
  grado_nombre: string
  seccion_nombre: string
  modalidad_nombre: string
  maestro_id: string
  maestro_nombre: string
  tareas_total: number
  tareas_semana: number
  alumnos_total: number
}

/** `revisada`: el maestro calificó al menos a un alumno. */
export interface TareaDetalle extends Tarea {
  alumnos_total: number
  entregados: number
  revisada: boolean
}

export interface ClaseTareas {
  clase: ClaseResumen
  tareas: TareaDetalle[]
}

export async function listClasesTareas() {
  return apiRequestList<ClaseResumen>('/tareas/clases')
}

export async function getClaseTareas(asignacionId: string) {
  return apiRequest<ClaseTareas>(`/tareas/clases/${asignacionId}`)
}

export async function listTareas() {
  return apiRequestList<Tarea>('/tareas/')
}

export async function createTarea(body: TareaCreate) {
  return apiRequest<Tarea>('/tareas/', { method: 'POST', body })
}

export async function updateTarea(id: string, body: TareaCreate) {
  return apiRequest<Tarea>(`/tareas/${id}`, { method: 'PUT', body })
}

export async function deleteTarea(id: string) {
  return apiRequest<void>(`/tareas/${id}`, { method: 'DELETE' })
}

export async function calificarTarea(body: CalificacionTareaCreate) {
  return apiRequest<{ id: string; puntos: number }>('/tareas/calificaciones', {
    method: 'POST',
    body,
  })
}

export async function listTareasByAlumno(alumnoId: string) {
  return apiRequestList<TareaAlumnoView>(`/tareas/alumno/${alumnoId}`)
}

export async function getTareaRevision(tareaId: string) {
  return apiRequest<RevisionPayload>(`/tareas/revision/${tareaId}`)
}

export async function listCriteriosEvaluacion(all = false) {
  const q = all ? '?all=1' : ''
  return apiRequestList<CriterioEvaluacion>(`/tareas/criterios${q}`)
}

export async function listTiposTarea(all = false) {
  const q = all ? '?all=1' : ''
  return apiRequestList<TipoTarea>(`/tareas/tipos${q}`)
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

// -----------------------------------------------------------------------------
// Adjuntos de tarea (documentos/fotos). El binario se lee por el endpoint
// `.../archivo` con la sesión activa; la fila solo trae metadatos.
// -----------------------------------------------------------------------------

export interface TareaAdjunto {
  id: string
  tarea_id?: string
  nombre_original: string
  content_type: string
  size_bytes: number
  expira_at?: string
  created_at?: string
}

export function listAdjuntos(tareaId: string) {
  return apiRequestList<TareaAdjunto>(`/tareas/${encodeURIComponent(tareaId)}/adjuntos`)
}

export function subirAdjunto(tareaId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiRequest<TareaAdjunto>(`/tareas/${encodeURIComponent(tareaId)}/adjuntos`, {
    method: 'POST',
    body: form,
  })
}

export function deleteAdjunto(tareaId: string, adjuntoId: string) {
  return apiRequest<void>(
    `/tareas/${encodeURIComponent(tareaId)}/adjuntos/${encodeURIComponent(adjuntoId)}`,
    { method: 'DELETE' },
  )
}

/** Ruta del binario de un adjunto staff (para `useArchivoAutenticado`). */
export function adjuntoArchivoPath(tareaId: string, adjuntoId: string) {
  return `/tareas/${encodeURIComponent(tareaId)}/adjuntos/${encodeURIComponent(adjuntoId)}/archivo`
}

/** Descarga el binario del adjunto con su nombre original. */
export function descargarAdjunto(tareaId: string, adjunto: TareaAdjunto) {
  return descargarArchivo(adjuntoArchivoPath(tareaId, adjunto.id), adjunto.nombre_original)
}
