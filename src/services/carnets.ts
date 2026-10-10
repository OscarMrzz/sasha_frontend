import { apiRequest } from '#/lib/api'

/** Datos públicos de la institución para el encabezado del carnet. */
export interface InstitucionPublica {
  nombre_institucion: string
  logo_institucion_key?: string
}

/** `GET /configuracion/institucion` (permiso `carnets:get`). */
export async function getInstitucion() {
  return apiRequest<InstitucionPublica>('/configuracion/institucion')
}
