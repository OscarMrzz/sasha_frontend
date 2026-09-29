import { dimensionLabel, mensajeExtremo, NIVEL_ETIQUETA } from '#/helpers/estadisticas-mensajes'
import type { ChartRegistry } from '#/components/estadisticas/EChart'
import type { AnalisisResponse, Bloque } from '#/services/estadisticas'

interface Seccion {
  titulo: string
  hoja: string
  bloque: Bloque
  unidad: string
  graficas?: string[]
}

function secciones(data: AnalisisResponse): Seccion[] {
  const out: Seccion[] = []
  const gen = data.calificaciones?.general
  if (gen) {
    out.push({
      titulo: 'Calificaciones (nota general)',
      hoja: 'Calificaciones',
      bloque: gen,
      unidad: '',
      graficas: ['analisis-general-caja'],
    })
  }
  for (const bt of data.calificaciones?.por_tipo ?? []) {
    out.push({ titulo: `Calificaciones · ${bt.tipo_nombre}`, hoja: bt.tipo_nombre, bloque: bt.bloque, unidad: '%' })
  }
  if (data.asistencia) out.push({ titulo: 'Asistencia', hoja: 'Asistencia', bloque: data.asistencia, unidad: '%' })
  if (data.cumplimiento) {
    out.push({ titulo: 'Cumplimiento del plan', hoja: 'Cumplimiento', bloque: data.cumplimiento, unidad: '%' })
  }
  return out
}

const COLUMNAS = ['Grupo', 'Datos', 'Promedio', 'Mediana', 'Q1', 'Q3', 'Mín', 'Máx', 'z', 'd', 'Nivel']

function filas(b: Bloque) {
  return b.grupos.map((g) => [g.nombre, g.n, g.valor, g.mediana, g.q1, g.q3, g.min, g.max, g.z, g.metodo === 'd' ? g.d : '', NIVEL_ETIQUETA[g.nivel]])
}

function nombreArchivo(data: AnalisisResponse, ext: string) {
  const fecha = new Date().toISOString().slice(0, 10)
  return `analisis-${data.agrupar_por}-${fecha}.${ext}`
}

export async function descargarAnalisisPdf(data: AnalisisResponse, registry: ChartRegistry) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  doc.setFontSize(16)
  doc.text(`Análisis por ${dimensionLabel(data.agrupar_por).toLowerCase()}`, 14, 16)
  doc.setFontSize(9)
  doc.text(`Generado el ${new Date().toLocaleString('es')}`, 14, 22)
  let y = 30

  const salto = (necesario: number) => {
    if (y + necesario > alto - 12) {
      doc.addPage()
      y = 16
    }
  }

  for (const s of secciones(data)) {
    salto(30)
    doc.setFontSize(13)
    doc.text(s.titulo, 14, y)
    y += 6
    doc.setFontSize(9)
    const r = s.bloque.resumen
    doc.text(
      `Promedio general: ${r.media_general}${s.unidad} · Desviación estándar entre grupos: ${r.desviacion} · ${r.n_grupos} grupos · ${r.n_datos} datos`,
      14,
      y,
    )
    y += 5
    for (const [e, tipo] of [
      [s.bloque.mas_alto, 'alto'],
      [s.bloque.mas_bajo, 'bajo'],
    ] as const) {
      if (!e) continue
      const texto = doc.splitTextToSize(
        `Más ${tipo}: ${e.nombre} (${e.valor}${s.unidad}). ${mensajeExtremo(e, tipo)}`,
        ancho - 28,
      ) as string[]
      salto(texto.length * 4 + 2)
      doc.text(texto, 14, y)
      y += texto.length * 4 + 1
    }

    const imgs = (s.graficas ?? []).map((k) => registry.get(k)?.toDataURL()).filter((x): x is string => Boolean(x))
    if (imgs.length) {
      const w = (ancho - 28 - (imgs.length - 1) * 6) / imgs.length
      const h = Math.min(80, w * 0.55)
      salto(h + 4)
      imgs.forEach((img, i) => doc.addImage(img, 'PNG', 14 + i * (w + 6), y, w, h))
      y += h + 4
    }

    autoTable(doc, {
      startY: y,
      head: [COLUMNAS],
      body: filas(s.bloque).map((f) => f.map(String)),
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 30, 30] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }
  doc.save(nombreArchivo(data, 'pdf'))
}

function nombreHoja(nombre: string, usados: Set<string>) {
  const base = nombre.replace(/[\\/*?:[\]]/g, ' ').slice(0, 28).trim() || 'Hoja'
  let n = base
  for (let i = 2; usados.has(n); i++) n = `${base} ${i}`
  usados.add(n)
  return n
}

export async function descargarAnalisisExcel(data: AnalisisResponse) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sasha'
  const usados = new Set<string>()

  const resumen = wb.addWorksheet(nombreHoja('Resumen', usados))
  resumen.addRow([`Análisis por ${dimensionLabel(data.agrupar_por).toLowerCase()}`]).font = { bold: true, size: 14 }
  resumen.addRow([`Generado el ${new Date().toLocaleString('es')}`])
  resumen.addRow([])
  const head = resumen.addRow(['Sección', 'Promedio general', 'Desviación', 'Grupos', 'Datos', 'Más alto', 'Comentario', 'Más bajo', 'Comentario'])
  head.font = { bold: true }
  for (const s of secciones(data)) {
    const b = s.bloque
    resumen.addRow([
      s.titulo,
      b.resumen.media_general,
      b.resumen.desviacion,
      b.resumen.n_grupos,
      b.resumen.n_datos,
      b.mas_alto ? `${b.mas_alto.nombre} (${b.mas_alto.valor})` : '',
      b.mas_alto ? mensajeExtremo(b.mas_alto, 'alto') : '',
      b.mas_bajo ? `${b.mas_bajo.nombre} (${b.mas_bajo.valor})` : '',
      b.mas_bajo ? mensajeExtremo(b.mas_bajo, 'bajo') : '',
    ])
  }
  resumen.columns.forEach((c, i) => {
    c.width = i === 0 ? 34 : i === 6 || i === 8 ? 60 : 16
  })

  for (const s of secciones(data)) {
    const ws = wb.addWorksheet(nombreHoja(s.hoja, usados))
    ws.addRow(COLUMNAS).font = { bold: true }
    filas(s.bloque).forEach((f) => ws.addRow(f))
    ws.columns.forEach((c, i) => {
      c.width = i === 0 ? 34 : i === 9 ? 18 : 11
    })
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo(data, 'xlsx')
  a.click()
  URL.revokeObjectURL(url)
}
