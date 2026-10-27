import { apiRequest, apiRequestList } from '#/lib/api'

export interface AsistenciaItem {
  alumno_id: string
  asignacion_docente_id: string
  fecha: string
  tipo_asistencia_id?: string
  tipo_codigo?: string
  observaciones?: string
}

export interface Asistencia {
  id: string
  alumno_id: string
  asignacion_docente_id: string
  fecha: string
  tipo_asistencia_id: string
  tipo_codigo?: string
}

export type ModoAsistencia = 'CLASE' | 'SECCION'

export interface AsistenciaMateria {
  asignacion_docente_id: string
  curso_id: string
  curso_nombre: string
  grado_nombre: string
  modalidad_nombre: string
  seccion_id?: string
  seccion_nombre: string
  periodo_academico_id: string
  periodo_nombre: string
  maestro_nombre?: string
  modo_asistencia?: ModoAsistencia
  responsable_nombre?: string
  responsable_code?: string
  es_responsable?: boolean
}

export interface SemanaDia {
  fecha: string
  dia_semana: number
  etiqueta: string
}

export interface SemanaMarca {
  fecha: string
  tipo_codigo?: string | null
  letra: string
  /** La puso una excusa registrada: no se puede cambiar. */
  bloqueada?: boolean
  excusa_tipo?: string
  /** Snapshot histórico: maestro que pasó lista. */
  maestro_nombre?: string
  maestro_code?: string
  registrado_por?: string
  registrado_por_code?: string
  mixto?: boolean
}

export interface SemanaAlumno {
  alumno_id: string
  codigo: string
  nombre: string
  marcas: SemanaMarca[]
}

export interface SemanaResponse {
  asignacion_docente_id: string
  curso_nombre: string
  fecha_ref: string
  semana_inicio: string
  semana_fin: string
  dias: SemanaDia[]
  alumnos: SemanaAlumno[]
}

export interface ActorAsistencia {
  codigo: string
  nombre: string
}

export interface AsistenciaSeccion {
  seccion_id: string
  seccion_nombre: string
  grado_nombre: string
  modalidad_nombre: string
  periodo_academico_id: string
  periodo_nombre: string
  alumnos: number
  clases_hoy: number
  modo_asistencia: 'SECCION'
  responsable?: ActorAsistencia
  puede_editar: boolean
  marcas_hoy: number
  estado_hoy: 'pendiente' | 'incompleta' | 'lista' | 'sin_clase'
}

export interface SemanaSeccionDia extends SemanaDia {
  tiene_clases: boolean
  pasado: boolean
  clases: number
  registrado_por?: ActorAsistencia
  maestro_registro?: ActorAsistencia
  registrado_en?: string
}

export interface SemanaSeccionMarca {
  fecha: string
  tipo_codigo?: string | null
  letra: string
  mixto?: boolean
  bloqueada?: boolean
  excusa_tipo?: string
  origen?: string
}

export interface SemanaSeccionAlumno {
  alumno_id: string
  codigo: string
  nombre: string
  marcas: SemanaSeccionMarca[]
}

export interface SemanaSeccionResponse {
  seccion_id: string
  seccion_nombre: string
  grado_nombre: string
  modalidad_nombre: string
  periodo_academico_id: string
  periodo_nombre: string
  fecha_ref: string
  semana_inicio: string
  semana_fin: string
  modo_asistencia: 'SECCION'
  puede_editar: boolean
  responsable?: ActorAsistencia
  dias: SemanaSeccionDia[]
  alumnos: SemanaSeccionAlumno[]
}

export interface InasistenciaResumen {
  alumno_id: string
  codigo: string
  nombre: string
  faltas: number
  excusas: number
  tardes: number
  total_inasistencias: number
}

export interface InasistenciaDetalleItem {
  fecha: string
  dia_semana: string
  tipo_codigo: string
  letra: string
  nombre_tipo: string
  observaciones?: string
  maestro_nombre?: string
  maestro_code?: string
}

export interface InasistenciaDetalleResponse {
  alumno_id: string
  codigo: string
  nombre: string
  items: InasistenciaDetalleItem[]
}

/** Ciclo UI: vacío → A → T → E → F → vacío */
export const LETRA_CYCLE = ['', 'A', 'T', 'E', 'F'] as const

export const LETRA_TO_CODIGO: Record<string, string | null> = {
  '': null,
  A: 'presente',
  T: 'tarde',
  E: 'justificada',
  F: 'injustificada',
}

export const CODIGO_TO_LETRA: Record<string, string> = {
  presente: 'A',
  tarde: 'T',
  justificada: 'E',
  injustificada: 'F',
}

export function nextLetra(actual: string): string {
  const i = LETRA_CYCLE.indexOf(actual as (typeof LETRA_CYCLE)[number])
  const idx = i < 0 ? 0 : i
  return LETRA_CYCLE[(idx + 1) % LETRA_CYCLE.length]
}

