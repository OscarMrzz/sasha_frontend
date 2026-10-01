import type { ChartRegistry } from '#/components/estadisticas/EChart'
import { lempiras, mesAnio } from '#/lib/fechas-padre'
import type { AnaliticaPagos, GrupoPago } from '#/services/pagos'

function dias(n: number) {
  if (n === 0) return 'el mismo día del vencimiento'
  const abs = Math.abs(n).toLocaleString('es-HN', { maximumFractionDigits: 1 })
  return `${abs} días ${n < 0 ? 'antes' : 'después'} del vencimiento`
}

function resumen(data: AnaliticaPagos): [string, string][] {
  const { alumnos, tiempo_pago: tp, puntualidad: p, recaudado: r } = data
  const completos = data.meses.filter((m) => m.completo).map((m) => mesAnio(m.anio, m.mes))
  return [
    ['Alumnos al día', `${alumnos.pct_al_dia}% (${alumnos.al_dia} de ${alumnos.total})`],
    ['Tiempo de pago promedio', tp.pagos ? dias(tp.promedio_dias) : 'Sin pagos'],
    ['Tiempo de pago mediano', tp.pagos ? dias(tp.mediana_dias) : 'Sin pagos'],
    ['Pagado a tiempo', `${p.pct_puntual}% (${p.puntual} de ${p.vencidas} vencidas)`],
    ['Pagado con mora', `${p.pct_con_mora}% (${p.con_mora})`],
    ['Vencido sin pagar', `${p.pct_vencido_sin_pagar}% (${p.vencido_sin_pagar})`],
    [`Recaudado ${r.mes_anterior.etiqueta}`, `${lempiras(r.mes_anterior.monto)} (${r.mes_anterior.pagos} pagos)`],
    [`Recaudado ${r.mes_actual.etiqueta}`, `${lempiras(r.mes_actual.monto)} (${r.mes_actual.pagos} pagos)`],
    ['Meses pagados al 100 %', completos.length ? completos.join(', ') : 'Ninguno'],
    ['Alumnos en mora', String(data.morosos.length)],
  ]
}

const COL_GRUPO = ['Grupo', 'Vencidas', 'Pagadas', '% pagado']
const filasGrupo = (gs: GrupoPago[]) => gs.map((g) => [g.nombre, g.vencidas, g.pagadas, g.pct_pagado])

const COL_MES = ['Mes', 'Mensualidades', 'A tiempo', '% a tiempo', 'Pagadas hoy', '% pagado hoy', 'Completo']
const filasMes = (data: AnaliticaPagos) =>
  data.meses.map((m) => [mesAnio(m.anio, m.mes), m.total, m.puntuales, m.pct_puntual, m.pagadas, m.pct_pagado, m.completo ? 'Sí' : 'No'])

const COL_MOROSO = ['Código', 'Alumno', 'Grado', 'Sección', 'Modalidad', 'Meses vencidos', 'Monto vencido', 'Meses', 'Responsable', 'Teléfono']
const filasMoroso = (data: AnaliticaPagos) =>
  data.morosos.map((m) => [
    m.codigo,
    m.nombre,
    m.grado,
    m.seccion,
    m.modalidad,
    m.meses_vencidos,
    m.monto_vencido,
    m.meses.join(', '),
    m.responsable_nombre,
    m.responsable_telefono,
  ])

function nombreArchivo(ext: string) {
  return `analitica-pagos-${new Date().toISOString().slice(0, 10)}.${ext}`
}

