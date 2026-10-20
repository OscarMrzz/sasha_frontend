import { apiRequest, apiRequestList } from '#/lib/api'

export interface MatriculaCreate {
  alumno_id: string
  periodo_academico_id: string
  seccion_id?: string
  grado_id?: string
  modalidad_id?: string
  asignar_seccion_automatica?: boolean
  es_reingreso?: boolean
  tiene_cursos_retrasados?: boolean
  cursos_retrasados?: {
    curso_id: string
    anio_previo: number
    anio_actual: number
  }[]
  /** Beca del alumno (solo mensualidades): normal | media | completa | especial. */
  tipo_beca?: string
  /** Monto por mes, requerido solo cuando `tipo_beca` es `especial`. */
  monto_especial?: number
}

/** Montos del grado en un periodo, para mostrar cuánto paga el alumno. */
export interface CostoGrado {
  mensualidad: number
  matricula: number
}

export interface Matricula {
  id: string
  alumno_id: string
  periodo_academico_id: string
  seccion_id: string
  es_reingreso: boolean
  status: string
  alumno_code?: string
  alumno_username?: string
  grado_id?: string
  grado_nombre?: string
  grado_orden?: number
  /** Beca del alumno (solo mensualidades): normal | media | completa | especial. */
  tipo_beca?: string
  /** Monto por mes, presente solo cuando `tipo_beca` es `especial`. */
  monto_especial?: number
  /** Estado del alumno (ACTIVE/INACTIVE), independiente del estado de la matrícula. */
  alumno_status?: string
  dado_de_baja?: boolean
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
  /** Resultado del último periodo, solo si ya está finalizado. */
  resultado?: {
    periodo_id: string
    periodo_nombre: string
    anio_lectivo: number
    aprueba: boolean
    reprobadas: number
    mensaje: string
  }
  retrasadas: { curso_id: string; curso: string; final: number }[]
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

export async function listMatriculas(opts?: { incluirInactivos?: boolean }) {
  const qs = opts?.incluirInactivos ? '?incluir_inactivos=true' : ''
  return apiRequestList<Matricula>(`/matricula/${qs}`)
}

export async function createMatricula(body: MatriculaCreate) {
  return apiRequest<Matricula>('/matricula/', { method: 'POST', body })
}

/** Montos (mensualidad y matrícula) del grado en el periodo. Requiere `matricula:get`. */
export async function getCostoGrado(periodoId: string, gradoId: string) {
  const qs = new URLSearchParams({ periodo_id: periodoId, grado_id: gradoId })
  return apiRequest<CostoGrado>(`/matricula/costo?${qs}`)
}

export interface MatriculaUpdate {
  seccion_id?: string
  periodo_academico_id?: string
  es_reingreso?: boolean
  status?: string
  /** Vacío = no cambiar la beca; `normal` limpia una beca anterior. */
  tipo_beca?: string
  /** Solo aplica cuando `tipo_beca` es `especial`. */
  monto_especial?: number
  /** `undefined` = no tocar las clases retrasadas; `[]` = limpiar. */
  cursos_retrasados?: {
    curso_id: string
    anio_previo: number
    anio_actual: number
  }[]
}

/** Matrícula por id (incluye `tipo_beca`, `monto_especial`, `seccion_id` y `es_reingreso`). */
export async function getMatricula(id: string) {
  return apiRequest<Matricula>(`/matricula/${id}`)
}

export async function updateMatricula(id: string, body: MatriculaUpdate) {
  return apiRequest<Matricula>(`/matricula/${id}`, { method: 'PUT', body })
}

export async function getSugerencia(code: string) {
  const qs = new URLSearchParams({ code })
  return apiRequest<SugerenciaResponse>(`/matricula/sugerencia?${qs}`)
}

export async function reingreso(body: ReingresoRequest) {
  return apiRequest<Matricula | SugerenciaResponse>('/matricula/reingreso', {
    method: 'POST',
    body,
  })
}

export async function linkResponsable(
  matriculaId: string,
  body: LinkResponsableRequest,
) {
  return apiRequest<LinkResponsableResponse>(
    `/matricula/${matriculaId}/responsables`,
    {
      method: 'POST',
      body,
    },
  )
}

/** Desvincula (marca INACTIVE) a un responsable de la matrícula. */
export async function unlinkResponsable(
  matriculaId: string,
  responsableId: string,
) {
  return apiRequest<void>(
    `/matricula/${matriculaId}/responsables/${encodeURIComponent(responsableId)}`,
    { method: 'DELETE' },
  )
}

export async function addDocumento(
  matriculaId: string,
  body: DocumentoRequest,
) {
  return apiRequest<DocumentoMatricula>(
    `/matricula/${matriculaId}/documentos`,
    {
      method: 'POST',
      body,
    },
  )
}
