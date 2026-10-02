type Franja = { hora_inicio: string; hora_fin: string }

export function minutosDe(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Minutos de clase a la semana sumando las franjas del horario activo. */
export function minutosSemana(horarios?: Franja[]) {
  return (horarios ?? []).reduce((s, h) => s + minutosDe(h.hora_fin) - minutosDe(h.hora_inicio), 0)
}

/** «29 horas», «2 h 40 min» o «40 min». */
export function formatHoras(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!m) return `${h} ${h === 1 ? 'hora' : 'horas'}`
  return h ? `${h} h ${m} min` : `${m} min`
}
