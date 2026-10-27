import { apiRequest, apiRequestList } from '#/lib/api'

export interface Grado {
  id: string
  codigo: string
  nombre: string
  orden: number
  status: string
  codigo_sace?: string
  /** Programa académico SACE del grado/plan de estudios. */
  modalidad_sace?: string
  detalles?: string
}

export interface GradoCreate {
  nombre: string
  orden: number
  status: string
  codigo_sace?: string
  /** Programa académico SACE del grado/plan de estudios. */
  modalidad_sace?: string
  detalles?: string
}

export interface Modalidad {
  id: string
  codigo: string
  nombre: string
  hora_inicio: string
  hora_fin: string
  status: string
  detalles?: string
  duracion_hora_clase_minutos: number
  duracion_periodo_meses: number
  cantidad_parciales_por_periodo: number
  duracion_parcial_dias?: number
  duracion_recreo_minutos: number
  cantidad_recreos: number
}

export interface ModalidadCreate {
  nombre: string
  hora_inicio: string
  hora_fin: string
  status: string
  dias: number[]
  detalles?: string
  duracion_hora_clase_minutos: number
  duracion_periodo_meses: number
  cantidad_parciales_por_periodo: number
  duracion_parcial_dias?: number
  duracion_recreo_minutos: number
  cantidad_recreos: number
}

export type ModoAsistencia = 'CLASE' | 'SECCION'

export interface Seccion {
  id: string
  codigo: string
  nombre: string
  grado_id: string
  modalidad_id: string
  status: string
  codigo_sace?: string
  detalles?: string
  cupo_maximo?: number
  modo_asistencia?: ModoAsistencia
  maestro_responsable_id?: string | null
  maestro_responsable_nombre?: string | null
  maestro_responsable_code?: string | null
}

export interface SeccionCreate {
  nombre: string
  grado_id: string
  modalidad_id: string
  status: string
  codigo_sace?: string
  detalles?: string
  cupo_maximo?: number
  modo_asistencia?: ModoAsistencia
  maestro_responsable_id?: string | null
}

export interface CursoTextoItem {
  id?: string
  texto: string
  orden: number
}

export interface CursoRecurso {
  id?: string
  tipo: string
  texto: string
  orden: number
}

export interface CursoBibliografia {
  id?: string
  tipo: string
  autor?: string
  titulo: string
  editorial?: string
  anio?: number
  url?: string
  orden: number
}

export interface Curso {
  id: string
  codigo: string
  nombre: string
  horas_semana_minimas: number
  status: string
  codigo_sace?: string
  detalles?: string
  carrera?: string
  unidades_academicas?: number
  horas_teoricas_semana?: number
  horas_practicas_semana?: number
  horas_totales_periodo?: number
  objetivo_general?: string
  prerrequisitos?: CursoTextoItem[]
  objetivos_especificos?: CursoTextoItem[]
  competencias?: CursoTextoItem[]
  estrategias?: CursoTextoItem[]
  actividades_evaluacion?: CursoTextoItem[]
  recursos?: CursoRecurso[]
  bibliografia?: CursoBibliografia[]
}

export interface CursoCreate {
  nombre: string
  horas_semana_minimas: number
  status: string
  codigo_sace?: string
  detalles?: string
  carrera?: string
  unidades_academicas?: number
  horas_teoricas_semana?: number
  horas_practicas_semana?: number
  horas_totales_periodo?: number
  objetivo_general?: string
  prerrequisitos?: CursoTextoItem[]
  objetivos_especificos?: CursoTextoItem[]
  competencias?: CursoTextoItem[]
  estrategias?: CursoTextoItem[]
  actividades_evaluacion?: CursoTextoItem[]
  recursos?: CursoRecurso[]
  bibliografia?: CursoBibliografia[]
}

/** Parcial dentro de un periodo. `nombre` lo autogenera el backend a partir del `numero` ("I parcial"). */
export interface Parcial {
  id: string
  periodo_academico_id: string
  numero: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  nota_maxima: number
  status: string
}

/** Parcial tal como lo envía el formulario (sin `nombre`; el backend lo deriva del `numero`). */
export interface ParcialForm {
  numero: number
  fecha_inicio: string
  fecha_fin: string
  nota_maxima: number
}

export interface Periodo {
  id: string
  nombre: string
  anio_lectivo: number
  /** Derivada del primer parcial (solo lectura en UI). */
  fecha_inicio: string
  /** Derivada del último parcial (solo lectura en UI). */
  fecha_fin: string
  status: string
  /** = "Mínima aprobación". */
  nota_minima: number
  /** = "Honor al mérito". */
  honor_merito: number
  /** = "Excelencia". */
  excelencia: number
  max_clases_reprobadas: number
  recuperaciones_periodo: number
  tope_recuperacion_parcial: number
  tope_recuperacion_periodo: number
  /** Máximo de adjuntos por tarea (default 3 en backend). */
  max_archivos_tarea: number
  /** Peso máximo por adjunto en MB (default 20 en backend). */
  max_peso_archivo_mb: number
  contrato_matricula_id?: string | null
  contrato_matricula_titulo?: string | null
  parciales: Parcial[]
}

