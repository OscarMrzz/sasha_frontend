import { apiRequest, apiRequestList } from '#/lib/api'

/** Mes calendario (año + mes) que se cobra en un periodo. */
export interface MesCobro {
  anio: number
  mes: number
}

/** Opción del selector de meses de cobro. */
export interface MesCobroOpcion extends MesCobro {
  etiqueta: string
  del_periodo: boolean
  seleccionado: boolean
}

/** Bloque `meses` de `GET /pagos/configuracion/{periodo_id}`. */
export interface MesesCobroConfig {
  modo: 'auto' | 'manual'
  anio_lectivo: number
  rango: { desde: string; hasta: string }
  seleccionados: MesCobroOpcion[]
  opciones: MesCobroOpcion[]
}

/** Regla de destino de un tipo adicional: los campos presentes son AND. */
export interface TipoPagoRegla {
  id?: string
  modalidad_id: string | null
  grado_id: string | null
  seccion_id: string | null
  alumno_id: string | null
  curso_id: string | null
}

/** Una regla sin id, tal como la envía el formulario. */
export type TipoPagoReglaInput = Omit<TipoPagoRegla, 'id'>

/** Qué campos puede cambiar el cliente en un tipo. */
export interface EditablesTipoPago {
  nombre: boolean
  descripcion: boolean
  monto: boolean
  periodicidad: boolean
  fecha_vencimiento: boolean
  reglas: boolean
  meses: boolean
  bloquea_notas: boolean
}

/** Monto de mensualidad y matrícula de un grado en el periodo. */
export interface MontoPorGrado {
  grado_id: string
  grado_nombre: string
  monto: number
  monto_matricula: number
}

/** Conteos de obligaciones de un tipo en el periodo. */
export interface ResumenTipoPago {
  alumnos: number
  obligaciones: number
  pendientes: number
  mora: number
  pagadas: number
  monto_pendiente: number
}

export type ModoDesglose = 'general' | 'por_grado'

/** Meses efectivos de un grado. */
export interface MesesGrado {
  grado_id: string
  grado_nombre: string
  meses: MesCobro[]
}

export interface TipoPagoDetalle {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  es_fijo: boolean
  es_periodico: boolean
  monto: number | null
  fecha_vencimiento: string | null
  /** Día del mes (1–31) de los periódicos; null = día del periodo. */
  dia_pago: number | null
  bloquea_notas: boolean
  bloquea_notas_heredado: boolean
  bloquea_notas_override: boolean | null
  status: string
  desglose: ModoDesglose
  meses_modo: ModoDesglose
  editables: EditablesTipoPago
  reglas: TipoPagoRegla[]
  montos_por_grado: MontoPorGrado[]
  meses_por_grado: MesesGrado[]
  /** Meses elegidos en un tipo periódico general (vacío = meses del periodo). */
  meses_generales: MesCobro[]
  resumen: ResumenTipoPago
}

/** Detalle completo del periodo para el modal de tipos. */
export interface TiposPagoPeriodo {
  periodo_id: string
  /** Día de pago del periodo (para precargar el de los periódicos). */
  dia_pago: number
  periodo_nombre: string
  anio_lectivo: number
  meses: MesesCobroConfig
  tipos: TipoPagoDetalle[]
}

/** Fila del listado `/pagos/tipos-pago`. */
export interface PeriodoTiposPago {
  id: string
  nombre: string
  anio_lectivo: number
  status: string
  meses_modo: 'auto' | 'manual'
  meses_cobro: number
  tipos_total: number
  tipos_adicionales: number
  obligaciones_pendientes: number
  monto_pendiente: number
}

/** Opción simple de catálogo (modalidad, grado, curso). */
export interface OpcionCatalogo {
  id: string
  nombre: string
  orden?: number
}

export interface OpcionSeccion {
  id: string
  nombre: string
  grado_id: string
  grado_nombre: string
  modalidad_id: string
  modalidad_nombre: string
}

export interface OpcionAlumno {
  id: string
  codigo: string
  nombre: string
  grado_id: string
  grado_nombre: string
  seccion_id: string
  seccion_nombre: string
}

/** Catálogos para el modo avanzado de destinos. */
export interface TiposPagoOpciones {
  periodo_id: string
  modalidades: OpcionCatalogo[]
  grados: OpcionCatalogo[]
  secciones: OpcionSeccion[]
  alumnos: OpcionAlumno[]
  cursos: OpcionCatalogo[]
}

/** Cuerpo de crear/editar un tipo adicional. */
export interface TipoPagoInput {
  nombre?: string
  descripcion?: string
  monto?: number
  es_periodico?: boolean
  /** Día del mes (1–31) para los periódicos. */
  dia_pago?: number | null
  fecha_vencimiento?: string | null
  bloquea_notas?: boolean
  reglas?: TipoPagoReglaInput[]
  desglose?: ModoDesglose
  meses_modo?: ModoDesglose
  montos_por_grado?: { grado_id: string; monto: number }[]
  meses_por_grado?: { grado_id: string; meses: MesCobro[] }[]
  /** Meses generales de un periódico (modo general). */
  meses?: MesCobro[]
  retroactivo?: boolean
}

/** Contadores de generación de obligaciones. */
export interface GeneracionResumen {
  obligaciones_creadas: number
  obligaciones_reactivadas: number
  obligaciones_omitidas: number
}

/** Respuesta de crear/editar un tipo (detalle + generación). */
export interface TipoPagoResponse extends TipoPagoDetalle {
  generacion?: GeneracionResumen
}

/** Respuesta de `DELETE /pagos/tipos-pago/{periodo}/{tipo}`. */
export interface EliminarTipoPagoResponse {
  id: string
  status: string
  obligaciones_inactivadas: number
}

export async function listTiposPagoPeriodos() {
  return apiRequestList<PeriodoTiposPago>('/pagos/tipos-pago')
}

export async function getTiposPagoPeriodo(periodoId: string) {
  return apiRequest<TiposPagoPeriodo>(
    `/pagos/tipos-pago/${encodeURIComponent(periodoId)}`,
  )
}

export async function getTiposPagoOpciones(periodoId: string, q?: string) {
  const params = new URLSearchParams({ periodo_id: periodoId })
  if (q && q.trim()) params.set('q', q.trim())
  return apiRequest<TiposPagoOpciones>(`/pagos/tipos-pago/opciones?${params}`)
}

export async function crearTipoPago(periodoId: string, body: TipoPagoInput) {
  return apiRequest<TipoPagoResponse>(
    `/pagos/tipos-pago/${encodeURIComponent(periodoId)}`,
    { method: 'POST', body },
  )
}

export async function actualizarTipoPago(
  periodoId: string,
  tipoId: string,
  body: TipoPagoInput,
) {
  return apiRequest<TipoPagoResponse>(
    `/pagos/tipos-pago/${encodeURIComponent(periodoId)}/${encodeURIComponent(tipoId)}`,
    { method: 'PUT', body },
  )
}

export async function eliminarTipoPago(periodoId: string, tipoId: string) {
  return apiRequest<EliminarTipoPagoResponse>(
    `/pagos/tipos-pago/${encodeURIComponent(periodoId)}/${encodeURIComponent(tipoId)}`,
    { method: 'DELETE' },
  )
}
