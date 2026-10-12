import { apiRequest, apiRequestList } from '#/lib/api'

/** Regla de mora de un grado: «N días o más» → monto fijo. */
export interface ReglaMora {
  dias: number
  monto: number
}

/** Configuración de pago de un grado (una entrada por grado del catálogo). */
export interface ConfigGrado {
  grado_id: string
  grado_nombre: string
  /** Mensualidad del grado. Default 0. */
  monto: number
  reglas_mora: ReglaMora[]
}

/** Respuesta de `GET /pagos/configuracion/{periodo_id}`. */
export interface ConfiguracionPagos {
  periodo_id: string
  /** Día del mes (1–31) en que vence el pago. */
  dia_pago: number
  /** `true` si el periodo ya tiene configuración guardada (fila en `periodo_config_pago`). */
  existe: boolean
  /** Todos los grados; sin config → `monto 0` y `reglas_mora []`. */
  grados: ConfigGrado[]
}

/** Cuerpo de `PUT /pagos/configuracion/{periodo_id}`. */
export interface ConfiguracionPagosUpdate {
  dia_pago: number
  /** Si `true`, el cambio aplica a las obligaciones ya generadas del periodo. */
  retroactivo: boolean
  grados: { grado_id: string; monto: number; reglas_mora: ReglaMora[] }[]
}

/** Periodo listado en la pantalla de configuración (`GET /pagos/configuracion/periodos`). */
export interface PeriodoConfigLista {
  id: string
  nombre: string
  anio_lectivo: number
  status: string
}

export async function getConfiguracionPagos(periodoId: string) {
  return apiRequest<ConfiguracionPagos>(
    `/pagos/configuracion/${encodeURIComponent(periodoId)}`,
  )
}

export async function updateConfiguracionPagos(periodoId: string, body: ConfiguracionPagosUpdate) {
  return apiRequest<ConfiguracionPagos>(
    `/pagos/configuracion/${encodeURIComponent(periodoId)}`,
    { method: 'PUT', body },
  )
}

/** Periodos disponibles para configurar pagos (no depende de `catalogos:get`). */
export async function listPeriodosConfig() {
  return apiRequestList<PeriodoConfigLista>('/pagos/configuracion/periodos')
}
