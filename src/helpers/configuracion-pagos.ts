import type { Grado } from '#/services/catalogos'
import type {
  ConfiguracionPagos,
  ConfiguracionPagosUpdate,
  ReglaMora,
} from '#/services/pagos-config'

/** Fila de regla de mora en el formulario (días/monto como texto mientras se escribe). */
export interface ReglaMoraForm {
  /** Clave temporal estable para React (no se envía al backend). */
  key: string
  dias: string
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
  dia_mora: string
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
  return { key: nuevaReglaKey(), dias: '', monto: '0' }
}

/** Formulario vacío (sin datos del backend todavía). */
export function configuracionFormVacia(): ConfiguracionPagosForm {
  return { dia_pago: '1', dia_mora: '1', grados: [] }
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

function diasReglaValido(v: string): boolean {
  const n = Number(v)
  return Number.isInteger(n) && n >= 1
}

/**
 * Valida el formulario antes de habilitar Guardar.
 * Devuelve el primer mensaje de error encontrado o `''` si es válido.
 */
export function validarConfiguracion(form: ConfiguracionPagosForm): string {
  if (!diaValido(form.dia_pago)) return 'Selecciona un día de pago entre 1 y 31.'
  if (!diaValido(form.dia_mora)) return 'Selecciona un día de mora entre 1 y 31.'
  for (const grado of form.grados) {
    if (!montoValido(grado.monto)) {
      return `El monto de ${grado.grado_nombre} no puede ser negativo.`
    }
    const vistos = new Set<number>()
    for (const regla of grado.reglas_mora) {
      if (!diasReglaValido(regla.dias)) {
        return `En ${grado.grado_nombre} cada regla de mora necesita los días (entero, 1 o más).`
      }
      if (!montoValido(regla.monto)) {
        return `En ${grado.grado_nombre} ningún monto de mora puede ser negativo.`
      }
      const dias = Number(regla.dias)
      if (vistos.has(dias)) {
        return `En ${grado.grado_nombre} hay dos reglas con los mismos días (${dias}).`
      }
      vistos.add(dias)
    }
  }
  return ''
}

function montoTexto(n: number | null | undefined): string {
  if (n == null) return ''
  return String(n)
}

function reglaToForm(regla: ReglaMora): ReglaMoraForm {
  return { key: nuevaReglaKey(), dias: String(regla.dias), monto: montoTexto(regla.monto) }
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
      reglas_mora: (c?.reglas_mora ?? []).map(reglaToForm),
    }
  })
  // Grados que devolvió el backend pero no están en el catálogo cargado.
  for (const c of config.grados) {
    if (grados.some((g) => g.id === c.grado_id)) continue
    fusionados.push({
      grado_id: c.grado_id,
      grado_nombre: c.grado_nombre,
      monto: montoTexto(c.monto),
      reglas_mora: c.reglas_mora.map(reglaToForm),
    })
  }
  return {
    dia_pago: String(config.dia_pago || 1),
    dia_mora: String(config.dia_mora || 1),
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
    dia_mora: Number(form.dia_mora),
    retroactivo,
    grados: form.grados.map((grado) => ({
      grado_id: grado.grado_id,
      monto: montoSeguro(grado.monto),
      reglas_mora: grado.reglas_mora
        .map((regla) => ({
          dias: Math.floor(Number(regla.dias)),
          monto: montoSeguro(regla.monto),
        }))
        .filter((regla) => Number.isInteger(regla.dias) && regla.dias >= 1)
        .sort((a, b) => a.dias - b.dias),
    })),
  }
}
