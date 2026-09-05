import { apiRequest } from '#/lib/api'

export interface PersonaCreate {
  user_id: string
  primer_nombre: string
  segundo_nombre?: string
  primer_apellido: string
  segundo_apellido?: string
  numero_identidad?: string
  tipo_documento_identidad?: string
  status: string
  procede_otra_institucion?: boolean
  profesion?: string
  direccion_domicilio?: string
}

export interface Alumno {
  id: string
  perfil_id: string
  user_id: string
  user_code?: string
  nombre: string
  status: string
}

export interface Maestro {
  id: string
  perfil_id: string
  user_id: string
  user_code?: string
  nombre: string
  status: string
}

export interface Responsable {
  id: string
  perfil_id: string
  user_id: string
  user_code?: string
  nombre: string
  status: string
}

export async function listAlumnos() {
  return apiRequest<Alumno[]>('/personas/alumnos')
}

export async function createAlumno(body: PersonaCreate) {
  return apiRequest<Alumno>('/personas/alumnos', { method: 'POST', body })
}

export async function listMaestros() {
  return apiRequest<Maestro[]>('/personas/maestros')
}

export async function createMaestro(body: PersonaCreate) {
  return apiRequest<Maestro>('/personas/maestros', { method: 'POST', body })
}

export async function listResponsables() {
  return apiRequest<Responsable[]>('/personas/responsables')
}

export async function createResponsable(body: PersonaCreate) {
  return apiRequest<Responsable>('/personas/responsables', { method: 'POST', body })
}
