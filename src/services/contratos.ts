import { apiRequest, apiRequestList } from '#/lib/api'

export type TipoContrato = 'maestro' | 'administracion' | 'matricula' | 'otros'
export type VisibilidadContrato = 'privado' | 'publico'

export interface Contrato {
  id: string
  titulo: string
  tipo: TipoContrato
  visibilidad: VisibilidadContrato
  autor: string
  autor_code: string
  creado_en: string
  actualizado_en: string
  puede_editar: boolean
  puede_eliminar: boolean
  /** Nombre original del archivo en la bóveda (`.docx`/`.pdf`). */
  archivo_nombre?: string
  /** `Content-Type` del archivo. */
  archivo_mime?: string
  /** Legacy: contratos del formato anterior con contenido estructurado (sin archivo). */
  contenido_json?: unknown
  contenido_html?: string
}

/** Metadatos editables de un contrato (sin archivo). */
export interface ContratoMetaInput {
  titulo: string
  tipo: TipoContrato
  visibilidad: VisibilidadContrato
}

/** Alta/edición de contrato: metadatos + archivo opcional (obligatorio solo al crear). */
export interface ContratoArchivoInput extends ContratoMetaInput {
  archivo?: File | null
}

export interface ListContratosParams {
  q?: string
  tipo?: string
  visibilidad?: string
}

export const TIPOS_CONTRATO: TipoContrato[] = ['maestro', 'administracion', 'matricula', 'otros']
export const VISIBILIDADES_CONTRATO: VisibilidadContrato[] = ['privado', 'publico']

/** Solo estos formatos y tamaño máximo (§004). Fuente de verdad final: el servidor. */
export const CONTRATO_ACCEPT = '.docx,.pdf'
export const CONTRATO_MAX_BYTES = 20 * 1024 * 1024

const EXTENSIONES_PERMITIDAS = ['.docx', '.pdf']
const MIMES_PERMITIDOS = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/** Valida extensión/MIME/tamaño en cliente. Devuelve el mensaje de error o `null`. */
export function validarArchivoContrato(file: File | null | undefined): string | null {
  if (!file) return 'Selecciona un archivo .docx o .pdf.'
  const nombre = file.name.toLowerCase()
  if (!EXTENSIONES_PERMITIDAS.some((ext) => nombre.endsWith(ext))) {
    return 'Solo se permiten archivos .docx o .pdf.'
  }
  if (file.size > CONTRATO_MAX_BYTES) return 'El archivo no puede superar los 20 MB.'
  // Algunos navegadores dejan `type` vacío; se valida solo cuando viene informado.
  if (file.type && !MIMES_PERMITIDOS.includes(file.type)) {
    return 'Solo se permiten archivos .docx o .pdf.'
  }
  return null
}

/** Arma el `FormData` multipart que espera `POST/PUT /contratos/`. */
export function buildContratoFormData(input: ContratoArchivoInput): FormData {
  const form = new FormData()
  form.append('titulo', input.titulo.trim())
  form.append('tipo', input.tipo)
  form.append('visibilidad', input.visibilidad)
  if (input.archivo) form.append('archivo', input.archivo)
  return form
}

export async function listContratos(params: ListContratosParams = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.tipo) search.set('tipo', params.tipo)
  if (params.visibilidad) search.set('visibilidad', params.visibilidad)
  const qs = search.toString()
  return apiRequestList<Contrato>(`/contratos/${qs ? `?${qs}` : ''}`)
}

export async function getContrato(id: string) {
  return apiRequest<Contrato>(`/contratos/${id}`)
}

/** Alta multipart: `archivo` + `titulo` + `tipo` + `visibilidad`. */
export async function createContrato(formData: FormData) {
  return apiRequest<Contrato>('/contratos/', { method: 'POST', body: formData })
}

/** Edición multipart: metadatos y, opcionalmente, reemplazo de archivo. */
export async function updateContrato(id: string, formData: FormData) {
  return apiRequest<Contrato>(`/contratos/${id}`, { method: 'PUT', body: formData })
}

export async function deleteContrato(id: string) {
  return apiRequest<{ message: string }>(`/contratos/${id}`, { method: 'DELETE' })
}

/** Descarga el binario del contrato con la sesión activa (`raw` → `Blob`). */
export async function getContratoArchivo(id: string, opts: { download?: boolean } = {}) {
  const res = await apiRequest<Response>(
    `/contratos/${encodeURIComponent(id)}/archivo${opts.download ? '?download=1' : ''}`,
    { raw: true },
  )
  return res.blob()
}

/** Descarga el original con su nombre real (`.docx`/`.pdf`). */
export async function descargarContratoArchivo(contrato: Contrato) {
  const blob = await getContratoArchivo(contrato.id, { download: true })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = contrato.archivo_nombre?.trim() || `contrato-${contrato.id}`
  link.click()
  URL.revokeObjectURL(url)
}

/** Extensión del archivo del contrato deducida del nombre o del MIME. */
export function extensionContrato(contrato: Contrato): 'docx' | 'pdf' | null {
  const nombre = (contrato.archivo_nombre ?? '').toLowerCase()
  if (nombre.endsWith('.docx')) return 'docx'
  if (nombre.endsWith('.pdf')) return 'pdf'
  const mime = contrato.archivo_mime ?? ''
  if (mime.includes('wordprocessingml')) return 'docx'
  if (mime.includes('pdf')) return 'pdf'
  return null
}

/** «Maestro» / «Administración» / «Matrícula» / «Otros». */
export function tipoContratoLabel(t: TipoContrato): string {
  const labels: Record<TipoContrato, string> = {
    maestro: 'Maestro',
    administracion: 'Administración',
    matricula: 'Matrícula',
    otros: 'Otros',
  }
  return labels[t]
}

/** «Privado» / «Público». */
export function visibilidadLabel(v: VisibilidadContrato): string {
  return v === 'privado' ? 'Privado' : 'Público'
}

/** Clase de badge para el listado; se combina con `.badge` base. */
export function contratoBadgeClass(literal: TipoContrato | VisibilidadContrato): string {
  return `badge badge--contrato-${literal}`
}

/** «02/10/2026». El backend devuelve «YYYY-MM-DD HH24:MI»; tolera separador espacio o «T». */
export function fechaContrato(iso: string) {
  if (!iso) return ''
  const [fecha] = iso.split(/[ T]/)
  const [y, m, d] = fecha.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
