import type { SolicitudPermiso } from '#/services/permisos'

export function hoyISO(): string {
  const ahora = new Date()
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function formatearFechaPermiso(fecha: string): string {
  if (!fecha) return '—'
  const d = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(d.getTime())) return fecha
  return new Intl.DateTimeFormat('es-HN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function rangoPermiso(inicio: string, fin: string): string {
  if (!fin || inicio === fin) return formatearFechaPermiso(inicio)
  return `${formatearFechaPermiso(inicio)} – ${formatearFechaPermiso(fin)}`
}

/** Días inclusivos entre dos fechas YYYY-MM-DD. */
export function diasPermiso(inicio: string, fin: string): number {
  const a = new Date(`${inicio}T00:00:00`)
  const b = new Date(`${fin}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1)
}

export function etiquetaEstadoPermiso(estado: SolicitudPermiso['estado']): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente'
    case 'aprobada':
      return 'Aprobado'
    case 'rechazada':
      return 'Rechazado'
    case 'cancelada':
      return 'Cancelado'
    default:
      return estado
  }
}

export function claseEstadoPermiso(estado: SolicitudPermiso['estado']): string {
  switch (estado) {
    case 'aprobada':
      return 'estado-pill--ok'
    case 'rechazada':
      return 'estado-pill--mal'
    case 'pendiente':
      return 'estado-pill--espera'
    default:
      return ''
  }
}

export function etiquetaTipoSolicitud(tipo: SolicitudPermiso['tipo_solicitud']): string {
  return tipo === 'aviso_previo' ? 'Aviso previo' : 'Justificación'
}

export function etiquetaFalta(tipo: string): string {
  return tipo === 'tarde' ? 'Tardanza' : 'Falta'
}
