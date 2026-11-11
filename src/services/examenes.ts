import { apiRequest, apiRequestList } from '#/lib/api'

/** Cabecera de una versión del horario de exámenes (clave periodo + parcial + modalidad). */
export interface ExamenHorario {
  id: string
  periodo_academico_id: string
  periodo_nombre?: string
  parcial_id: string
  parcial_numero?: number
  parcial_nombre?: string
  modalidad_id: string
  modalidad_codigo?: string
  modalidad_nombre?: string
  fecha_inicio: string
  fecha_fin: string
  numero_version: number
  estado: string
  es_activa: boolean
  creado_por_user_id?: string
  creado_por_codigo?: string
  created_at?: string
  updated_at?: string
  total_bloques: number
  total_asignaciones: number
  total_secciones: number
  /** Es el último parcial activo del periodo (examen final). */
  es_final: boolean
}

/** Franja horaria que se repite todos los días del horario. */
export interface ExamenBloque {
  id: string
  orden: number
  hora_inicio: string
  hora_fin: string
}

/** Examen de una sección + curso en una fecha y bloque. */
export interface ExamenAsignacion {
  id: string
  fecha: string
  bloque_id: string
  bloque_orden: number
  hora_inicio: string
  hora_fin: string
  seccion_id: string
  seccion_nombre?: string
  grado_id?: string
  grado_nombre?: string
  modalidad_id?: string
  modalidad_nombre?: string
  curso_id: string
  curso_nombre?: string
  asignacion_docente_id?: string
  maestro_nombre?: string
}

/** Maestro encargado de una sección durante el examen. */
export interface ExamenSupervisor {
  id: string
  maestro_id: string
  maestro_codigo?: string
  maestro_nombre?: string
  seccion_id: string
  seccion_nombre?: string
  grado_id?: string
  grado_nombre?: string
  modalidad_id?: string
  modalidad_nombre?: string
}

/** Horario completo: cabecera, bloques, asignaciones y supervisores. */
export interface ExamenDetalle extends ExamenHorario {
  bloques: ExamenBloque[]
  asignaciones: ExamenAsignacion[]
  supervisores: ExamenSupervisor[]
}

export interface ExamenBloqueInput {
  orden: number
  hora_inicio: string
  hora_fin: string
}

export interface ExamenAsignacionInput {
  fecha: string
  bloque_id?: string
  bloque_orden?: number
  seccion_id: string
  curso_id: string
  asignacion_docente_id?: string | null
}

export interface ExamenSupervisorInput {
  maestro_id: string
  seccion_id: string
}

export interface ExamenCrearRequest {
  periodo_academico_id: string
  parcial_id: string
  modalidad_id: string
  fecha_inicio: string
  fecha_fin: string
  bloques: ExamenBloqueInput[]
  asignaciones: ExamenAsignacionInput[]
  supervisores: ExamenSupervisorInput[]
}

export type ExamenActualizarRequest = ExamenCrearRequest

export interface ExamenFiltros {
  periodo_academico_id?: string
  parcial_id?: string
  modalidad_id?: string
  estado?: string
}

export interface ExamenPeriodoOpcion {
  id: string
  nombre: string
  anio_lectivo: number
  fecha_inicio: string
  fecha_fin: string
  status: string
}

export interface ExamenParcialOpcion {
  id: string
  periodo_academico_id: string
  numero: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  status: string
}

export interface ExamenModalidadOpcion {
  id: string
  codigo: string
  nombre: string
  hora_inicio: string
  hora_fin: string
  status: string
}

export interface ExamenGradoOpcion {
  id: string
  codigo: string
  nombre: string
  orden: number
  status: string
}

export interface ExamenSeccionOpcion {
  id: string
  codigo: string
  nombre: string
  grado_id: string
  grado_nombre: string
  modalidad_id: string
  modalidad_nombre: string
  status: string
}

export interface ExamenCursoOpcion {
  id: string
  codigo: string
  nombre: string
  status: string
}

export interface ExamenAsignacionDocenteOpcion {
  id: string
  periodo_academico_id: string
  maestro_id: string
  maestro_nombre: string
  curso_id: string
  curso_nombre: string
  seccion_id: string
  seccion_nombre: string
  grado_id: string
  grado_nombre: string
  modalidad_id: string
  modalidad_nombre: string
}

