import type { ParcialForm } from '#/services/catalogos'

const ROMANOS: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

/** Número arábigo → romano clásico en mayúsculas. */
export function romano(numero: number): string {
  const n = Math.floor(numero)
  if (!Number.isFinite(n) || n <= 0) return String(numero)
  let valor = n
  let out = ''
  for (const [v, sym] of ROMANOS) {
    while (valor >= v) {
      out += sym
      valor -= v
    }
  }
  return out
}

/** Nombre autogenerado del parcial a partir de su número: `1 → "I parcial"`. */
export function parcialNombre(numero: number): string {
  return `${romano(numero)} parcial`
}

const corto = (fecha?: string) => (fecha ? fecha.slice(0, 10) : '')

export type FechasPeriodo = { fecha_inicio: string; fecha_fin: string }

/** Deriva las fechas del periodo: mínima `fecha_inicio` y máxima `fecha_fin` de sus parciales. */
export function derivarFechasPeriodo(parciales: Pick<ParcialForm, 'fecha_inicio' | 'fecha_fin'>[]): FechasPeriodo {
  const inicios = parciales.map((p) => corto(p.fecha_inicio)).filter(Boolean)
  const fines = parciales.map((p) => corto(p.fecha_fin)).filter(Boolean)
  return {
    fecha_inicio: inicios.length ? inicios.reduce((a, b) => (a < b ? a : b)) : '',
    fecha_fin: fines.length ? fines.reduce((a, b) => (a > b ? a : b)) : '',
  }
}

/** Valida el arreglo de parciales antes de guardar. Devuelve el mensaje de error o `''`. */
export function validarParciales(parciales: Pick<ParcialForm, 'fecha_inicio' | 'fecha_fin'>[]): string {
  if (parciales.length === 0) return 'Agrega al menos un parcial.'
  for (let i = 0; i < parciales.length; i++) {
    const p = parciales[i]
    if (!corto(p.fecha_inicio) || !corto(p.fecha_fin)) {
      return `Completa las fechas del ${parcialNombre(i + 1)}.`
    }
    if (corto(p.fecha_fin) < corto(p.fecha_inicio)) {
      return `En el ${parcialNombre(i + 1)} la fecha fin no puede ser anterior a la de inicio.`
    }
  }
  return ''
}
