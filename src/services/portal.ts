import { apiRequest } from '#/lib/api'
import type { Curso } from '#/services/catalogos'
import type { EstadoRecibo, Recibo } from '#/services/pagos'
import type { Plan } from '#/services/planestudio'

export interface PortalHijo {
  alumno_id: string
  nombre: string
  user_code: string
  grado: string
  seccion: string
  parentesco: string
  path_imagen?: string
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
  /** Solo en la lista de todas las tareas (`listTareasHijo`). */
  asignacion_docente_id?: string
  curso_nombre?: string
  id: string
  titulo: string
  descripcion?: string
  fecha_asignacion: string
  fecha_entrega: string
  tipo_tarea_nombre?: string
  puntos_max: number
  estado: 'pendiente' | 'revisada'
  entregado: boolean
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

/** Cambio frente a la nota anterior con nota. Sin valor si no hay con qué comparar. */
export type Tendencia = 'sube' | 'baja' | 'igual'

export interface PortalMateriaParcial {
  asignacion_docente_id: string
  curso: string
  /** Escala 0–100. */
  nota?: number
  puntos?: number
  puntos_max: number
  aprobada: boolean
  tendencia?: Tendencia
  diferencia?: number
}

export interface PortalParcialResumen {
  parcial_id: string
  numero: number
  etiqueta: string
  estado: EstadoParcialNota
  meses_pendientes: string[]
  mensaje?: string
  promedio?: number
  aprobadas: number
  reprobadas: number
  tendencia?: Tendencia
  diferencia?: number
  materias: PortalMateriaParcial[]
  /** Solo en parciales visibles. */
  analisis?: PortalAnalisisParcial
}

export type NivelAnalisis = 'urgente' | 'mejorar' | 'felicitar'

export interface PortalMensajeAnalisis {
  categoria: 'casa' | 'clase' | 'evaluaciones' | 'labor_social' | 'asistencia'
  nivel: NivelAnalisis
  texto: string
}

export interface PortalAnalisisParcial {
  mejorar: PortalMensajeAnalisis[]
  destaca: PortalMensajeAnalisis[]
}

/** Último parcial con nota frente al anterior con nota. */
export interface PortalTendencia {
  estado: 'mejoro' | 'empeoro' | 'igual'
  desde: string
  hasta: string
  anterior: number
  actual: number
  diferencia: number
  suben: number
  bajan: number
}

/** Resultado general: el cuadro sale del promedio de todas las materias con nota visible. */
export interface PortalResumen {
  /** Del más reciente al primero. */
  parciales: PortalParcialResumen[]
  tendencia?: PortalTendencia
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

export function listTareasHijo(alumnoId?: string | null) {
  return apiRequest<PortalTarea[]>(`/portal/tareas${alumnoQs(alumnoId)}`)
}

export interface PortalMesPago {
  anio: number
  mes: number
  etiqueta: string
  monto: number
  fecha_vencimiento: string
  estado: 'pendiente' | 'pagado' | 'mora'
  /** No pagado y ya pasó la fecha límite. */
  vencido: boolean
  /** Estado del recibo más reciente de ese mes. */
  recibo_estado?: EstadoRecibo
}

export interface PortalPagos {
  meses: PortalMesPago[]
  /** Primer mes sin pagar que aún no vence. */
  proximo?: PortalMesPago
  vencidos: number
  monto_vencido: number
  recibos: Recibo[]
}

export function getPagosHijo(alumnoId: string) {
  return apiRequest<PortalPagos>(`/portal/pagos${alumnoQs(alumnoId)}`)
}

export function subirRecibo(alumnoId: string, anio: number, mes: number, file: File) {
  const form = new FormData()
  form.append('file', file)
  form.append('alumno_id', alumnoId)
  form.append('anio', String(anio))
  form.append('mes', String(mes))
  return apiRequest<Recibo>('/portal/recibos', { method: 'POST', body: form })
}
