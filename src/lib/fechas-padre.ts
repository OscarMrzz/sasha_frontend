/** Fechas en lenguaje simple para el portal del padre. Las fechas llegan como YYYY-MM-DD. */

function aFecha(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00`)
}

export function hoyISO(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** «viernes 3 de octubre» */
export function fechaLarga(iso: string) {
  return aFecha(iso).toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** «3 de octubre de 2026» */
export function fechaCorta(iso: string) {
  return aFecha(iso).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** «Hoy», «Mañana», «Ayer» o la fecha larga. */
export function fechaRelativa(iso: string, now = new Date()) {
  const dias = Math.round((aFecha(iso).getTime() - aFecha(hoyISO(now)).getTime()) / 86_400_000)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias === -1) return 'Ayer'
  const txt = fechaLarga(iso)
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

export function lempiras(n: number) {
  return `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export function nombreMes(mes: number) {
  return MESES[mes - 1] ?? ''
}

/** «Mayo 2026» */
export function mesAnio(anio: number, mes: number) {
  const n = nombreMes(mes)
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${anio}`
}
