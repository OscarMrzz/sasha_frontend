import type {
  ExamenAsignacion,
  ExamenBloque,
  ExamenBloqueInput,
} from '#/services/examenes'

/** Inicial del día de la semana (0 = domingo). */
export const DIA_INICIAL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const

export const DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const

/** Convierte `YYYY-MM-DD` (o timestamp ISO) a `Date` local sin desfase de zona. */
export function parseFecha(fecha: string | null | undefined): Date | null {
  if (!fecha) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function soloFecha(fecha: string | null | undefined): string {
  return (fecha ?? '').slice(0, 10)
}

/** `2026-03-01` → `01 L`. */
export function fechaCorta(fecha: string): string {
  const date = parseFecha(fecha)
  if (!date) return soloFecha(fecha) || '—'
  const dia = String(date.getDate()).padStart(2, '0')
  return `${dia} ${DIA_INICIAL[date.getDay()]}`
}

export function fechaLarga(fecha: string): string {
  const date = parseFecha(fecha)
  if (!date) return soloFecha(fecha) || '—'
  return `${DIA_CORTO[date.getDay()]} ${String(date.getDate()).padStart(2, '0')}`
}

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Fechas reales entre dos fechas ISO, ambas incluidas. */
export function fechasEntre(inicio: string, fin: string): string[] {
  const a = parseFecha(inicio)
  const b = parseFecha(fin)
  if (!a || !b || b < a) return []
  const out: string[] = []
  const cursor = new Date(a.getTime())
  // Tope defensivo: un periodo lectivo nunca pasa de ~3 años.
  for (let guard = 0; guard < 1200 && cursor <= b; guard += 1) {
    out.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export function formatRangoFechas(inicio: string, fin: string): string {
  const a = soloFecha(inicio)
  const b = soloFecha(fin)
  if (!a && !b) return '—'
  if (!b || a === b) return fechaCorta(a)
  return `${fechaCorta(a)} – ${fechaCorta(b)}`
}

export function normalizarHora(hora: string | null | undefined): string {
  return (hora ?? '').slice(0, 5)
}

/** Rango legible de una franja: `08:00–09:30`. */
export function horaRango(inicio: string | null | undefined, fin: string | null | undefined): string {
  const a = normalizarHora(inicio)
  const b = normalizarHora(fin)
  if (!a && !b) return '—'
  if (!b || a === b) return a || '—'
  return `${a}–${b}`
}

/** Hora en formato de 12 horas: `07:00` → `7:00 a. m.`. */
export function hora12(hora: string | null | undefined): string {
  const h = normalizarHora(hora)
  if (!h) return ''
  const [hh, mm] = h.split(':').map(Number)
  const sufijo = hh < 12 ? 'a. m.' : 'p. m.'
  const h12 = hh % 12 || 12
  return `${h12}:${String(mm || 0).padStart(2, '0')} ${sufijo}`
}

/** Rango en 12 horas: `7:00 a. m. – 8:20 a. m.`. */
export function horaRango12(
  inicio: string | null | undefined,
  fin: string | null | undefined,
): string {
  const a = hora12(inicio)
  const b = hora12(fin)
  if (!a && !b) return '—'
  if (!b || a === b) return a || '—'
  return `${a} – ${b}`
}

/** Duración legible: `1 h 20 min`, `40 min`, `2 h`. */
export function duracionTexto(minutos: number): string {
  if (minutos <= 0) return ''
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h && m) return `${h} h ${m} min`
  if (h) return `${h} h`
  return `${m} min`
}

export type RecesoPortal = {
  despuesDe: string
  inicio: string
  fin: string
  minutos: number
}

/** Huecos entre los bloques de un día del portal, para pintarlos como receso. */
export function recesosDeLista(
  bloques: { id: string; hora_inicio: string; hora_fin: string }[],
): RecesoPortal[] {
  const ordenados = [...bloques].sort(
    (a, b) => minutosDeHora(a.hora_inicio) - minutosDeHora(b.hora_inicio),
  )
  const out: RecesoPortal[] = []
  for (let i = 1; i < ordenados.length; i += 1) {
    const prev = ordenados[i - 1]
    const cur = ordenados[i]
    const ini = minutosDeHora(prev.hora_fin)
    const fin = minutosDeHora(cur.hora_inicio)
    if (fin > ini) {
      out.push({
        despuesDe: prev.id,
        inicio: normalizarHora(prev.hora_fin),
        fin: normalizarHora(cur.hora_inicio),
        minutos: fin - ini,
      })
    }
  }
  return out
}

/** Etiqueta de grado + sección para las tarjetas del maestro. */
export function labelGradoSeccion(grado?: string | null, seccion?: string | null): string {
  return [grado, seccion].filter(Boolean).join(' · ')
}

/** Texto de un estado A/T/E/F. */
export function estadoAsistenciaLabel(estado: string): string {
  switch (estado) {
    case 'A':
      return 'Asistió'
    case 'T':
      return 'Tarde'
    case 'E':
      return 'Excusado'
    case 'F':
      return 'Falta'
    default:
      return 'Sin marcar'
  }
}

/** Color semántico de un estado A/T/E/F. */
export function estadoAsistenciaTone(estado: string): EstadoExamenTone {
  if (estado === 'A') return 'ok'
  if (estado === 'F') return 'mal'
  return 'espera'
}

export function minutosDeHora(hora: string): number {
  const [h, m] = normalizarHora(hora).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function horaDeMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Duración de una franja en minutos (0 si es inválida). */
export function duracionMinutos(inicio: string, fin: string): number {
  return minutosDeHora(fin) - minutosDeHora(inicio)
}

/** Bloques iniciales consecutivos a partir de la hora de inicio de la modalidad. */
export function bloquesIniciales(
  horaInicio: string,
  cantidad = 2,
  duracion = 90,
): ExamenBloqueInput[] {
  const start = minutosDeHora(horaInicio || '08:00')
  return Array.from({ length: Math.max(1, cantidad) }, (_, i) => {
    const ini = start + i * duracion
    return {
      orden: i + 1,
      hora_inicio: horaDeMinutos(ini),
      hora_fin: horaDeMinutos(ini + duracion),
    }
  })
}

/** Hueco entre bloques consecutivos, que el wizard muestra como receso. */
export type RecesoExamen = {
  despuesDe: number
  inicio: string
  fin: string
  minutos: number
}

export function recesosDeBloques(bloques: ExamenBloqueInput[]): RecesoExamen[] {
  const ordenados = [...bloques].sort((a, b) => a.orden - b.orden)
  const out: RecesoExamen[] = []
  for (let i = 1; i < ordenados.length; i += 1) {
    const prev = ordenados[i - 1]
    const cur = ordenados[i]
    const ini = minutosDeHora(prev.hora_fin)
    const fin = minutosDeHora(cur.hora_inicio)
    if (fin > ini) {
      out.push({
        despuesDe: prev.orden,
        inicio: normalizarHora(prev.hora_fin),
        fin: normalizarHora(cur.hora_inicio),
        minutos: fin - ini,
      })
    }
  }
  return out
}

/** Devuelve el primer error de bloques o `null` si son válidos. */
export function validarBloques(bloques: ExamenBloqueInput[]): string | null {
  if (bloques.length === 0) return 'Agrega al menos un bloque de examen.'
  const ordenados = [...bloques].sort((a, b) => a.orden - b.orden)
  const ordenes = new Set<number>()
  for (const bloque of ordenados) {
    if (bloque.orden < 1) return 'El orden de cada bloque debe ser mayor que cero.'
    if (ordenes.has(bloque.orden)) return `El bloque ${bloque.orden} está repetido.`
    ordenes.add(bloque.orden)
    if (!normalizarHora(bloque.hora_inicio) || !normalizarHora(bloque.hora_fin)) {
      return `Indica la hora de inicio y fin del bloque ${bloque.orden}.`
    }
    if (minutosDeHora(bloque.hora_fin) <= minutosDeHora(bloque.hora_inicio)) {
      return `La hora de fin del bloque ${bloque.orden} debe ser posterior a la de inicio.`
    }
  }
  for (let i = 1; i < ordenados.length; i += 1) {
    const prev = ordenados[i - 1]
    const cur = ordenados[i]
    if (minutosDeHora(cur.hora_inicio) < minutosDeHora(prev.hora_fin)) {
      return `Los bloques ${prev.orden} y ${cur.orden} se solapan; deja el receso como un hueco.`
    }
  }
  return null
}

/** Hora de salida del día: el fin más tardío entre los exámenes de esa fecha. */
export function horaSalida(
  asignaciones: Array<Pick<ExamenAsignacion, 'fecha' | 'hora_fin'>>,
  fecha: string,
): string {
  const delDia = asignaciones.filter((a) => soloFecha(a.fecha) === soloFecha(fecha))
  if (delDia.length === 0) return ''
  return normalizarHora(
    delDia.reduce((max, a) => (normalizarHora(a.hora_fin) > max ? normalizarHora(a.hora_fin) : max), ''),
  )
}

/** Igual que `horaSalida` pero con bloques del tablero (los exámenes solo traen bloque_orden). */
export function horaSalidaConBloques(
  asignaciones: Array<{ fecha: string; bloque_orden: number }>,
  bloques: Array<Pick<ExamenBloque, 'orden' | 'hora_fin'>>,
  fecha: string,
): string {
  const finPorOrden = new Map(bloques.map((b) => [b.orden, normalizarHora(b.hora_fin)]))
  const delDia = asignaciones.filter((a) => soloFecha(a.fecha) === soloFecha(fecha))
  if (delDia.length === 0) return ''
  return delDia.reduce((max, a) => {
    const fin = finPorOrden.get(a.bloque_orden) ?? ''
    return fin > max ? fin : max
  }, '')
}

export type EstadoExamenTone = 'ok' | 'mal' | 'espera'

export function estadoExamen(estado: string, esActiva: boolean): {
  label: string
  tone: EstadoExamenTone
} {
  if (estado === 'publicado') {
    return esActiva
      ? { label: 'Publicado · activa', tone: 'ok' }
      : { label: 'Publicado · inactiva', tone: 'espera' }
  }
  if (estado === 'archivado') return { label: 'Archivado', tone: 'mal' }
  return { label: 'Borrador', tone: 'espera' }
}

export function estadoLabel(estado: string): string {
  if (estado === 'publicado') return 'Publicado'
  if (estado === 'archivado') return 'Archivado'
  return 'Borrador'
}

/** Etiqueta estándar de una sección dentro del tablero. */
export function labelSeccion(grado: string, seccion: string): string {
  return [grado, seccion].filter(Boolean).join(' · ')
}

/** Etiqueta de una pastilla: `materia · grado · sección`. */
export function labelPill(curso: string, grado: string, seccion: string): string {
  return [curso, grado, seccion].filter(Boolean).join(' · ')
}

/** Agrupa las asignaciones por grado + sección para filtros y exportaciones. */
export function agruparPorGradoSeccion(
  asignaciones: ExamenAsignacion[],
): Array<{ key: string; grado: string; seccion: string; items: ExamenAsignacion[] }> {
  const map = new Map<string, { key: string; grado: string; seccion: string; items: ExamenAsignacion[] }>()
  for (const a of asignaciones) {
    const grado = a.grado_nombre ?? ''
    const seccion = a.seccion_nombre ?? ''
    const key = `${grado}|${seccion}`
    const grupo = map.get(key) ?? { key, grado, seccion, items: [] }
    grupo.items.push(a)
    map.set(key, grupo)
  }
  return [...map.values()].sort((a, b) =>
    `${a.grado} ${a.seccion}`.localeCompare(`${b.grado} ${b.seccion}`, 'es'),
  )
}

/** Agrupa por curso (materia) para las pastillas. */
export function agruparPorCurso<T extends { curso_id: string; curso_nombre?: string }>(
  items: T[],
): Array<{ cursoId: string; cursoNombre: string; items: T[] }> {
  const map = new Map<string, { cursoId: string; cursoNombre: string; items: T[] }>()
  for (const item of items) {
    const grupo = map.get(item.curso_id) ?? {
      cursoId: item.curso_id,
      cursoNombre: item.curso_nombre ?? 'Materia',
      items: [],
    }
    grupo.items.push(item)
    map.set(item.curso_id, grupo)
  }
  return [...map.values()].sort((a, b) => a.cursoNombre.localeCompare(b.cursoNombre, 'es'))
}
