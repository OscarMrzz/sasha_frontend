import { ApiError, apiRequest, userMessageFromError } from '#/lib/api'

export type BovedaTipo =
  | 'perfil_foto'
  | 'recibo_pago'
  | 'logo_app'
  | 'logo_institucion'
  | 'login_fondo'
  | 'documento_matricula'

export interface BovedaUploadResult {
  id: string
  tipo: string
  object_key: string
  url: string
}

export async function upload(file: File, tipo: BovedaTipo) {
  const form = new FormData()
  form.append('file', file)
  form.append('tipo', tipo)
  return apiRequest<BovedaUploadResult>('/boveda/upload', { method: 'POST', body: form })
}

/** Nombre legible del tipo, para el mensaje de error («No se pudo cargar …»). */
const ETIQUETA_TIPO: Record<BovedaTipo, string> = {
  perfil_foto: 'la foto de perfil',
  logo_institucion: 'el logo de la institución',
  logo_app: 'el logo de la aplicación',
  login_fondo: 'el fondo de la pantalla de login',
  recibo_pago: 'el recibo',
  documento_matricula: 'el documento de matrícula',
}

/** Motivo corto según el código de storage que devuelve el backend. */
const MOTIVO_STORAGE: Record<string, string> = {
  STORAGE_NOT_CONFIGURED: 'El almacenamiento de archivos no está disponible.',
  STORAGE_BUCKET_INVALID: 'El almacenamiento no está bien configurado.',
  STORAGE_BUCKET_NOT_FOUND: 'El almacenamiento no está bien configurado.',
  STORAGE_ACCESS_DENIED: 'El almacenamiento rechazó las credenciales.',
  STORAGE_UNREACHABLE: 'No se pudo contactar el almacenamiento.',
}

/**
 * Mensaje de error contextual para una subida fallida: dice QUÉ no se pudo
 * cargar (logo, foto, fondo…) y, cuando el backend lo informa, POR QUÉ.
 */
export function uploadErrorMessage(err: unknown, tipo: BovedaTipo): string {
  const base = `No se pudo cargar ${ETIQUETA_TIPO[tipo]}.`
  if (err instanceof ApiError && typeof err.code === 'string') {
    const motivo = MOTIVO_STORAGE[err.code]
    if (motivo) return `${base} ${motivo}`
    return `${base} ${err.message}`
  }
  return `${base} ${userMessageFromError(err)}`
}
