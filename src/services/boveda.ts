import { apiRequest } from '#/lib/api'

export type BovedaTipo =
  | 'perfil_foto'
  | 'recibo_pago'
  | 'logo_app'
  | 'logo_institucion'
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
