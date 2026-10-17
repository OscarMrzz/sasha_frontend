import { apiRequest } from '#/lib/api'

/**
 * Descarga un archivo protegido con la sesión activa: pide el binario (`raw`),
 * lo convierte a Blob y dispara la descarga con el nombre original.
 */
export async function descargarArchivo(path: string, nombre: string): Promise<void> {
  const res = await apiRequest<Response>(path, { raw: true })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre || 'archivo'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // El navegador necesita el URL vivo hasta que arranca la descarga; revocar de
  // inmediato puede cancelarla en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