export interface ExamenMaestroOpcion {
  id: string
  codigo: string
  nombre: string
}

/** Catálogos que alimentan el wizard y los filtros. */
export interface ExamenOpciones {
  periodos: ExamenPeriodoOpcion[]
  parciales: ExamenParcialOpcion[]
  modalidades: ExamenModalidadOpcion[]
  grados: ExamenGradoOpcion[]
  secciones: ExamenSeccionOpcion[]
  cursos: ExamenCursoOpcion[]
  asignaciones: ExamenAsignacionDocenteOpcion[]
  maestros: ExamenMaestroOpcion[]
}

export interface ExamenBloqueFijoInput {
  fecha: string
  bloque_orden?: number
  bloque_id?: string
  seccion_id: string
  curso_id: string
  asignacion_docente_id?: string | null
}

export interface ExamenPreviewRequest {
  periodo_academico_id: string
  parcial_id: string
  modalidad_id: string
  fecha_inicio: string
  fecha_fin: string
  bloques: ExamenBloqueInput[]
  bloques_fijos: ExamenBloqueFijoInput[]
  semilla?: string
}

export interface ExamenPreviewSlot {
  fecha: string
  bloque_orden: number
  hora_inicio: string
  hora_fin: string
  seccion_id: string
  seccion_nombre?: string
  grado_id?: string
  grado_nombre?: string
  curso_id: string
  curso_nombre?: string
  asignacion_docente_id?: string
  maestro_id?: string
  maestro_nombre?: string
  es_fijo: boolean
}

export interface ExamenPreviewAviso {
  codigo: string
  mensaje: string
}

export interface ExamenPreviewResumen {
  dias: number
  bloques_por_dia: number
  capacidad_por_seccion: number
  secciones: number
  materias_requeridas: number
  colocadas: number
  fijas: number
  sin_colocar: number
  carga_por_fecha: Record<string, number>
}

export interface ExamenPreview {
  semilla: string
  asignaciones: ExamenPreviewSlot[]
  avisos: ExamenPreviewAviso[]
  resumen: ExamenPreviewResumen
}

export interface ExamenReaplicarResult {
  id: string
  numero_version: number
  estado: string
  total_asignaciones: number
}

export interface ExamenDeleteResult {
  estado: string
  archivado: boolean
}

/** Horario publicado de una semana con sus fechas efectivas. */
export interface ExamenSemanaHorario extends ExamenDetalle {
  fechas: string[]
}

/** Vista "Semana" del maestro (`GET /examenes/mios`). */
export interface ExamenMiosResponse {
  periodo_id: string
  periodo_nombre: string
  todas: boolean
  horarios: ExamenSemanaHorario[]
}

/** Alumno con pagos pendientes que bloquean notas (aviso informativo). */
export interface ExamenAlumnoPagoPendiente {
  alumno_id: string
  codigo: string
  nombre: string
  foto?: string
  grado: string
  seccion: string
  meses: string[]
  monto: number
  obligaciones: number
  conceptos?: ExamenConceptoPendiente[]
}

/** Obligación bloqueante impaga de un alumno (mensualidad, matrícula, etc.). */
export interface ExamenConceptoPendiente {
  obligacion_id: string
  tipo_codigo: string
  tipo_nombre: string
  es_mensualidad: boolean
  anio?: number
  mes?: number
  etiqueta: string
  monto: number
  mora_monto: number
  total: number
  fecha_vencimiento: string
  estado: string
}

/** Examen del bloque actual (o el siguiente del día) en la vista "Ahora". */
export interface ExamenAhora {
  examen_asignacion_id: string
  examen_horario_id: string
  parcial_id?: string
  parcial_numero?: number
  parcial_nombre?: string
  es_final: boolean
  fecha: string
  bloque_orden: number
  hora_inicio: string
  hora_fin: string
  seccion_id: string
  seccion_nombre: string
  grado_id?: string
  grado_nombre?: string
  modalidad_id?: string
  modalidad_nombre?: string
  curso_id: string
  curso_nombre: string
  asignacion_docente_id?: string
  maestro_nombre?: string
  supervisores: ExamenSupervisor[]
  alumnos_pagos_pendientes: ExamenAlumnoPagoPendiente[]
}