export interface PeriodoCreate {
  nombre: string
  anio_lectivo: number
  status: string
  /** = "Mínima aprobación". */
  nota_minima?: number
  /** = "Honor al mérito". */
  honor_merito?: number
  /** = "Excelencia". */
  excelencia?: number
  max_clases_reprobadas?: number
  recuperaciones_periodo?: number
  tope_recuperacion_parcial?: number
  tope_recuperacion_periodo?: number
  /** Máximo de adjuntos por tarea. */
  max_archivos_tarea?: number
  /** Peso máximo por adjunto en MB. */
  max_peso_archivo_mb?: number
  contrato_matricula_id?: string | null
  /** Arreglo anidado obligatorio (>= 1). Las fechas del periodo se derivan de aquí. */
  parciales: ParcialForm[]
}

/** Contrato de matrícula del periodo, en solo lectura (`GET /catalogos/periodos/{id}/contrato`). */
export interface ContratoPeriodo {
  titulo: string
  archivo_nombre: string
  archivo_mime: string
}

export async function listGrados() {
  return apiRequestList<Grado>('/catalogos/grados')
}

export async function createGrado(body: GradoCreate) {
  return apiRequest<Grado>('/catalogos/grados', { method: 'POST', body })
}

export async function updateGrado(id: string, body: GradoCreate) {
  return apiRequest<Grado>(`/catalogos/grados/${id}`, { method: 'PUT', body })
}

export async function deleteGrado(id: string) {
  return apiRequest<{ message: string }>(`/catalogos/grados/${id}`, { method: 'DELETE' })
}

export async function listModalidades() {
  return apiRequestList<Modalidad>('/catalogos/modalidades')
}

export async function createModalidad(body: ModalidadCreate) {
  return apiRequest<Modalidad>('/catalogos/modalidades', { method: 'POST', body })
}

export async function updateModalidad(id: string, body: ModalidadCreate) {
  return apiRequest<Modalidad>(`/catalogos/modalidades/${id}`, { method: 'PUT', body })
}

export async function deleteModalidad(id: string) {
  return apiRequest<{ message: string }>(`/catalogos/modalidades/${id}`, { method: 'DELETE' })
}

export async function listSecciones() {
  return apiRequestList<Seccion>('/catalogos/secciones')
}

export async function createSeccion(body: SeccionCreate) {
  return apiRequest<Seccion>('/catalogos/secciones', { method: 'POST', body })
}

export async function updateSeccion(id: string, body: SeccionCreate) {
  return apiRequest<Seccion>(`/catalogos/secciones/${id}`, { method: 'PUT', body })
}

export async function deleteSeccion(id: string) {
  return apiRequest<{ message: string }>(`/catalogos/secciones/${id}`, { method: 'DELETE' })
}

export async function listCursos() {
  return apiRequestList<Curso>('/catalogos/cursos')
}

export async function getCurso(id: string) {
  return apiRequest<Curso>(`/catalogos/cursos/${id}`)
}

export async function createCurso(body: CursoCreate) {
  return apiRequest<Curso>('/catalogos/cursos', { method: 'POST', body })
}

export async function updateCurso(id: string, body: CursoCreate) {
  return apiRequest<Curso>(`/catalogos/cursos/${id}`, { method: 'PUT', body })
}

export async function deleteCurso(id: string) {
  return apiRequest<{ message: string }>(`/catalogos/cursos/${id}`, { method: 'DELETE' })
}

export async function listPeriodos() {
  return apiRequestList<Periodo>('/catalogos/periodos')
}

/** Contrato de matrícula asociado al periodo (`404` si el periodo no tiene contrato). */
export async function getContratoPeriodo(periodoId: string) {
  return apiRequest<ContratoPeriodo>(
    `/catalogos/periodos/${encodeURIComponent(periodoId)}/contrato`,
  )
}

/** Descarga el binario del contrato del periodo (`raw` → `Blob`), con la sesión activa. */
export async function getContratoPeriodoArchivo(periodoId: string) {
  const res = await apiRequest<Response>(
    `/catalogos/periodos/${encodeURIComponent(periodoId)}/contrato/archivo`,
    { raw: true },
  )
  return res.blob()
}

export async function listParciales(periodoAcademicoId: string) {
  return apiRequestList<Parcial>(
    `/catalogos/periodos/${periodoAcademicoId}/parciales`,
  )
}

export async function createPeriodo(body: PeriodoCreate) {
  return apiRequest<Periodo>('/catalogos/periodos', { method: 'POST', body })
}

export async function updatePeriodo(id: string, body: PeriodoCreate) {
  return apiRequest<Periodo>(`/catalogos/periodos/${id}`, { method: 'PUT', body })
}

export async function deletePeriodo(id: string) {
  return apiRequest<{ message: string }>(`/catalogos/periodos/${id}`, { method: 'DELETE' })
}

export interface ListaItem {
  id: string
  nombre: string
}

export async function listAlergias() {
  return apiRequestList<ListaItem>('/catalogos/alergias')
}

export async function listCondicionesAprendizaje() {
  return apiRequestList<ListaItem>('/catalogos/condiciones-aprendizaje')
}

export async function listParentescos() {
  return apiRequestList<ListaItem>('/catalogos/parentescos')
}

export async function listProfesiones() {
  return apiRequestList<ListaItem>('/catalogos/profesiones')
}
