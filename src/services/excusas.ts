import { apiRequest } from '#/lib/api'

export interface TipoExcusa {
  id: string
  codigo: string
  nombre: string
  status: string
  usos: number
}

export interface TipoExcusaInput {
  nombre: string
  status: string
}

export interface Excusa {
  id: string
  alumno_codigo: string
  alumno_nombre: string
  grado: string
  seccion: string
  tipo_excusa_id: string
  tipo_nombre: string
  fecha_inicio: string
  fecha_fin: string
  descripcion: string
  status: string
  registrado_por: string
  creado_en: string
  /** Celdas de asistencia que la excusa tiene bloqueadas. */
  clases: number
}

export interface ExcusaInput {
  alumno_codigo: string
  tipo_excusa_id: string
  fecha_inicio: string
  fecha_fin: string
  descripcion: string
}

export interface AlumnoExcusa {
  codigo: string
  nombre: string
  grado: string
  seccion: string
}

export async function listTiposExcusa(todos = false) {
  return apiRequest<TipoExcusa[]>(`/excusas/tipos${todos ? '?todos=1' : ''}`)
}

export async function createTipoExcusa(body: TipoExcusaInput) {
  return apiRequest<TipoExcusa>('/excusas/tipos', { method: 'POST', body })
}

export async function updateTipoExcusa(id: string, body: TipoExcusaInput) {
  return apiRequest<TipoExcusa>(`/excusas/tipos/${id}`, { method: 'PUT', body })
}

export async function listExcusas() {
  return apiRequest<Excusa[]>('/excusas/')
}

export async function createExcusa(body: ExcusaInput) {
  return apiRequest<Excusa>('/excusas/', { method: 'POST', body })
}

export async function updateExcusa(id: string, body: ExcusaInput) {
  return apiRequest<Excusa>(`/excusas/${id}`, { method: 'PUT', body })
}

export async function desactivarExcusa(id: string) {
  return apiRequest<{ status: string; id: string }>(`/excusas/${id}/desactivar`, { method: 'POST' })
}

export async function buscarAlumnosExcusa(q: string) {
  return apiRequest<AlumnoExcusa[]>(`/excusas/alumnos/buscar?q=${encodeURIComponent(q)}`)
}

/** «02/10/2026». */
export function fechaExcusa(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** «02/10/2026» o «02/10/2026 al 05/10/2026». */
export function rangoExcusa(e: Pick<Excusa, 'fecha_inicio' | 'fecha_fin'>) {
  return e.fecha_inicio === e.fecha_fin
    ? fechaExcusa(e.fecha_inicio)
    : `${fechaExcusa(e.fecha_inicio)} al ${fechaExcusa(e.fecha_fin)}`
}

export const estadoExcusaLabel = (s: string) => (s === 'ACTIVE' ? 'Activa' : 'Desactivada')
