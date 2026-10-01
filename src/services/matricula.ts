import { apiRequest } from '#/lib/api'

export interface MatriculaCreate {
  alumno_id: string
  periodo_academico_id: string
  seccion_id?: string
  grado_id?: string
  modalidad_id?: string
  asignar_seccion_automatica?: boolean
  es_reingreso?: boolean
  tiene_cursos_retrasados?: boolean
  cursos_retrasados?: { curso_id: string; anio_previo: number; anio_actual: number }[]
}

export interface Matricula {
  id: string
  alumno_id: string
  periodo_academico_id: string
  seccion_id: string
  es_reingreso: boolean
  status: string
  alumno_code?: string
  grado_id?: string
  grado_nombre?: string
  grado_orden?: number
}

export interface GradoInfo {
  id: string
  codigo: string
  nombre: string
  orden: number
}

export interface SugerenciaResponse {
  user_code: string
  alumno_id: string
  ultima_matricula?: Matricula
  grado_actual?: GradoInfo
  grado_sugerido?: GradoInfo
  needs_seccion: boolean
  mensaje?: string
}

export interface ReingresoRequest {
  user_code: string
  periodo_academico_id: string
  seccion_id: string
}

export interface LinkResponsableRequest {
  responsable_id: string
  parentesco: string
  es_principal: boolean
}

export interface LinkResponsableResponse {
  matricula_id: string
  alumno_id: string
  responsable_id: string
  parentesco: string
  es_principal: boolean
}

export interface DocumentoRequest {
  object_key: string
  tipo: string
  observaciones?: string
}

export interface DocumentoMatricula {
  id: string
  matricula_id: string
  alumno_id: string
  tipo: string
  object_key: string
  observaciones?: string
  status: string
}

export async function listMatriculas() {
  return apiRequest<Matricula[]>('/matricula/')
}

export async function createMatricula(body: MatriculaCreate) {
  return apiRequest<Matricula>('/matricula/', { method: 'POST', body })
}

export async function getSugerencia(code: string) {
  const qs = new URLSearchParams({ code })
  return apiRequest<SugerenciaResponse>(`/matricula/sugerencia?${qs}`)
}

export async function reingreso(body: ReingresoRequest) {
  return apiRequest<Matricula | SugerenciaResponse>('/matricula/reingreso', { method: 'POST', body })
}

export async function linkResponsable(matriculaId: string, body: LinkResponsableRequest) {
  return apiRequest<LinkResponsableResponse>(`/matricula/${matriculaId}/responsables`, {
    method: 'POST',
    body,
  })
}

export async function addDocumento(matriculaId: string, body: DocumentoRequest) {
  return apiRequest<DocumentoMatricula>(`/matricula/${matriculaId}/documentos`, {
    method: 'POST',
    body,
  })
}
