/** Utilidades de grilla horaria (franjas + recreo). */

export type TimeInterval = { start: string; end: string }

function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}

function formatHM(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function buildClassSlots(
  modalityStart: string,
  modalityEnd: string,
  slotMinutes: number,
  recess: TimeInterval | null,
): TimeInterval[] {
  const start = parseHM(modalityStart)
  const end = parseHM(modalityEnd)
  const recessStart = recess ? parseHM(recess.start) : -1
  const recessEnd = recess ? parseHM(recess.end) : -1
  const out: TimeInterval[] = []
  // Igual que el generador Go: si choca con recreo, saltar al fin del recreo (no solo continue).
  for (let t = start; t + slotMinutes <= end; ) {
    const slotEnd = t + slotMinutes
    if (recess && t < recessEnd && slotEnd > recessStart) {
      t = recessEnd
      continue
    }
    out.push({ start: formatHM(t), end: formatHM(slotEnd) })
    t += slotMinutes
  }
  return out
}

export function addMinutes(hm: string, minutes: number): string {
  return formatHM(parseHM(hm) + minutes)
}

export function sortSlots(slots: TimeInterval[]): TimeInterval[] {
  return [...slots].sort((a, b) => a.start.localeCompare(b.start))
}

/** Siguiente franja de clase después del último slot, saltando el recreo si choca. */
export function nextSlotAfter(
  slots: TimeInterval[],
  slotMinutes: number,
  recess: TimeInterval | null,
): TimeInterval | null {
  if (slotMinutes <= 0) return null
  const ordered = sortSlots(slots)
  let startMins = ordered.length
    ? parseHM(ordered[ordered.length - 1].end)
    : 0
  const recessStart = recess ? parseHM(recess.start) : -1
  const recessEnd = recess ? parseHM(recess.end) : -1

  for (let attempt = 0; attempt < 3; attempt++) {
    let endMins = startMins + slotMinutes
    if (recess && startMins < recessEnd && endMins > recessStart) {
      startMins = recessEnd
      endMins = startMins + slotMinutes
    }
    const candidate = { start: formatHM(startMins), end: formatHM(endMins) }
    const dup = ordered.some((s) => s.start === candidate.start)
    if (!dup) return candidate
    startMins = endMins
  }
  return null
}

export function suggestRecess(
  modalityStart: string,
  modalityEnd: string,
  slotMinutes: number,
  recessMinutes: number,
): TimeInterval {
  const slots = buildClassSlots(modalityStart, modalityEnd, slotMinutes, null)
  if (slots.length < 2) {
    const mid = formatHM(Math.floor((parseHM(modalityStart) + parseHM(modalityEnd)) / 2))
    return { start: mid, end: addMinutes(mid, recessMinutes) }
  }
  const idx = Math.floor(slots.length / 2)
  const start = slots[idx].start
  return { start, end: addMinutes(start, recessMinutes) }
}

export const DIA_LABELS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DIA_SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Une franjas base con las que vengan de slots generados/guardados (p. ej. horas extra). */
export function mergeTimeIntervals(
  base: TimeInterval[],
  extras: Array<{ start: string; end: string }>,
): TimeInterval[] {
  const map = new Map(base.map((x) => [x.start, x]))
  for (const e of extras) {
    if (!e.start || !e.end) continue
    map.set(e.start, { start: e.start, end: e.end })
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
}
