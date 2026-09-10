import { apiRequest } from '#/lib/api'

export interface Configuracion {
  id: string
  nombre_institucion: string
  codigo_sace?: string
  modalidad_sace?: string
  calificacion_minima_aprobacion: number
  calificacion_honor_merito: number
  calificacion_excelencia: number
  calificacion_rango_bajo: number
  logo_app_key?: string
  logo_institucion_key?: string
}

export interface ConfiguracionUpdate {
  nombre_institucion?: string
  codigo_sace?: string
  modalidad_sace?: string
  calificacion_minima_aprobacion?: number
  calificacion_honor_merito?: number
  calificacion_excelencia?: number
  calificacion_rango_bajo?: number
  logo_app_key?: string
  logo_institucion_key?: string
}

export async function getConfiguracion() {
  return apiRequest<Configuracion>('/configuracion/')
}

export async function updateConfiguracion(body: ConfiguracionUpdate) {
  return apiRequest<Configuracion>('/configuracion/', { method: 'PUT', body })
}
