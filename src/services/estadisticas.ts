import { apiRequest } from '#/lib/api'

export interface EstadisticasCounts {
  alumnos: number
  maestros: number
  matriculas: number
  obligaciones_mora: number
  tareas: number
}

export interface PanelCursoGrado {
  grado_id: string
  grado_nombre: string
  curso_id: string
  curso_nombre: string
  total: number
}

export interface PanelAsistencia {
  tipo_codigo: string
  tipo_nombre: string
  total: number
}

export interface PanelMaestros {
  maestro_id: string
  nombre: string
  cursos: number
  asignaciones: number
}

export async function getCounts() {
  return apiRequest<EstadisticasCounts>('/estadisticas/counts')
}

export async function getPanelCursoGrado() {
  return apiRequest<PanelCursoGrado[]>('/estadisticas/paneles/curso-grado')
}

export async function getPanelAsistencia() {
  return apiRequest<PanelAsistencia[]>('/estadisticas/paneles/asistencia')
}

export async function getPanelMaestros() {
  return apiRequest<PanelMaestros[]>('/estadisticas/paneles/maestros')
}
