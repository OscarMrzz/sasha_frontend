import { apiRequest, getApiBaseUrl } from '#/lib/api'
import type { Curso } from '#/services/catalogos'

export interface PlanItemCreate {
  parcial_id: string
  titulo: string
  descripcion?: string
  tipo_item?: string
  fecha_inicio: string
  fecha_fin: string
  orden: number
  puntos?: number
  materiales?: string
}

export interface PlanCreate {
  asignacion_docente_id: string
  periodo_academico_id: string
  items: PlanItemCreate[]
}

export interface PlanItem {
  id: string
  plan_estudio_id: string
  parcial_id: string
  titulo: string
  tipo_item: string
  fecha_inicio: string
  fecha_fin: string
  estado_cumplimiento: string
  porcentaje_avance: number
  orden?: number
  descripcion?: string
  puntos?: number
  materiales?: string
}

export interface PlanComentario {
  id: string
  plan_estudio_id: string
  plan_estudio_item_id: string
  autor_user_id: string
  autor_nombre?: string
  texto: string
  resuelto: boolean
  resuelto_en?: string
  created_at?: string
  item_titulo?: string
}

export interface Plan {
  id: string
  asignacion_docente_id: string
  periodo_academico_id: string
  status: string
  estado_aprobacion: string
  es_activo: boolean
  estado_auditoria_maestro: string
  items?: PlanItem[]
  comentarios?: PlanComentario[]
  curso_nombre?: string
  maestro_nombre?: string
  grado_nombre?: string
  modalidad_nombre?: string
  maestro_id?: string
  curso_id?: string
  grado_id?: string
  modalidad_id?: string
  periodo_nombre?: string
  periodo_status?: string
  /** Sílabo completo del curso; solo viene en el detalle (`GET /planestudio/{id}`). */
  curso?: Curso
  tareas_abiertas?: number
  tareas_total?: number
}

export interface PlanItemView {
  id: string
  parcial_id?: string
  titulo: string
  tipo_item: string
  fecha_inicio: string
  fecha_fin: string
  estado_cumplimiento: string
  porcentaje_avance: number
  orden: number
}

export interface VistaDiario {
  vista: string
  plan_estudio_id?: string
  asignacion_docente_id?: string
  periodo_academico_id?: string
  dias: { fecha: string; items: PlanItemView[] }[]
}

export interface VistaGobierno {
  vista: string
  plan_estudio_id?: string
  asignacion_docente_id?: string
  periodo_academico_id?: string
  parciales: { parcial_id: string; items: PlanItemView[] }[]
}

export interface CumplimientoUpdate {
  estado_cumplimiento: string
  porcentaje_avance?: number
}

export interface PlanVistaFilters {
  plan_estudio_id?: string
  asignacion_docente_id?: string
  periodo_academico_id?: string
}

export interface PlanListFilters {
  periodo_academico_id?: string
  curso_id?: string
  maestro_id?: string
  modalidad_id?: string
  grado_id?: string
}

export interface PlanItemUpdate {
  id: string
  titulo: string
  descripcion?: string
  tipo_item?: string
  fecha_inicio: string
  fecha_fin: string
  orden?: number
  estado_cumplimiento?: string
  porcentaje_avance?: number
  puntos?: number
  materiales?: string
  parcial_id?: string
}

function vistaQuery(filters: PlanVistaFilters) {
  const qs = new URLSearchParams()
  if (filters.plan_estudio_id) qs.set('plan_estudio_id', filters.plan_estudio_id)
  if (filters.asignacion_docente_id) qs.set('asignacion_docente_id', filters.asignacion_docente_id)
  if (filters.periodo_academico_id) qs.set('periodo_academico_id', filters.periodo_academico_id)
  return qs.toString()
}

function listQuery(filters: PlanListFilters = {}) {
  const qs = new URLSearchParams()
  if (filters.periodo_academico_id) qs.set('periodo_academico_id', filters.periodo_academico_id)
  if (filters.curso_id) qs.set('curso_id', filters.curso_id)
  if (filters.maestro_id) qs.set('maestro_id', filters.maestro_id)
  if (filters.modalidad_id) qs.set('modalidad_id', filters.modalidad_id)
  if (filters.grado_id) qs.set('grado_id', filters.grado_id)
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export async function listPlanes(filters: PlanListFilters = {}) {
  return apiRequest<Plan[]>(`/planestudio/${listQuery(filters)}`)
}

export async function createPlan(body: PlanCreate) {
  return apiRequest<Plan>('/planestudio/', { method: 'POST', body })
}

export async function getPlan(id: string) {
  return apiRequest<Plan>(`/planestudio/${id}`)
}

export async function updatePlan(id: string, items: PlanItemUpdate[]) {
  return apiRequest<Plan>(`/planestudio/${id}`, { method: 'PUT', body: { items } })
}

export async function activarPlan(id: string) {
  return apiRequest<Plan>(`/planestudio/activar/${id}`, { method: 'PUT', body: {} })
}

export async function setAprobacion(id: string, estado_aprobacion: string) {
  return apiRequest<Plan>(`/planestudio/aprobacion/${id}`, {
    method: 'PUT',
    body: { estado_aprobacion },
  })
}

export async function addAuditoria(planId: string, plan_estudio_item_id: string, texto: string) {
  return apiRequest<PlanComentario>(`/planestudio/auditoria/${planId}`, {
    method: 'POST',
    body: { plan_estudio_item_id, texto },
  })
}

export async function resolverAuditoria(
  comentarioId: string,
  body: { resuelto: boolean; item?: PlanItemUpdate },
) {
  return apiRequest<PlanComentario>(`/planestudio/auditoria/${comentarioId}/resolver`, {
    method: 'PUT',
    body,
  })
}

export async function downloadPlanPdf(id: string) {
  const res = await apiRequest<Response>(`/planestudio/pdf/${id}`, { raw: true })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plan-${id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export async function getVistaDiario(filters: PlanVistaFilters) {
  const qs = vistaQuery(filters)
  return apiRequest<VistaDiario>(`/planestudio/vistas/diario?${qs}`)
}

export async function getVistaGobierno(filters: PlanVistaFilters) {
  const qs = vistaQuery(filters)
  return apiRequest<VistaGobierno>(`/planestudio/vistas/gobierno?${qs}`)
}

export async function updatePlanItem(itemId: string, body: CumplimientoUpdate) {
  return apiRequest<PlanItem>(`/planestudio/cumplimiento/${itemId}`, { method: 'PUT', body })
}

export interface MisParcial {
  id: string
  numero: number
  nombre: string
  /** Los ítems del parcial deben sumar 100 menos esto. */
  puntos_asistencia?: number
}

export interface MisCurso {
  asignacion_docente_id: string
  curso_id: string
  curso_nombre: string
  grado_nombre: string
  modalidad_nombre: string
  seccion_nombre: string
  periodo_academico_id: string
  periodo_nombre: string
  objetivo_general?: string
  parciales: MisParcial[]
}

export interface MisCursosResponse {
  institucion_nombre: string
  cursos: MisCurso[]
}

/** Cursos asignados al maestro autenticado (para crear plan). */
export async function listMisCursos() {
  return apiRequest<MisCursosResponse>('/planestudio/mis-cursos')
}

/** Base URL helper for tests / debugging */
export function planestudioBase() {
  return getApiBaseUrl()
}