/** Respuesta de `GET /examenes/ahora`. */
export interface ExamenAhoraResponse {
  fecha: string
  hora: string
  periodo_id: string
  periodo_nombre: string
  examenes: ExamenAhora[]
  siguiente?: ExamenAhora
}

export type EstadoAsistenciaExamen = 'A' | 'T' | 'E' | 'F'

export interface ExamenAsistenciaAlumno {
  alumno_id: string
  codigo: string
  nombre: string
  foto?: string
  grado: string
  seccion: string
  estado: EstadoAsistenciaExamen
}

export interface ExamenAsistenciaResponse {
  examen_asignacion_id: string
  examen_horario_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  seccion_id: string
  seccion_nombre: string
  grado_id?: string
  grado_nombre?: string
  curso_id: string
  curso_nombre: string
  pasada: boolean
  alumnos: ExamenAsistenciaAlumno[]
}

export interface ExamenAsistenciaItem {
  alumno_id: string
  estado: EstadoAsistenciaExamen
}

/** Reporte de un alumno en un examen. */
export interface ExamenReporte {
  id: string
  examen_asignacion_id: string
  examen_horario_id?: string
  alumno_id: string
  codigo: string
  nombre: string
  grado_id?: string
  grado: string
  seccion_id?: string
  seccion: string
  curso_id: string
  curso_nombre: string
  fecha: string
  hora_inicio?: string
  hora_fin?: string
  supervisor: string
  autor_user_id?: string
  autor_codigo: string
  autor_nombre: string
  detalle: string
  created_at?: string
}

export interface ExamenReporteFiltros {
  grado_id?: string
  seccion_id?: string
  curso_id?: string
  fecha?: string
  alumno_id?: string
}

export interface ExamenReporteCrearRequest {
  examen_asignacion_id: string
  alumno_id: string
  detalle?: string
}

export interface ExamenReporteActualizarRequest {
  detalle?: string
}

// =============================================================================
// Portal (alumno y responsable)
// =============================================================================

export interface PortalExamenBloque {
  id: string
  fecha: string
  bloque_orden: number
  hora_inicio: string
  hora_fin: string
  curso_id: string
  curso_nombre: string
}

export interface PortalExamenDia {
  fecha: string
  salida: string
  bloques: PortalExamenBloque[]
}

export interface PortalPagoPendienteExamen {
  obligacion_id: string
  etiqueta: string
  tipo_nombre: string
  monto: number
  fecha_vencimiento: string
}

export interface PortalExamenes {
  activo: boolean
  vigente: boolean
  periodo_id?: string
  periodo?: string
  parcial_id?: string
  parcial?: string
  modalidad_id?: string
  modalidad?: string
  fecha_inicio?: string
  fecha_fin?: string
  examenes: PortalExamenDia[]
  pagos_pendientes: PortalPagoPendienteExamen[]
}

function queryString(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value)
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export async function listExamenHorarios(filtros: ExamenFiltros = {}) {
  const suffix = queryString({
    periodo_academico_id: filtros.periodo_academico_id,
    parcial_id: filtros.parcial_id,
    modalidad_id: filtros.modalidad_id,
    estado: filtros.estado,
  })
  return apiRequestList<ExamenHorario>(`/examenes/${suffix}`)
}

export async function getExamenHorario(id: string) {
  return apiRequest<ExamenDetalle>(`/examenes/${id}`)
}

export async function createExamenHorario(body: ExamenCrearRequest) {
  return apiRequest<ExamenDetalle>('/examenes/', { method: 'POST', body })
}

export async function updateExamenHorario(id: string, body: ExamenActualizarRequest) {
  return apiRequest<ExamenDetalle>(`/examenes/${id}`, { method: 'PUT', body })
}

export async function deleteExamenHorario(id: string) {
  return apiRequest<void>(`/examenes/${id}`, { method: 'DELETE' })
}

export async function getExamenOpciones(periodoId?: string, modalidadId?: string) {
  const suffix = queryString({ periodo_id: periodoId, modalidad_id: modalidadId })
  return apiRequest<ExamenOpciones>(`/examenes/opciones${suffix}`)
}

export async function previewExamenes(body: ExamenPreviewRequest) {
  return apiRequest<ExamenPreview>('/examenes/preview', { method: 'POST', body })
}

