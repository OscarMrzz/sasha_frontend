import { apiRequest } from '#/lib/api'

export interface Grado {
  id: string
  codigo: string
  nombre: string
  orden: number
  status: string
  codigo_sace?: string
  detalles?: string
}

export interface GradoCreate {
  nombre: string
  orden: number
  status: string
  codigo_sace?: string
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
}

export interface SeccionCreate {
  nombre: string
  grado_id: string
  modalidad_id: string
  status: string
  codigo_sace?: string
  detalles?: string
  cupo_maximo?: number
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

export interface Parcial {
  id: string
  periodo_academico_id: string
  numero: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  status: string
}

export interface Periodo {
  id: string
  nombre: string
  anio_lectivo: number
  fecha_inicio: string
  fecha_fin: string
  status: string
  nota_minima: number
  max_clases_reprobadas: number
  recuperaciones_periodo: number
  tope_recuperacion_parcial: number
  tope_recuperacion_periodo: number
}

export interface PeriodoCreate {
  nombre: string
  anio_lectivo: number
  fecha_inicio: string
  fecha_fin: string
  status: string
  nota_minima?: number
  max_clases_reprobadas?: number
  recuperaciones_periodo?: number
  tope_recuperacion_parcial?: number
  tope_recuperacion_periodo?: number
}

export async function listGrados() {
  return apiRequest<Grado[]>('/catalogos/grados')
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
  return apiRequest<Modalidad[]>('/catalogos/modalidades')
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
  return apiRequest<Seccion[]>('/catalogos/secciones')
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
  return apiRequest<Curso[]>('/catalogos/cursos')
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
  return apiRequest<Periodo[]>('/catalogos/periodos')
}

export async function listParciales(periodoAcademicoId: string) {
  return apiRequest<Parcial[]>(
    `/catalogos/periodos/${periodoAcademicoId}/parciales`,
  )
}

export interface ParcialInput {
  periodo_academico_id: string
  numero: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
}

export async function createParcial(body: ParcialInput) {
  return apiRequest<Parcial>(`/catalogos/periodos/${body.periodo_academico_id}/parciales`, {
    method: 'POST',
    body,
  })
}

export async function updateParcial(id: string, body: ParcialInput) {
  return apiRequest<Parcial>(`/catalogos/parciales/${id}`, { method: 'PUT', body })
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
  return apiRequest<ListaItem[]>('/catalogos/alergias')
}

export async function listCondicionesAprendizaje() {
  return apiRequest<ListaItem[]>('/catalogos/condiciones-aprendizaje')
}

export async function listParentescos() {
  return apiRequest<ListaItem[]>('/catalogos/parentescos')
}

export async function listProfesiones() {
  return apiRequest<ListaItem[]>('/catalogos/profesiones')
}
