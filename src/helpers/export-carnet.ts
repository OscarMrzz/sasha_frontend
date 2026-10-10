import { jsPDF } from 'jspdf'

/**
 * Exportadores del carnet estudiantil. Todas las funciones adjuntan SIEMPRE
 * frente + reverso en un único archivo y son autocontenidas (no dependen de
 * estado de React: reciben los elementos `<svg>`).
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
/** Dimensiones del `viewBox` del carnet (ver `CarnetEstudiantil`). */
const VIEW_W = 380
const VIEW_H = 600
/** Separación entre frente y reverso en el archivo combinado. */
const GAP = 40
/** Escala por defecto al rasterizar (PNG/PDF). */
const ESCALA = 3
/** Tiempo máximo de espera al rasterizar un SVG antes de abortar. */
const TIMEOUT_RASTERIZADO_MS = 10_000

type SvgArg = SVGSVGElement | null | undefined

/** Serializa un SVG con `xmlns` y tamaño explícitos para que abra en cualquier visor. */
function serializar(svg: SVGSVGElement): string {
  const copia = svg.cloneNode(true) as SVGSVGElement
  copia.setAttribute('xmlns', SVG_NS)
  copia.setAttribute('width', String(VIEW_W))
  copia.setAttribute('height', String(VIEW_H))
  return new XMLSerializer().serializeToString(copia)
}

function nombreConExtension(name: string, ext: string): string {
  const base = name.replace(/\.(svg|png|pdf)$/i, '')
  return `${base}.${ext}`
}

function descargar(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** SVG único con el frente y el reverso lado a lado. */
function svgCombinado(front: SVGSVGElement, back: SVGSVGElement): string {
  const ancho = VIEW_W * 2 + GAP
  return [
    `<svg xmlns="${SVG_NS}" width="${ancho}" height="${VIEW_H}" viewBox="0 0 ${ancho} ${VIEW_H}">`,
    `<rect width="${ancho}" height="${VIEW_H}" fill="#ffffff" />`,
    `<g transform="translate(0,0)">${serializar(front)}</g>`,
    `<g transform="translate(${VIEW_W + GAP},0)">${serializar(back)}</g>`,
    '</svg>',
  ].join('')
}

/** Variante `Blob` del SVG combinado (frente + reverso), sin descargarlo. */
export function carnetSvgBlob(svgFrontEl: SvgArg, svgBackEl: SvgArg): Blob {
  if (!svgFrontEl || !svgBackEl) throw new Error('Faltan los SVG del carnet.')
  return new Blob([svgCombinado(svgFrontEl, svgBackEl)], {
    type: 'image/svg+xml;charset=utf-8',
  })
}

function svgADataUrl(svg: SVGSVGElement): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializar(svg))}`
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timeout = window.setTimeout(() => {
      img.onload = null
      img.onerror = null
      reject(new Error('No se pudo rasterizar el carnet (tiempo de espera).'))
    }, TIMEOUT_RASTERIZADO_MS)
    img.onload = () => {
      window.clearTimeout(timeout)
      resolve(img)
    }
    img.onerror = () => {
      window.clearTimeout(timeout)
      reject(new Error('No se pudo rasterizar el carnet.'))
    }
    img.src = src
  })
}

/** Lienzo combinado (frente + reverso) sobre fondo blanco. */
export async function renderCarnetCanvas(
  svgFrontEl: SvgArg,
  svgBackEl: SvgArg,
  escala: number = ESCALA,
): Promise<HTMLCanvasElement> {
  if (!svgFrontEl || !svgBackEl) throw new Error('Faltan los SVG del carnet.')

  const [imgFront, imgBack] = await Promise.all([
    cargarImagen(svgADataUrl(svgFrontEl)),
    cargarImagen(svgADataUrl(svgBackEl)),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = (VIEW_W * 2 + GAP) * escala
  canvas.height = VIEW_H * escala
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el lienzo de exportación.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(imgFront, 0, 0, VIEW_W * escala, VIEW_H * escala)
  ctx.drawImage(
    imgBack,
    (VIEW_W + GAP) * escala,
    0,
    VIEW_W * escala,
    VIEW_H * escala,
  )
  return canvas
}

/** Descarga un único `.svg` con frente + reverso. */
export function exportCarnetSvg(
  name: string,
  svgFrontEl: SvgArg,
  svgBackEl: SvgArg,
): void {
  if (!svgFrontEl || !svgBackEl) throw new Error('Faltan los SVG del carnet.')
  descargar(carnetSvgBlob(svgFrontEl, svgBackEl), nombreConExtension(name, 'svg'))
}

/** Descarga un único `.png` con frente + reverso (fondo blanco). */
export async function exportCarnetPng(
  name: string,
  svgFrontEl: SvgArg,
  svgBackEl: SvgArg,
  escala: number = ESCALA,
): Promise<void> {
  if (!svgFrontEl || !svgBackEl) throw new Error('Faltan los SVG del carnet.')
  const canvas = await renderCarnetCanvas(svgFrontEl, svgBackEl, escala)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('No se pudo generar el PNG.')
  descargar(blob, nombreConExtension(name, 'png'))
}

/** Descarga un único `.pdf` A4 horizontal con frente + reverso centrados. */
export async function exportCarnetPdf(
  name: string,
  svgFrontEl: SvgArg,
  svgBackEl: SvgArg,
  escala: number = ESCALA,
): Promise<void> {
  if (!svgFrontEl || !svgBackEl) throw new Error('Faltan los SVG del carnet.')
  const canvas = await renderCarnetCanvas(svgFrontEl, svgBackEl, escala)
  const dataUrl = canvas.toDataURL('image/png')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margen = 10
  const ratio = canvas.width / canvas.height

  let w = pageW - margen * 2
  let h = w / ratio
  if (h > pageH - margen * 2) {
    h = pageH - margen * 2
    w = h * ratio
  }
  const x = (pageW - w) / 2
  const y = (pageH - h) / 2

  doc.addImage(dataUrl, 'PNG', x, y, w, h)
  doc.save(nombreConExtension(name, 'pdf'))
}
