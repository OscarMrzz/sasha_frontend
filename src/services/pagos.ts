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

export async function listMora() {
  return apiRequest<Obligacion[]>('/pagos/mora')
}
