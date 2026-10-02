import type { ClaseSace, DocumentoMaestroSace } from '#/services/sace'

/** Colores sólidos de los grupos de parcial, como en la planilla oficial del SACE. */
export const COLORES_PARCIAL = ['#cfc8f3', '#c7a4f2', '#c4c4c4', '#a9b0f2', '#b8d8c8', '#f2d6a4']

export const NOTA_SACE =
  'Nota: Únicamente ingrese notas en las casillas generadas por el sistema para este documento, de ninguna forma altere el formato y diseño de este.'
export const FIN_SACE = '**********************Fin del documento**********************'

export function encabezadoSace(doc: DocumentoMaestroSace, c: ClaseSace): string[] {
  const codigo = doc.institucion.codigo_sace
  return [
    `${codigo ? `${codigo} | ` : ''}PROF. ${doc.maestro.nombre.toUpperCase()}`,
    `MODALIDAD: ${(c.modalidad || '—').toUpperCase()}`,
    `${c.grado.toUpperCase()} GRADO SECCIÓN ${c.seccion.toUpperCase()}`,
    `JORNADA ${c.jornada.toUpperCase()}`,
    c.materia.toUpperCase(),
  ]
}

function fmt(v: number | null) {
  return v == null ? '' : String(v)
}

function slug(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function nombreArchivo(doc: DocumentoMaestroSace, clase: ClaseSace | null, ext: string) {
  const partes = ['sace', doc.maestro.nombre]
  if (clase) partes.push(clase.materia, clase.grado, `sec${clase.seccion}`)
  partes.push(new Date().toISOString().slice(0, 10))
  return `${partes.map(slug).join('-')}.${ext}`
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function filasPortada(doc: DocumentoMaestroSace) {
  return doc.clases.map((c, i) => [String(i + 1), c.materia, c.grado, c.seccion, c.jornada, String(c.estudiantes.length)])
}

function datosPortada(doc: DocumentoMaestroSace, fecha: string): [string, string][] {
  return [
    ['Institución', doc.institucion.nombre],
    ['Código SACE', doc.institucion.codigo_sace || '—'],
    ['Documento', 'Export SACE de calificaciones e inasistencias'],
    ['Periodo', doc.periodo || '—'],
    ['Fecha de descarga', fecha],
    ['Maestro', doc.maestro.nombre],
    ['Código del maestro', doc.maestro.codigo],
    ['Identidad', doc.maestro.identidad || '—'],
    ['Materias', String(doc.clases.length)],
  ]
}

const COL_PORTADA = ['#', 'Materia', 'Grado', 'Sección', 'Jornada', 'Alumnos']

/** Sin `clase` descarga la portada y todas las clases; con `clase`, solo esa hoja. */
export async function descargarSacePdf(doc: DocumentoMaestroSace, clase: ClaseSace | null) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const ancho = pdf.internal.pageSize.getWidth()
  const finalY = () => (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  const fecha = new Date().toLocaleString('es-HN')

  if (!clase) {
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(doc.institucion.nombre || 'Institución', ancho / 2, 18, { align: 'center' })
    pdf.setFontSize(12)
    pdf.text('Export SACE', ancho / 2, 25, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    autoTable(pdf, {
      startY: 32,
      body: datosPortada(doc, fecha),
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1.2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      margin: { left: 14, right: 14 },
    })
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Materias', 14, finalY() + 8)
    pdf.setFont('helvetica', 'normal')
    autoTable(pdf, {
      startY: finalY() + 11,
      head: [COL_PORTADA],
      body: filasPortada(doc),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 1.5, lineColor: [200, 200, 200], lineWidth: 0.1 },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [20, 20, 20] },
      headStyles: { fillColor: [30, 30, 30] },
      margin: { left: 14, right: 14 },
    })
  }

  const clases = clase ? [clase] : doc.clases
  clases.forEach((c, idx) => {
    if (!clase || idx > 0) pdf.addPage()
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    encabezadoSace(doc, c).forEach((linea, i) => pdf.text(linea, ancho / 2, 14 + i * 5, { align: 'center' }))
    pdf.setFont('helvetica', 'normal')

    const grupo = c.parciales.map((p, i) => ({
      content: `PARCIAL ${p.etiqueta}`,
      colSpan: 2,
      styles: { halign: 'center' as const, fillColor: hexRgb(COLORES_PARCIAL[i % COLORES_PARCIAL.length]) },
    }))
    const sub = c.parciales.flatMap(() => ['INASISTENCIAS', 'NOTA TOTAL'])
    autoTable(pdf, {
      startY: 14 + 5 * 5 + 2,
      head: [
        [
          { content: 'DOCUMENTO', rowSpan: 2, styles: { valign: 'bottom' } },
          { content: 'IDENTIDAD', rowSpan: 2, styles: { valign: 'bottom' } },
          { content: 'NOMBRE', rowSpan: 2, styles: { valign: 'bottom' } },
          ...grupo,
        ],
        sub,
      ],
      body: c.estudiantes.map((e) => [
        e.tipo_documento,
        e.identidad,
        e.nombre,
        ...e.parciales.flatMap((p) => [String(p.inasistencias), fmt(p.nota_total)]),
      ]),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.2, lineColor: [200, 200, 200], lineWidth: 0.1 },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [20, 20, 20] },
      headStyles: { fillColor: [255, 255, 255], textColor: [20, 20, 20], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 2: { cellWidth: 70 } },
      margin: { left: 10, right: 10 },
    })
    let y = finalY() + 5
    pdf.setFontSize(9)
    pdf.setTextColor(200, 30, 30)
    pdf.setFont('helvetica', 'bold')
    pdf.text(FIN_SACE, ancho / 2, y, { align: 'center' })
    y += 5
    pdf.text(NOTA_SACE, ancho / 2, y, { align: 'center', maxWidth: ancho - 20 })
    pdf.setTextColor(0, 0, 0)
    pdf.setFont('helvetica', 'normal')
  })

  pdf.save(nombreArchivo(doc, clase, 'pdf'))
}

