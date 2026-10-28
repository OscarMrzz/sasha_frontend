import type { Grado } from '#/services/catalogos'
import type {
  ConfiguracionPagos,
  ConfiguracionPagosUpdate,
  MesCobroOpcion,
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
  /** Mensualidad (texto editable). */
  monto: string
  /** Matrícula (texto editable, pago único de ingreso). */
  monto_matricula: string
  reglas_mora: ReglaMoraForm[]
}

/** Estado completo del formulario de configuración de pagos. */
export interface ConfiguracionPagosForm {
  dia_pago: string
  grados: GradoConfigForm[]
  /** auto = meses por fechas del periodo; manual = selección explícita. */
  mesesModo: 'auto' | 'manual'
  /** Opciones ofrecidas (año lectivo y siguiente si el periodo cruza año). */
  opcionesMeses: MesCobroOpcion[]
  /** Claves nio-mes marcadas. */
  meses: string[]
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
  return { dia_pago: '1', grados: [], mesesModo: 'auto', opcionesMeses: [], meses: [] }
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
  if (form.mesesModo === 'manual' && form.meses.length === 0) return 'Marca al menos un mes.'
  for (const grado of form.grados) {
    if (!montoValido(grado.monto)) {
      return `La mensualidad de ${grado.grado_nombre} no puede ser negativa.`
    }
    if (!montoValido(grado.monto_matricula)) {
      return `La matrícula de ${grado.grado_nombre} no puede ser negativa.`
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
      monto_matricula: c ? montoTexto(c.monto_matricula) : '0',
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
      monto_matricula: montoTexto(c.monto_matricula),
      reglas_mora: reglasToForm(c.reglas_mora),
    })
  }
  return {
    dia_pago: String(config.dia_pago || 1),
    grados: fusionados,
    mesesModo: config.meses?.modo === 'manual' ? 'manual' : 'auto',
    opcionesMeses: config.meses?.opciones ?? [],
    meses: (config.meses?.seleccionados ?? []).map(claveMes),
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
      monto_matricula: montoSeguro(grado.monto_matricula),
      // Los días se derivan de la posición de la fila (1, 2, 3, …).
      reglas_mora: grado.reglas_mora.map((regla, i) => ({
        dias: i + 1,
        monto: montoSeguro(regla.monto),
      })),
    })),
    meses_modo: form.mesesModo,
    meses:
      form.mesesModo === 'manual'
        ? form.meses.map((clave) => {
            const [anio, mes] = clave.split('-').map(Number)
            return { anio, mes }
          })
        : undefined,
  }
}
/** Clave estable de un mes para el formulario ("2026-8"). */
export function claveMes(m: { anio: number; mes: number }): string {
  return `${m.anio}-${m.mes}`
}

/** Etiqueta legible de una clave "2026-8" (para mensajes). */
export function etiquetaClaveMes(clave: string): string {
  const [anio, mes] = clave.split('-').map(Number)
  const nombres = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  if (!anio || !mes || mes < 1 || mes > 12) return clave
  return `${nombres[mes - 1]} ${anio}`
}
/** Nombre del mes (1–12) sin año; el año lo muestra el grupo del selector. */
export function nombreMes(mes: number): string {
  const nombres = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return nombres[mes - 1] ?? ''
}