export async function descargarAnaliticaPagosPdf(data: AnaliticaPagos, registry: ChartRegistry) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  doc.setFontSize(16)
  doc.text(`Analítica de pagos${data.periodo ? ` · ${data.periodo.nombre}` : ''}`, 14, 16)
  doc.setFontSize(9)
  doc.text(`Generado el ${new Date().toLocaleString('es')}`, 14, 22)
  let y = 28

  const salto = (necesario: number) => {
    if (y + necesario > alto - 12) {
      doc.addPage()
      y = 16
    }
  }
  const finalY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  const titulo = (t: string) => {
    salto(14)
    doc.setFontSize(13)
    doc.text(t, 14, y)
    y += 4
  }
  const imagenes = (keys: string[], hMax: number) => {
    const imgs = keys.map((k) => registry.get(k)?.toDataURL()).filter((x): x is string => Boolean(x))
    if (!imgs.length) return
    const celda = (ancho - 28 - (imgs.length - 1) * 6) / imgs.length
    const medidas = imgs.map((img) => {
      const { width, height } = doc.getImageProperties(img)
      const h = Math.min(hMax, (celda * height) / width)
      return { w: (h * width) / height, h }
    })
    const hFila = Math.max(...medidas.map((m) => m.h))
    salto(hFila + 4)
    imgs.forEach((img, i) => doc.addImage(img, 'PNG', 14 + i * (celda + 6), y, medidas[i].w, medidas[i].h))
    y += hFila + 6
  }
  const tabla = (head: string[], body: (string | number)[][]) => {
    autoTable(doc, {
      startY: y,
      head: [head],
      body: body.map((f) => f.map(String)),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 30, 30] },
      margin: { left: 14, right: 14 },
    })
    y = finalY() + 8
  }

  titulo('Resumen')
  tabla(['Indicador', 'Valor'], resumen(data))

  titulo('Pagado a tiempo por mes')
  imagenes(['ap-columnas', 'ap-dona'], 75)
  tabla(COL_MES, filasMes(data))

  titulo('Pagado por grado')
  imagenes(['ap-grado'], 70)
  tabla(COL_GRUPO, filasGrupo(data.por_grado))

  titulo('Pagado por modalidad')
  imagenes(
    data.por_modalidad.slice(0, 6).map((_, i) => `ap-modalidad-${i}`),
    40,
  )
  tabla(COL_GRUPO, filasGrupo(data.por_modalidad))

  titulo(`Alumnos en mora (${data.morosos.length})`)
  tabla(
    ['Código', 'Alumno', 'Grado', 'Meses', 'Monto', 'Responsable', 'Teléfono'],
    data.morosos.map((m) => [
      m.codigo,
      m.nombre,
      [m.grado, m.seccion].filter(Boolean).join(' '),
      m.meses_vencidos,
      lempiras(m.monto_vencido),
      m.responsable_nombre,
      m.responsable_telefono,
    ]),
  )

  doc.save(nombreArchivo('pdf'))
}

export async function descargarAnaliticaPagosExcel(data: AnaliticaPagos) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Sasha'

  const hoja = (nombre: string, head: string[], body: (string | number)[][], anchos: number[]) => {
    const ws = wb.addWorksheet(nombre)
    ws.addRow(head).font = { bold: true }
    body.forEach((f) => ws.addRow(f))
    ws.columns.forEach((c, i) => {
      c.width = anchos[i] ?? 14
    })
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  const res = wb.addWorksheet('Resumen')
  res.addRow([`Analítica de pagos${data.periodo ? ` · ${data.periodo.nombre}` : ''}`]).font = { bold: true, size: 14 }
  res.addRow([`Generado el ${new Date().toLocaleString('es')}`])
  res.addRow([])
  res.addRow(['Indicador', 'Valor']).font = { bold: true }
  resumen(data).forEach((f) => res.addRow(f))
  res.getColumn(1).width = 30
  res.getColumn(2).width = 60

  hoja('Por grado', COL_GRUPO, filasGrupo(data.por_grado), [30])
  hoja('Por modalidad', COL_GRUPO, filasGrupo(data.por_modalidad), [30])
  hoja('Meses', COL_MES, filasMes(data), [20])
  hoja('Morosos', COL_MOROSO, filasMoroso(data), [12, 34, 16, 10, 16, 14, 14, 40, 30, 14])

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo('xlsx')
  a.click()
  URL.revokeObjectURL(url)
}