function nombreHoja(c: ClaseSace, usados: Set<string>) {
  const base = `${c.materia} ${c.grado} ${c.seccion}`.replace(/[[\]:*?/\\]/g, ' ').slice(0, 28).trim()
  let nombre = base
  let n = 2
  while (usados.has(nombre)) nombre = `${base.slice(0, 26)} ${n++}`
  usados.add(nombre)
  return nombre
}

/** Sin `clase` descarga la portada y todas las clases; con `clase`, solo esa hoja. */
export async function descargarSaceExcel(doc: DocumentoMaestroSace, clase: ClaseSace | null) {
  const { default: ExcelJS } = await import('exceljs')
  type Worksheet = ReturnType<InstanceType<typeof ExcelJS.Workbook>['addWorksheet']>
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sasha'
  const fecha = new Date().toLocaleString('es-HN')
  const borde = { style: 'thin' as const, color: { argb: 'FFC8C8C8' } }
  const bordes = { top: borde, left: borde, bottom: borde, right: borde }
  const relleno = (hex: string) => ({
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: `FF${hex.slice(1).toUpperCase()}` },
  })

  if (!clase) {
    const ws = wb.addWorksheet('Portada')
    ws.addRow([doc.institucion.nombre]).font = { bold: true, size: 14 }
    ws.addRow(['Export SACE']).font = { bold: true, size: 12 }
    ws.addRow([])
    datosPortada(doc, fecha).forEach(([k, v]) => {
      const r = ws.addRow([k, v])
      r.getCell(1).font = { bold: true }
    })
    ws.addRow([])
    ws.addRow(['Materias']).font = { bold: true, size: 12 }
    ws.addRow(COL_PORTADA).font = { bold: true }
    filasPortada(doc).forEach((f) => ws.addRow(f))
    ;[22, 40, 16, 10, 18, 10].forEach((w, i) => {
      ws.getColumn(i + 1).width = w
    })
  }

  const hojaClase = (ws: Worksheet, c: ClaseSace) => {
    const nCols = 3 + c.parciales.length * 2
    encabezadoSace(doc, c).forEach((linea, i) => {
      const fila = i + 1
      ws.mergeCells(fila, 1, fila, nCols)
      const cell = ws.getCell(fila, 1)
      cell.value = linea
      cell.font = { bold: true }
      cell.alignment = { horizontal: 'center' }
    })
    const h1 = 6
    const h2 = 7
    ;['DOCUMENTO', 'IDENTIDAD', 'NOMBRE'].forEach((t, i) => {
      ws.mergeCells(h1, i + 1, h2, i + 1)
      const cell = ws.getCell(h1, i + 1)
      cell.value = t
      cell.font = { bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'bottom' }
    })
    c.parciales.forEach((p, i) => {
      const col = 4 + i * 2
      const color = COLORES_PARCIAL[i % COLORES_PARCIAL.length]
      ws.mergeCells(h1, col, h1, col + 1)
      const g = ws.getCell(h1, col)
      g.value = `PARCIAL ${p.etiqueta}`
      g.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      g.alignment = { horizontal: 'center' }
      g.fill = relleno(color)
      ;['INASISTENCIAS', 'NOTA TOTAL'].forEach((t, j) => {
        const cell = ws.getCell(h2, col + j)
        cell.value = t
        cell.font = { bold: true }
        cell.alignment = { horizontal: 'center' }
      })
    })
    c.estudiantes.forEach((e) => {
      const r = ws.addRow([
        e.tipo_documento,
        e.identidad,
        e.nombre,
        ...e.parciales.flatMap((p) => [p.inasistencias, p.nota_total ?? '']),
      ])
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = bordes
        cell.fill = relleno('#FFFFFF')
      })
    })
    const fin = ws.rowCount + 1
    ws.mergeCells(fin, 1, fin, nCols)
    ws.getCell(fin, 1).value = FIN_SACE
    ws.getCell(fin, 1).font = { bold: true, color: { argb: 'FFC81E1E' } }
    ws.getCell(fin, 1).alignment = { horizontal: 'center' }
    ws.mergeCells(fin + 1, 1, fin + 1, nCols)
    ws.getCell(fin + 1, 1).value = NOTA_SACE
    ws.getCell(fin + 1, 1).font = { bold: true, color: { argb: 'FFC81E1E' } }
    ws.getCell(fin + 1, 1).alignment = { horizontal: 'center', wrapText: true }
    ws.getRow(fin + 1).height = 30
    ws.getColumn(1).width = 12
    ws.getColumn(2).width = 18
    ws.getColumn(3).width = 40
    for (let col = 4; col <= nCols; col++) ws.getColumn(col).width = 14
  }

  const usados = new Set<string>(['Portada'])
  for (const c of clase ? [clase] : doc.clases) hojaClase(wb.addWorksheet(nombreHoja(c, usados)), c)

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo(doc, clase, 'xlsx')
  a.click()
  URL.revokeObjectURL(url)
}