/** En modo sección no hay celda vacía: A → T → E → F → A. */
export const LETRA_CYCLE_SECCION = ['A', 'T', 'E', 'F'] as const

export function nextLetraSeccion(actual: string): string {
  const letra = actual || 'A'
  const i = LETRA_CYCLE_SECCION.indexOf(letra as (typeof LETRA_CYCLE_SECCION)[number])
  const idx = i < 0 ? 0 : i
  return LETRA_CYCLE_SECCION[(idx + 1) % LETRA_CYCLE_SECCION.length]
}

export interface CeldaLista {
  alumno_id: string
  fecha: string
  /** '' vacía la celda */
  tipo_codigo: string
}

/** Guarda la lista de una clase de una vez; al guardar el backend avisa a los padres. */
export async function guardarLista(asignacionDocenteId: string, items: CeldaLista[]) {
  return apiRequest<{ guardadas: number }>('/asistencia/', {
    method: 'POST',
    body: { asignacion_docente_id: asignacionDocenteId, items },
  })
}

export async function listMateriasAsistencia() {
  return apiRequestList<AsistenciaMateria>('/asistencia/materias')
}

export async function getSemanaAsistencia(asignacionDocenteId: string, fecha?: string) {
  const qs = new URLSearchParams({ asignacion_docente_id: asignacionDocenteId })
  if (fecha) qs.set('fecha', fecha)
  return apiRequest<SemanaResponse>(`/asistencia/semana?${qs}`)
}

export async function getSeccionesAsistencia() {
  return apiRequest<{ secciones: AsistenciaSeccion[] }>('/asistencia/seccion/mias')
}

export async function getSemanaSeccion(seccionId: string, fecha?: string) {
  const qs = new URLSearchParams({ seccion_id: seccionId })
  if (fecha) qs.set('fecha', fecha)
  return apiRequest<SemanaSeccionResponse>(`/asistencia/seccion/semana?${qs}`)
}

export async function guardarListaSeccion(
  seccionId: string,
  fecha: string,
  items: { alumno_id: string; tipo_codigo: string }[],
) {
  return apiRequest<{
    guardadas: number
    alumnos_guardados: number
    clases_afectadas: number
    bloqueadas: Array<{ alumno_id: string; asignacion_docente_id: string; excusa_tipo: string }>
  }>('/asistencia/seccion/lote', {
    method: 'POST',
    body: { seccion_id: seccionId, fecha, items },
  })
}

export async function putCeldaAsistencia(body: {
  alumno_id: string
  asignacion_docente_id: string
  fecha: string
  tipo_codigo?: string | null
  observaciones?: string
}) {
  const payload = {
    alumno_id: body.alumno_id,
    asignacion_docente_id: body.asignacion_docente_id,
    fecha: body.fecha,
    tipo_codigo: body.tipo_codigo ?? '',
    observaciones: body.observaciones,
  }
  return apiRequest<Asistencia | null>('/asistencia/celda', {
    method: 'PUT',
    body: payload,
  })
}

export async function listInasistencias(asignacionDocenteId: string) {
  const qs = new URLSearchParams({ asignacion_docente_id: asignacionDocenteId })
  return apiRequestList<InasistenciaResumen>(`/asistencia/inasistencias?${qs}`)
}

export async function getInasistenciaDetalle(asignacionDocenteId: string, alumnoId: string) {
  const qs = new URLSearchParams({
    asignacion_docente_id: asignacionDocenteId,
    alumno_id: alumnoId,
  })
  return apiRequest<InasistenciaDetalleResponse>(`/asistencia/inasistencias/detalle?${qs}`)
}

/** Lo que vale la asistencia de la clase en un parcial. `plan_suma + puntos` debería dar 100. */
export interface PuntosAsistenciaParcial {
  parcial_id: string
  numero: number
  etiqueta: string
  fecha_inicio: string
  fecha_fin: string
  puntos: number
  plan_suma: number
}

export async function getPuntosAsistencia(asignacionDocenteId: string) {
  const qs = new URLSearchParams({ asignacion_docente_id: asignacionDocenteId })
  return apiRequestList<PuntosAsistenciaParcial>(`/asistencia/puntos?${qs}`)
}

export async function guardarPuntosAsistencia(
  asignacionDocenteId: string,
  items: { parcial_id: string; puntos: number }[],
) {
  return apiRequestList<PuntosAsistenciaParcial>('/asistencia/puntos', {
    method: 'PUT',
    body: { asignacion_docente_id: asignacionDocenteId, items },
  })
}

export async function downloadAsistenciaPdf(asignacionDocenteId: string, fecha?: string) {
  const qs = new URLSearchParams({ asignacion_docente_id: asignacionDocenteId })
  if (fecha) qs.set('fecha', fecha)
  const res = await apiRequest<Response>(`/asistencia/pdf?${qs}`, { raw: true })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `asistencia-${fecha || 'semana'}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
