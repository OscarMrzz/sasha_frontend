import { apiRequest } from '#/lib/api'

export interface CobroRequest {
  alumno_code: string
  tipo_pago_codigo?: string
  tipo_pago_id?: string
  monto: number
  fecha_prevista?: string
  observaciones?: string
  cobrador_user_id?: string
  obligacion_pago_id?: string
  /** Cobra varias mensualidades a la vez; el monto sale de cada obligación. */
  obligacion_pago_ids?: string[]
}

export interface Mensualidad {
  obligacion_id: string
  anio: number
  mes: number
  etiqueta: string
  monto: number
  fecha_vencimiento: string
  estado: string
}

export interface MensualidadesAlumno {
  alumno_id: string
  codigo: string
  nombre: string
  meses: Mensualidad[]
}

export interface CobroMesesResponse {
  pagos: Pago[]
  total: number
}

export interface EvidenciaRequest {
  pago_id: string
  object_key: string
}

export interface GenerarObligacionesRequest {
  matricula_id: string
  alumno_id?: string
  tipos?: string[]
}

export interface Obligacion {
  id: string
  tipo_pago_codigo: string
  matricula_id: string
  alumno_id: string
  monto: number
  fecha_vencimiento: string
  estado: string
  periodo_label?: string
}

export interface Pago {
  id: string
  alumno_id: string
  monto: number
  estado: string
  object_key_evidencia?: string
  verificado_por_contabilidad: boolean
}

export async function cobro(body: CobroRequest) {
  return apiRequest<Pago>('/pagos/cobro', { method: 'POST', body })
}

export async function evidencia(body: EvidenciaRequest) {
  return apiRequest<Pago>('/pagos/evidencia', { method: 'POST', body })
}

export async function verificarPago(pagoId: string) {
  return apiRequest<Pago>(`/pagos/${pagoId}/verificar`, { method: 'PUT' })
}

export async function generarObligaciones(body: GenerarObligacionesRequest) {
  return apiRequest<Obligacion[]>('/pagos/obligaciones/generar', { method: 'POST', body })
}

export async function cobrarMeses(alumnoCode: string, obligacionIds: string[], observaciones?: string) {
  return apiRequest<CobroMesesResponse>('/pagos/cobro', {
    method: 'POST',
    body: { alumno_code: alumnoCode, monto: 0, obligacion_pago_ids: obligacionIds, observaciones },
  })
}

export async function getMensualidadesAlumno(code: string) {
  return apiRequest<MensualidadesAlumno>(`/pagos/alumnos/${encodeURIComponent(code)}/mensualidades`)
}

export async function generarMensualidades(periodoAcademicoId?: string) {
  return apiRequest<{ creadas: number }>('/pagos/mensualidades/generar', {
    method: 'POST',
    body: periodoAcademicoId ? { periodo_academico_id: periodoAcademicoId } : {},
  })
}

export async function listMora() {
  return apiRequest<Obligacion[]>('/pagos/mora')
}

export type EstadoRecibo = 'sin_revisar' | 'aprobado' | 'denegado'

export const ESTADO_RECIBO_LABEL: Record<EstadoRecibo, string> = {
  sin_revisar: 'Sin revisar',
  aprobado: 'Aprobado',
  denegado: 'Denegado',
}

/** Recibo de pago que sube el responsable y revisa caja. */
export interface Recibo {
  id: string
  alumno_id: string
  alumno_nombre: string
  alumno_codigo: string
  responsable_nombre: string
  obligacion_pago_id?: string
  anio: number
  mes: number
  etiqueta: string
  monto: number
  fecha_pago?: string
  object_key: string
  content_type: string
  estado: EstadoRecibo
  observaciones?: string
  revisado_at?: string
  /** Fecha de envío. */
  created_at: string
}

export interface ValidarReciboRequest {
  estado: EstadoRecibo
  anio: number
  mes: number
  monto: number
  fecha_pago?: string | null
  observaciones?: string | null
}

export async function listRecibos(estado?: EstadoRecibo) {
  return apiRequest<Recibo[]>(`/pagos/recibos${estado ? `?estado=${estado}` : ''}`)
}

export async function validarRecibo(id: string, body: ValidarReciboRequest) {
  return apiRequest<Recibo>(`/pagos/recibos/${encodeURIComponent(id)}/validar`, { method: 'PUT', body })
}
