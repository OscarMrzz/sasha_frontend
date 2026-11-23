import { apiRequest, apiRequestList } from '#/lib/api'
import type { Grado, Modalidad, Periodo, Seccion } from '#/services/catalogos'
import type { Matricula, SugerenciaResponse } from '#/services/matricula'
import type { PersonaUpdate, UserFicha } from '#/services/personas'

export const REVISORES_PREMATRICULA = [
  'admin',
  'admin_temporal',
  'director',
  'consejeria',
  'admisiones',
]
export type ModoInstitucional = 'normal' | 'cierre' | 'prematricula'
export interface ConfiguracionModos {
  modo: ModoInstitucional
  modo_efectivo?: ModoInstitucional
  inicio: string | null
  fin: string | null
  pagina_publica_habilitada: boolean
  periodo_destino_id: string | null
  abierta: boolean
}
export interface ResponsablePrematricula extends PersonaUpdate {
  parentesco: string
  es_principal: boolean
}
export interface DatosPrematricula {
  alumno?: PersonaUpdate
  responsables?: ResponsablePrematricula[]
  grado_id?: string
  modalidad_id?: string
  seccion_id?: string
}
export interface SolicitudPrematricula {
  id: string
  codigo?: string
  tipo: 'nuevo' | 'reingreso'
  estado: 'pendiente' | 'en_revision' | 'aprobada' | 'denegada'
  datos: DatosPrematricula
  alumno_id?: string
  alumno_nombre?: string
  observaciones: string
  motivo_denegacion?: string
  recibo_key: string
  creado?: string
  created_at?: string
  corregida_at?: string | null
  matricula_id?: string
}
export interface OpcionesPrematricula {
  grados: Grado[]
  modalidades: Modalidad[]
  secciones: Seccion[]
  periodos: Periodo[]
  parentescos: { id: string; nombre: string }[]
  profesiones: { id: string; nombre: string }[]
  costos_matricula: Record<string, number>
  costos_mensualidad: Record<string, number>
  institucion?: { nombre_institucion: string; logo_url?: string }
}
export interface HijoPrematricula {
  alumno_id: string
  nombre: string
  user_code: string
  sugerencia: SugerenciaResponse
  ficha?: UserFicha
  promedio?: number
}
const base = '/prematricula'
export const getModos = () =>
  apiRequest<ConfiguracionModos>(`${base}/configuracion`)
export const guardarModos = (body: Omit<ConfiguracionModos, 'abierta'>) =>
  apiRequest<ConfiguracionModos>(`${base}/configuracion`, {
    method: 'PUT',
    body,
  })
export const getOpcionesPrematricula = () =>
  apiRequest<OpcionesPrematricula>(`${base}/opciones`)
export const getHijosPrematricula = () =>
  apiRequestList<HijoPrematricula>(`${base}/hijos`)
export const enviarPrematricula = (body: {
  tipo: 'nuevo'
  datos: DatosPrematricula
  observaciones: string
  recibo_key: string
}) =>
  apiRequest<SolicitudPrematricula>(`${base}/solicitudes`, {
    method: 'POST',
    body,
  })
export const enviarReingreso = (body: {
  alumno_id: string
  datos: DatosPrematricula
  observaciones: string
  recibo_key: string
}) =>
  apiRequest<SolicitudPrematricula>(`${base}/reingreso`, {
    method: 'POST',
    body,
  })
export const consultarPrematricula = (codigo: string) =>
  apiRequest<SolicitudPrematricula>(`${base}/consultar`, {
    method: 'POST',
    body: { codigo },
  })
export const corregirPrematricula = (body: {
  codigo: string
  datos: DatosPrematricula
  observaciones: string
  recibo_key: string
}) =>
  apiRequest<SolicitudPrematricula>(`${base}/corregir`, { method: 'PUT', body })
export const listPrematriculas = () =>
  apiRequestList<SolicitudPrematricula>(`${base}/solicitudes`)
export const getPrematricula = (id: string) =>
  apiRequest<SolicitudPrematricula>(
    `${base}/solicitudes/${encodeURIComponent(id)}`,
  )
export const editarPrematricula = (
  id: string,
  body: { datos: DatosPrematricula; observaciones: string },
) =>
  apiRequest<SolicitudPrematricula>(
    `${base}/solicitudes/${encodeURIComponent(id)}`,
    { method: 'PUT', body },
  )
export const eliminarPrematricula = (id: string) =>
  apiRequest(`${base}/solicitudes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
export const denegarPrematricula = (id: string, motivo: string) =>
  apiRequest<SolicitudPrematricula>(
    `${base}/solicitudes/${encodeURIComponent(id)}/denegar`,
    { method: 'POST', body: { motivo } },
  )
export const cambiarEstadoPrematricula = (
  id: string,
  estado: 'pendiente' | 'en_revision',
) =>
  apiRequest<SolicitudPrematricula>(
    `${base}/solicitudes/${encodeURIComponent(id)}/estado`,
    { method: 'PUT', body: { estado } },
  )
export interface AprobacionPrematricula {
  solicitud: SolicitudPrematricula
  matricula: Matricula
  credenciales?: {
    codigo: string
    password: string
    nombre?: string
    rol?: string
  }[]
}
export const aprobarPrematricula = (
  id: string,
  body: { tipo_beca: string; monto_especial?: number; seccion_id?: string },
) =>
  apiRequest<AprobacionPrematricula>(
    `${base}/solicitudes/${encodeURIComponent(id)}/aprobar`,
    { method: 'POST', body },
  )
export async function subirReciboPrematricula(file: File) {
  const body = new FormData()
  body.append('file', file)
  return apiRequest<{ object_key: string }>(`${base}/recibo`, {
    method: 'POST',
    body,
  })
}
export async function subirFotoPrematricula(file: File) {
  const body = new FormData()
  body.append('file', file)
  return apiRequest<{ object_key: string }>(`${base}/foto`, {
    method: 'POST',
    body,
  })
}
export const getReciboPrematricula = (
  identity: { id: string } | { codigo: string },
) =>
  apiRequest<Response>(`${base}/recibo?${new URLSearchParams(identity)}`, {
    raw: true,
  })
export function nombreSolicitud(s: SolicitudPrematricula) {
  if (s.alumno_nombre) return s.alumno_nombre
  const p = s.datos.alumno
  return p
    ? [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
        .filter(Boolean)
        .join(' ')
    : 'Reingreso'
}
