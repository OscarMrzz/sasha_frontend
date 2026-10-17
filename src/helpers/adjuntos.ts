/** Reglas de adjuntos de tarea, alineadas al contrato del backend (imágenes, PDF, Word, Excel). */

/** Tope por defecto de archivos por tarea (coincide con la migración 062). */
export const MAX_ADJUNTOS_TAREA_DEFAULT = 3

/** Peso máximo por defecto de un archivo, en MB (coincide con la migración 062). */
export const MAX_PESO_ARCHIVO_MB_DEFAULT = 20

export type AdjuntoCategoria = 'imagen' | 'pdf' | 'word' | 'excel' | 'otro'

/** MIME canónicos admitidos para Word/Excel (igual que `models.Mime*` del backend). */
const MIME_PDF = 'application/pdf'
const MIME_WORD = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const MIME_EXCEL = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

/** Extensiones admitidas por categoría (para cuando el navegador no informa el MIME). */
const EXT_IMAGEN = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif', '.tif', '.tiff']
const EXT_PDF = ['.pdf']
const EXT_WORD = ['.doc', '.docx']
const EXT_EXCEL = ['.xls', '.xlsx']

function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.')
  return punto >= 0 ? nombre.slice(punto).toLowerCase() : ''
}

function mimeBase(contentType: string): string {
  return (contentType || '').split(';')[0].trim().toLowerCase()
}

/** Categoría del adjunto a partir de su `content_type` (y, si hace falta, su nombre). */
export function categoriaAdjunto(contentType: string, nombre = ''): AdjuntoCategoria {
  const mime = mimeBase(contentType)
  const ext = extensionDe(nombre)
  if (mime.startsWith('image/') || EXT_IMAGEN.includes(ext)) return 'imagen'
  if (mime === MIME_PDF || EXT_PDF.includes(ext)) return 'pdf'
  if (MIME_WORD.has(mime) || EXT_WORD.includes(ext)) return 'word'
  if (MIME_EXCEL.has(mime) || EXT_EXCEL.includes(ext)) return 'excel'
  return 'otro'
}

export function esImagenAdjunto(contentType: string, nombre = ''): boolean {
  return categoriaAdjunto(contentType, nombre) === 'imagen'
}

/** Imagen y PDF se ven inline; el resto (Word/Excel) solo se descargan. */
export function previsualizaAdjunto(contentType: string, nombre = ''): boolean {
  const cat = categoriaAdjunto(contentType, nombre)
  return cat === 'imagen' || cat === 'pdf'
}

export function etiquetaCategoria(cat: AdjuntoCategoria): string {
  if (cat === 'imagen') return 'Imagen'
  if (cat === 'pdf') return 'PDF'
  if (cat === 'word') return 'Word'
  if (cat === 'excel') return 'Excel'
  return 'Archivo'
}

/** Peso legible: «320 KB», «1.2 MB». */
export function formatoPeso(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

/**
 * Valida un archivo antes de subirlo. Devuelve el motivo del rechazo o `null` si es válido.
 * `maxMB` es el tope del periodo; si no se conoce, se usa el valor por defecto.
 */
export function validarAdjunto(file: File, maxMB = MAX_PESO_ARCHIVO_MB_DEFAULT): string | null {
  const limiteMB = maxMB > 0 ? maxMB : MAX_PESO_ARCHIVO_MB_DEFAULT
  if (file.size <= 0) return 'El archivo está vacío.'
  if (file.size > limiteMB * 1024 * 1024) {
    return `El archivo supera el máximo permitido (${limiteMB} MB).`
  }
  if (categoriaAdjunto(file.type, file.name) === 'otro') {
    return 'Solo se permiten imágenes, PDF, Word o Excel.'
  }
  return null
}
