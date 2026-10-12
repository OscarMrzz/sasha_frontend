import type { Grado } from '#/services/catalogos'
import type {
  ConfiguracionPagos,
  ConfiguracionPagosUpdate,
  ReglaMora,
} from '#/services/pagos-config'

/**
 * Fila de regla de mora en el formulario. Los días no se editan: se derivan de
 * la posición de la fila (1.ª = «1 día o más», 2.ª = «2 días o más», …).
 */
export interface ReglaMoraForm {
  /** Clave temporal estable para React (no se envía al backend). */
  key: string
  monto: string
}

/** Estado del formulario por grado. */
export interface GradoConfigForm {
  grado_id: string
  grado_nombre: string
  monto: string
  reglas_mora: ReglaMoraForm[]
}

/** Estado completo del formulario de configuración de pagos. */
export interface ConfiguracionPagosForm {
  dia_pago: string
  grados: GradoConfigForm[]
}

let reglaSeq = 0

/** Genera una clave temporal única para una fila de regla de mora. */
export function nuevaReglaKey(): string {
  reglaSeq += 1
  return `regla-${reglaSeq}`
}

/** Fila de regla de mora vacía. */
export function reglaVacia(): ReglaMoraForm {
  return { key: nuevaReglaKey(), monto: '0' }
}

/** Formulario vacío (sin datos del backend todavía). */
export function configuracionFormVacia(): ConfiguracionPagosForm {
  return { dia_pago: '1', grados: [] }
}

/** Opciones de los días del mes (1–31) para los selects. */
export function diasOptions(): { value: string; label: string }[] {
  return Array.from({ length: 31 }, (_, i) => {
    const dia = i + 1
    return { value: String(dia), label: String(dia) }
  })
}

/** Normaliza un monto escrito como texto a número ≥ 0 (vacío o inválido → 0). */
export function montoSeguro(v: string | number | null | undefined): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim().replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function montoValido(v: string): boolean {
  if (v.trim() === '') return true
  const n = Number(v)
  return Number.isFinite(n) && n >= 0
}

function diaValido(v: string): boolean {
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= 31
}

/**
 * Valida el formulario antes de habilitar Guardar.
 * Devuelve el primer mensaje de error encontrado o `''` si es válido.
 */
export function validarConfiguracion(form: ConfiguracionPagosForm): string {
  if (!diaValido(form.dia_pago)) return 'Selecciona un día de pago entre 1 y 31.'
  for (const grado of form.grados) {
    if (!montoValido(grado.monto)) {
      return `El monto de ${grado.grado_nombre} no puede ser negativo.`
    }
    for (const regla of grado.reglas_mora) {
      if (!montoValido(regla.monto)) {
        return `En ${grado.grado_nombre} ningún monto de mora puede ser negativo.`
      }
    }
  }
  return ''
}

function montoTexto(n: number | null | undefined): string {
  if (n == null) return ''
  return String(n)
}

/**
 * Convierte las reglas del backend al formulario: las ordena por `dias` para
 * renuméralas posicionalmente (1..N), ya que los días no se editan en la UI.
 */
function reglasToForm(reglas: ReglaMora[]): ReglaMoraForm[] {
  return [...reglas]
    .sort((a, b) => a.dias - b.dias)
    .map((regla) => ({ key: nuevaReglaKey(), monto: montoTexto(regla.monto) }))
}

/**
 * Convierte la respuesta del backend al formulario. Fusiona los grados con el
 * catálogo (`grados`) para precargar todos los grados con monto 0 y reglas [].
 */
export function configToForm(
  config: ConfiguracionPagos,
  grados: Grado[] = [],
): ConfiguracionPagosForm {
  const porId = new Map(config.grados.map((g) => [g.grado_id, g]))
  const fusionados: GradoConfigForm[] = grados.map((grado) => {
    const c = porId.get(grado.id)
    return {
      grado_id: grado.id,
      grado_nombre: c?.grado_nombre ?? grado.nombre,
      monto: c ? montoTexto(c.monto) : '0',
      reglas_mora: reglasToForm(c?.reglas_mora ?? []),
    }
  })
  // Grados que devolvió el backend pero no están en el catálogo cargado.
  for (const c of config.grados) {
    if (grados.some((g) => g.id === c.grado_id)) continue
    fusionados.push({
      grado_id: c.grado_id,
      grado_nombre: c.grado_nombre,
      monto: montoTexto(c.monto),
      reglas_mora: reglasToForm(c.reglas_mora),
    })
  }
  return {
    dia_pago: String(config.dia_pago || 1),
    grados: fusionados,
  }
}

/** Serializa el formulario al cuerpo del `PUT` (texto → número; vacíos → 0). */
export function formToPayload(
  form: ConfiguracionPagosForm,
  retroactivo: boolean,
): ConfiguracionPagosUpdate {
  return {
    dia_pago: Number(form.dia_pago),
    retroactivo,
    grados: form.grados.map((grado) => ({
      grado_id: grado.grado_id,
      monto: montoSeguro(grado.monto),
      // Los días se derivan de la posición de la fila (1, 2, 3, …).
      reglas_mora: grado.reglas_mora.map((regla, i) => ({
        dias: i + 1,
        monto: montoSeguro(regla.monto),
      })),
    })),
  }
}
