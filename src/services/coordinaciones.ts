import { apiRequest } from '#/lib/api'

/** Regla de alcance: un campo en null significa «todos». */
export interface ReglaCoordinacion {
  curso_id: string | null
  grado_id: string | null
  seccion_id: string | null
  curso?: string
  grado?: string
  seccion?: string
}

export interface Coordinacion {
  id: string
  titulo: string
  descripcion: string
  status: string
  reglas: ReglaCoordinacion[]
  clases: number
  secciones: number
  usuarios: { codigo: string; nombre: string }[]
}

export interface CoordinacionInput {
  titulo: string
  descripcion: string
  status?: string
  reglas: ReglaCoordinacion[]
}

export interface GradoOpcion {
  id: string
  nombre: string
  orden: number
  secciones: { id: string; nombre: string; modalidad: string }[]
  curso_ids: string[]
}

export interface OpcionesCoordinacion {
  grados: GradoOpcion[]
  cursos: { id: string; nombre: string }[]
}

export interface PreviaCoordinacion {
  clases: number
  secciones: number
}

/** «Materia · lugar», p. ej. «Español · todos los grados» o «Todas las materias · Séptimo 1». */
export function reglaLabel(r: Pick<ReglaCoordinacion, 'curso' | 'grado' | 'seccion'>) {
  const materia = r.curso || 'Todas las materias'
  const lugar = r.seccion ? `${r.grado ?? ''} ${r.seccion}`.trim() : r.grado || 'todos los grados'
  return `${materia} · ${lugar}`
}

export async function listCoordinaciones() {
  return apiRequest<Coordinacion[]>('/coordinaciones/')
}

export async function createCoordinacion(body: CoordinacionInput) {
  return apiRequest<Coordinacion>('/coordinaciones/', { method: 'POST', body })
}

export async function updateCoordinacion(id: string, body: CoordinacionInput) {
  return apiRequest<Coordinacion>(`/coordinaciones/${id}`, { method: 'PUT', body })
}

export async function getOpcionesCoordinacion() {
  return apiRequest<OpcionesCoordinacion>('/coordinaciones/opciones')
}

export async function previaCoordinacion(body: CoordinacionInput) {
  return apiRequest<PreviaCoordinacion>('/coordinaciones/previa', { method: 'POST', body })
}

export async function misCoordinaciones() {
  return apiRequest<Coordinacion[]>('/coordinaciones/mias')
}

export async function coordinacionesDeUsuario(code: string) {
  return apiRequest<{ coordinaciones: string[] }>(`/coordinaciones/usuario/${encodeURIComponent(code)}`)
}

export async function asignarCoordinaciones(code: string, coordinaciones: string[]) {
  return apiRequest<void>(`/coordinaciones/usuario/${encodeURIComponent(code)}`, {
    method: 'PUT',
    body: { coordinaciones },
  })
}