export async function reaplicarExamenes(id: string) {
  return apiRequest<ExamenReaplicarResult>(`/examenes/${id}/reaplicar`, { method: 'POST' })
}

export async function publicarExamenes(id: string) {
  return apiRequest<ExamenDetalle>(`/examenes/${id}/publicar`, { method: 'POST' })
}

export async function setExamenActiva(id: string, activa: boolean) {
  return apiRequest<ExamenDetalle>(`/examenes/${id}/activa`, {
    method: 'PUT',
    body: { activa },
  })
}

// =============================================================================
// Maestro
// =============================================================================

/** Semana de exámenes del maestro. Por defecto solo sus secciones supervisadas. */
export async function getMisExamenes(todas = false, periodoId?: string) {
  const qs = new URLSearchParams()
  if (todas) qs.set('todas', '1')
  if (periodoId) qs.set('periodo_id', periodoId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return apiRequest<ExamenMiosResponse>(`/examenes/mios${suffix}`)
}

export async function getExamenesSupervisionSemana(periodoId?: string) {
  return apiRequest<ExamenMiosResponse>(`/examenes/supervision/semana${queryString({ periodo_id: periodoId })}`)
}

export async function getExamenesSupervisionAhora(
  params: { fecha?: string; hora?: string; periodoId?: string } = {},
) {
  return apiRequest<ExamenAhoraResponse>(`/examenes/supervision/ahora${queryString({
    fecha: params.fecha, hora: params.hora, periodo_id: params.periodoId,
  })}`)
}

/** Examen(es) del bloque actual de las secciones que supervisa el maestro. */
export async function getExamenesAhora(
  params: { fecha?: string; hora?: string; periodoId?: string } = {},
) {
  const suffix = queryString({
    fecha: params.fecha,
    hora: params.hora,
    periodo_id: params.periodoId,
  })
  return apiRequest<ExamenAhoraResponse>(`/examenes/ahora${suffix}`)
}

/** Alumnos con mora de todos los grados y secciones (vista informativa). */
export async function getExamenesMorosos(periodoId?: string, final?: boolean) {
  const suffix = queryString({
    periodo_id: periodoId,
    final: final ? '1' : undefined,
  })
  return apiRequestList<ExamenAlumnoPagoPendiente>(`/examenes/morosos${suffix}`)
}

/** Lista A/T/E/F de un examen (solo el maestro supervisor de la sección). */
export async function getExamenAsistencia(asignacionId: string) {
  return apiRequest<ExamenAsistenciaResponse>(
    `/examenes/${encodeURIComponent(asignacionId)}/asistencia`,
  )
}

/** Guarda o corrige la lista A/T/E/F del examen. */
export async function guardarExamenAsistencia(
  asignacionId: string,
  items: ExamenAsistenciaItem[],
) {
  return apiRequest<ExamenAsistenciaResponse>(
    `/examenes/${encodeURIComponent(asignacionId)}/asistencia`,
    { method: 'PUT', body: { items } },
  )
}

export async function listExamenReportes(filtros: ExamenReporteFiltros = {}) {
  const suffix = queryString({
    grado_id: filtros.grado_id,
    seccion_id: filtros.seccion_id,
    curso_id: filtros.curso_id,
    fecha: filtros.fecha,
    alumno_id: filtros.alumno_id,
  })
  return apiRequestList<ExamenReporte>(`/examenes/reportes${suffix}`)
}

export async function crearExamenReporte(body: ExamenReporteCrearRequest) {
  return apiRequest<ExamenReporte>('/examenes/reportes', { method: 'POST', body })
}

export async function actualizarExamenReporte(
  id: string,
  body: ExamenReporteActualizarRequest,
) {
  return apiRequest<ExamenReporte>(`/examenes/reportes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
  })
}

export async function eliminarExamenReporte(id: string) {
  return apiRequest<void>(`/examenes/reportes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Portal (alumno y responsable)
// =============================================================================

/** Horario de exámenes publicado/activo que cubre la fecha actual. */
export function getPortalExamenes(alumnoId?: string | null, proximo = true) {
  const qs = queryString({
    alumno_id: alumnoId ?? undefined,
    proximo: proximo ? '1' : undefined,
  })
  return apiRequest<PortalExamenes>(`/portal/examenes${qs}`)
}
