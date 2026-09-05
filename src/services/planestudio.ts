import { apiRequest } from '#/lib/api'

export interface PlanItemCreate {
  parcial_id: string
  titulo: string
  descripcion?: string
  tipo_item?: string
  fecha_inicio: string
  fecha_fin: string
  orden: number
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
}

export interface Plan {
  id: string
  asignacion_docente_id: string
  periodo_academico_id: string
  status: string
  items?: PlanItem[]
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

function vistaQuery(filters: PlanVistaFilters) {
  const qs = new URLSearchParams()
  if (filters.plan_estudio_id) qs.set('plan_estudio_id', filters.plan_estudio_id)
  if (filters.asignacion_docente_id) qs.set('asignacion_docente_id', filters.asignacion_docente_id)
  if (filters.periodo_academico_id) qs.set('periodo_academico_id', filters.periodo_academico_id)
  return qs.toString()
}

export async function createPlan(body: PlanCreate) {
  return apiRequest<Plan>('/planestudio/', { method: 'POST', body })
}

export async function getPlan(id: string) {
  return apiRequest<Plan>(`/planestudio/${id}`)
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
  return apiRequest<PlanItem>(`/planestudio/items/${itemId}`, { method: 'PUT', body })
}
