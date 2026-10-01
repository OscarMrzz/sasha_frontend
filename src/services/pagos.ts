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
  estado: EstadoMensualidad
  fecha_pagado?: string
}

export type EstadoMensualidad = 'pendiente' | 'pagado' | 'mora'

export const ESTADO_MENSUALIDAD_LABEL: Record<EstadoMensualidad, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  mora: 'En mora',
}

export interface ResponsableCuenta {
  codigo: string
  nombre: string
  parentesco: string
  telefono: string
  es_principal: boolean
}

/** Estado de cuenta del alumno en su matrícula activa. */
export interface MensualidadesAlumno {
  alumno_id: string
  codigo: string
  nombre: string
  grado: string
  seccion: string
  responsables: ResponsableCuenta[]
  meses: Mensualidad[]
  /** Primer mes sin pagar. */
  mes_actual?: Mensualidad
  total_pagado: number
  total_pendiente: number
}

/** Una mensualidad (alumno + mes) de la tabla de caja. */
export interface MensualidadFila {
  obligacion_id: string
  alumno_codigo: string
  alumno_nombre: string
  grado: string
  seccion: string
  anio: number
  mes: number
  etiqueta: string
  monto: number
  fecha_vencimiento: string
  estado: EstadoMensualidad
  pago_id?: string
  fecha_pagado?: string
  monto_pagado?: number
  origen?: 'caja' | 'recibo'
  cobrador?: string
  observaciones?: string
}

export interface AlumnoBusqueda {
  codigo: string
  nombre: string
  grado: string
}

export interface AnularMensualidadResponse {
  obligacion_id: string
  estado: EstadoMensualidad
  pagos_anulados: number
  recibos_reabiertos: number
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

export async function listMensualidades(params: { periodoId?: string; estado?: EstadoMensualidad } = {}) {
  const q = new URLSearchParams()
  if (params.periodoId) q.set('periodo_id', params.periodoId)
  if (params.estado) q.set('estado', params.estado)
  const qs = q.toString()
  return apiRequest<MensualidadFila[]>(`/pagos/mensualidades${qs ? `?${qs}` : ''}`)
}

export async function buscarAlumnosPago(q: string) {
  return apiRequest<AlumnoBusqueda[]>(`/pagos/alumnos/buscar?q=${encodeURIComponent(q)}`)
}

export async function anularMensualidad(obligacionId: string, motivo: string) {
  return apiRequest<AnularMensualidadResponse>(`/pagos/mensualidades/${encodeURIComponent(obligacionId)}/anular`, {
    method: 'POST',
    body: { motivo },
  })
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

/** Al día (0 meses vencidos), debe (1) o en mora (2 o más). */
export type EstadoPagoCartera = 'al_dia' | 'debe' | 'mora'

export interface DeudaCartera {
  meses_vencidos: number
  monto_vencido: number
  estado_pago: EstadoPagoCartera
  recibos_sin_revisar: number
}

export interface CarteraAlumno extends DeudaCartera {
  codigo: string
  nombre: string
  grado: string
  grado_orden: number
  seccion: string
  responsable_codigo: string
  responsable_nombre: string
  responsable_telefono: string
  parentesco: string
}

export interface CarteraHijo extends DeudaCartera {
  codigo: string
  nombre: string
  grado: string
  seccion: string
  parentesco: string
}

export interface CarteraPadre extends DeudaCartera {
  codigo: string
  nombre: string
  telefono: string
  profesion: string
  hijos: CarteraHijo[]
}

/** Porcentaje de mensualidades vencidas ya pagadas (a tiempo o con mora). */
export interface GrupoPago {
  nombre: string
  vencidas: number
  pagadas: number
  pct_pagado: number
}

/** Mes vencido; `pct_puntual` solo cuenta lo pagado hasta el vencimiento y no cambia con pagos atrasados. */
export interface MesAnalitica {
  anio: number
  mes: number
  etiqueta: string
  total: number
  pagadas: number
  puntuales: number
  pct_puntual: number
  pct_pagado: number
  completo: boolean
}

export interface RecaudoMes {
  anio: number
  mes: number
  etiqueta: string
  monto: number
  pagos: number
}

export interface MorosoAnalitica {
  codigo: string
  nombre: string
  grado: string
  seccion: string
  modalidad: string
  meses_vencidos: number
  monto_vencido: number
  meses: string[]
  responsable_nombre: string
  responsable_telefono: string
}

export interface AnaliticaPagos {
  periodo: { id: string; nombre: string } | null
  hoy: string
  alumnos: { total: number; al_dia: number; pct_al_dia: number }
  /** Días entre el vencimiento y el pago (negativo = antes del vencimiento). */
  tiempo_pago: { promedio_dias: number; mediana_dias: number; pagos: number }
  puntualidad: {
    vencidas: number
    puntual: number
    con_mora: number
    vencido_sin_pagar: number
    pct_puntual: number
    pct_con_mora: number
    pct_vencido_sin_pagar: number
  }
  recaudado: { mes_anterior: RecaudoMes; mes_actual: RecaudoMes }
  por_grado: GrupoPago[]
  por_modalidad: GrupoPago[]
  meses: MesAnalitica[]
  morosos: MorosoAnalitica[]
}

export async function getAnaliticaPagos() {
  return apiRequest<AnaliticaPagos>('/pagos/analitica')
}

export async function listCarteraAlumnos() {
  return apiRequest<CarteraAlumno[]>('/pagos/cartera/alumnos')
}

export async function listCarteraPadres() {
  return apiRequest<CarteraPadre[]>('/pagos/cartera/padres')
}
