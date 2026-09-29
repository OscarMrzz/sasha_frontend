import { apiRequest } from '#/lib/api'
import type { Curso } from '#/services/catalogos'
import type { Plan } from '#/services/planestudio'

export interface PortalHijo {
  alumno_id: string
  nombre: string
  user_code: string
  grado: string
  seccion: string
  parentesco: string
}

export interface PortalHorarioSlot {
  asignacion_docente_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  curso_nombre: string
  maestro_nombre: string
}

export interface PortalClase {
  asignacion_docente_id: string
  curso_nombre: string
  maestro_nombre: string
  /** Tareas sin revisar que vencen hoy o mañana (= tareas_hoy + tareas_manana). */
  tareas_pendientes: number
  tareas_hoy: number
  tareas_manana: number
}

export interface PortalRecreo {
  hora_inicio: string
  hora_fin: string
}

export interface PortalInicio {
  alumno: {
    alumno_id: string
    nombre: string
    user_code: string
    grado: string
    seccion: string
    modalidad: string
    periodo: string
  } | null
  horario_semana: PortalHorarioSlot[]
  recreo?: PortalRecreo | null
  clases: PortalClase[]
  mensaje?: string
}

export interface PortalTarea {
  id: string
  titulo: string
  descripcion?: string
  fecha_asignacion: string
  fecha_entrega: string
  tipo_tarea_nombre?: string
  puntos_max: number
  estado: 'pendiente' | 'revisada'
  entregado: boolean
  puntos?: number
  liberado: boolean
}

export type EstadoParcialNota = 'visible' | 'no_liberado' | 'bloqueado_pago'

export interface PortalParcialNota {
  parcial_id: string
  numero: number
  etiqueta: string
  estado: EstadoParcialNota
  puntos?: number | null
  puntos_max: number
  meses_pendientes: string[]
  /** Solo en bloqueado_pago: texto educado con los meses pendientes. */
  mensaje?: string
}

export interface PortalCalificaciones {
  /** Algún parcial liberado (visible u oculto por pago). */
  liberado: boolean
  /** Promedio calculado solo con parciales visibles porque hay alguno oculto por pago. */
  promedio_parcial: boolean
  mensaje?: string
  parciales: PortalParcialNota[]
  total?: number
  promedio?: number
  indicador?: 'excelencia' | 'honor_merito' | 'aprobado' | 'reprobado'
  etiqueta?: string
}

export interface PortalMateriaResumen {
  asignacion_docente_id: string
  curso: string
  /** Sin valor cuando la materia no tiene nota visible. */
  promedio?: number
  total?: number
  aprobada: boolean
}

/** Resultado general: el cuadro sale del promedio de todas las materias con nota visible. */
export interface PortalResumen {
  liberado: boolean
  promedio_parcial: boolean
  promedio?: number
  total_puntos?: number
  indicador?: 'excelencia' | 'honor_merito' | 'aprobado' | 'reprobado'
  etiqueta: string
  aprobadas: number
  reprobadas: number
  sin_nota: number
  mejor?: PortalMateriaResumen
  /** Solo con dos o más materias con nota. */
  peor?: PortalMateriaResumen
  materias: PortalMateriaResumen[]
}

export interface PortalPlanClase {
  curso: Curso
  /** Plan activo del maestro para el periodo; null si aún no hay. */
  plan: Plan | null
  parciales: Array<{ id: string; numero: number; nombre: string }>
}

function alumnoQs(alumnoId?: string | null) {
  return alumnoId ? `?alumno_id=${encodeURIComponent(alumnoId)}` : ''
}

export function listHijos() {
  return apiRequest<PortalHijo[]>('/portal/hijos')
}

export function getPortalInicio(alumnoId?: string | null) {
  return apiRequest<PortalInicio>(`/portal/inicio${alumnoQs(alumnoId)}`)
}

export function listTareasClase(asignacionId: string, alumnoId?: string | null) {
  return apiRequest<PortalTarea[]>(
    `/portal/clases/${encodeURIComponent(asignacionId)}/tareas${alumnoQs(alumnoId)}`,
  )
}

export function getPlanClase(asignacionId: string, alumnoId?: string | null) {
  return apiRequest<PortalPlanClase>(
    `/portal/clases/${encodeURIComponent(asignacionId)}/plan${alumnoQs(alumnoId)}`,
  )
}

export async function downloadPlanClasePdf(asignacionId: string, nombre: string, alumnoId?: string | null) {
  const res = await apiRequest<Response>(
    `/portal/clases/${encodeURIComponent(asignacionId)}/plan/pdf${alumnoQs(alumnoId)}`,
    { raw: true },
  )
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = `plan-${nombre}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export function getCalificacionesClase(asignacionId: string, alumnoId?: string | null) {
  return apiRequest<PortalCalificaciones>(
    `/portal/clases/${encodeURIComponent(asignacionId)}/calificaciones${alumnoQs(alumnoId)}`,
  )
}

export function getResumenCalificaciones(alumnoId?: string | null) {
  return apiRequest<PortalResumen>(`/portal/resumen${alumnoQs(alumnoId)}`)
}
