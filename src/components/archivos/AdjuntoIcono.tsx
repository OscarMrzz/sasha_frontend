import { File, FileImage, FileSpreadsheet, FileText } from 'lucide-react'
import { categoriaAdjunto } from '#/helpers/adjuntos'

/** Ícono del adjunto según su tipo (imagen, PDF, Word, Excel o genérico). */
export function AdjuntoIcono({
  contentType,
  nombre = '',
  size = 22,
}: {
  contentType: string
  nombre?: string
  size?: number
}) {
  const cat = categoriaAdjunto(contentType, nombre)
  if (cat === 'imagen') return <FileImage size={size} aria-hidden />
  if (cat === 'pdf') return <FileText size={size} aria-hidden />
  if (cat === 'excel') return <FileSpreadsheet size={size} aria-hidden />
  if (cat === 'word') return <FileText size={size} aria-hidden />
  return <File size={size} aria-hidden />
}
