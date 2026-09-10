import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DIA_SHORT, type TimeInterval } from '#/lib/horarioGrid'
import type { HorarioSlotDetail } from '#/services/horarios'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

type PdfBrand = {
  appName?: string
  institucionNombre?: string
}

type ScheduleBlock = {
  title: string
  subtitle?: string
  slots: HorarioSlotDetail[]
  recess?: TimeInterval | null
  jornadaFin?: string
  cellText: (s: HorarioSlotDetail) => string
}

type TableRow =
  | { kind: 'slot'; start: string; end: string; extra: boolean }
  | { kind: 'recess'; start: string; end: string }

function hm(t: string): string {
  return (t ?? '').slice(0, 5)
}

function buildRows(slots: HorarioSlotDetail[], recess?: TimeInterval | null, jornadaFin?: string): TableRow[] {
  const map = new Map<string, TimeInterval>()
  for (const s of slots) {
    const start = hm(s.hora_inicio)
    const end = hm(s.hora_fin)
    if (start && end) map.set(start, { start, end })
  }
  const intervals = [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
  const fin = hm(jornadaFin ?? '')
  const out: TableRow[] = []
  const recessNorm =
    recess && hm(recess.start) && hm(recess.end)
      ? { start: hm(recess.start), end: hm(recess.end) }
      : null

  for (let i = 0; i < intervals.length; i++) {
    const cur = intervals[i]
    const prev = i > 0 ? intervals[i - 1] : null
    if (prev && prev.end < cur.start && (!fin || prev.end < fin || cur.start <= fin)) {
      if (!fin || prev.end < fin) {
        out.push({ kind: 'recess', start: prev.end, end: cur.start })
      }
    }
    out.push({
      kind: 'slot',
      start: cur.start,
      end: cur.end,
      extra: Boolean(fin && (cur.start >= fin || cur.end > fin)),
    })
  }

  if (recessNorm && !out.some((r) => r.kind === 'recess')) {
    const withRecess: TableRow[] = []
    let inserted = false
    for (const r of out) {
      if (!inserted && r.kind === 'slot' && r.start >= recessNorm.end && (!fin || recessNorm.start < fin)) {
        withRecess.push({ kind: 'recess', start: recessNorm.start, end: recessNorm.end })
        inserted = true
      }
      withRecess.push(r)
    }
    if (inserted) return withRecess
  }

  return out
}

function buildTable(
  slots: HorarioSlotDetail[],
  cellText: (s: HorarioSlotDetail) => string,
  recess?: TimeInterval | null,
  jornadaFin?: string,
): { head: string[][]; body: string[][]; extraRowIndexes: number[] } {
  const byKey = new Map<string, HorarioSlotDetail[]>()
  for (const s of slots) {
    const k = `${s.dia_semana}|${hm(s.hora_inicio)}`
    const list = byKey.get(k) ?? []
    list.push(s)
    byKey.set(k, list)
  }
  const rows = buildRows(slots, recess, jornadaFin)
  const head = [['Hora', ...DAYS.map((d) => DIA_SHORT[d] ?? String(d))]]
  const extraRowIndexes: number[] = []
  const body = rows.map((row, idx) => {
    if (row.kind === 'recess') {
      return [`${row.start}–${row.end} Recreo`, ...DAYS.map(() => 'Recreo')]
    }
    if (row.extra) extraRowIndexes.push(idx)
    const label = row.extra ? `${row.start}–${row.end} (extra)` : `${row.start}–${row.end}`
    const cells = [label]
    for (const d of DAYS) {
      const items = byKey.get(`${d}|${row.start}`) ?? []
      cells.push(items.map(cellText).join('\n') || '—')
    }
    return cells
  })
  return { head, body, extraRowIndexes }
}

function drawBrand(doc: jsPDF, brand: PdfBrand | undefined, y: number): number {
  const app = brand?.appName || 'Sasha'
  const inst = brand?.institucionNombre?.trim()
  doc.setFontSize(11)
  doc.setTextColor(30)
  doc.text(app, 14, y)
  if (inst) {
    doc.setFontSize(9)
    doc.setTextColor(70)
    doc.text(inst, 14, y + 5)
    doc.setTextColor(0)
    return y + 12
  }
  doc.setTextColor(0)
  return y + 8
}

function drawBlock(doc: jsPDF, block: ScheduleBlock, startY: number, brand?: PdfBrand): number {
  const pageW = doc.internal.pageSize.getWidth()
  let y = drawBrand(doc, brand, startY)
  doc.setFontSize(13)
  doc.setTextColor(0)
  doc.text(block.title, 14, y)
  y += 6
  if (block.subtitle) {
    doc.setFontSize(9)
    doc.setTextColor(90)
    doc.text(block.subtitle, 14, y)
    doc.setTextColor(0)
    y += 5
  }
  const { head, body, extraRowIndexes } = buildTable(
    block.slots,
    block.cellText,
    block.recess,
    block.jornadaFin,
  )
  const extraSet = new Set(extraRowIndexes)
  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle' },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    columnStyles: { 0: { cellWidth: 28 } },
    margin: { left: 14, right: 14 },
    tableWidth: pageW - 28,
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const row = body[data.row.index]
      if (row?.[0]?.includes('Recreo') || (typeof row?.[1] === 'string' && row[1] === 'Recreo')) {
        data.cell.styles.fillColor = [230, 230, 230]
        data.cell.styles.textColor = [60, 60, 60]
      }
      if (extraSet.has(data.row.index)) {
        data.cell.styles.fillColor = [243, 226, 160]
        data.cell.styles.textColor = [42, 33, 8]
      }
    },
  })
  // @ts-expect-error lastAutoTable injected by plugin
  return (doc.lastAutoTable?.finalY as number | undefined) ?? y + 40
}

function saveDoc(doc: jsPDF, filename: string) {
  doc.save(filename)
}

/** Vista filtrada actual (una grilla). */
export function downloadHorarioActualPdf(opts: {
  title: string
  subtitle?: string
  slots: HorarioSlotDetail[]
  recess?: TimeInterval | null
  jornadaFin?: string
  brand?: PdfBrand
  cellText?: (s: HorarioSlotDetail) => string
  filename?: string
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  drawBlock(
    doc,
    {
      title: opts.title,
      subtitle: opts.subtitle,
      slots: opts.slots,
      recess: opts.recess,
      jornadaFin: opts.jornadaFin,
      cellText: opts.cellText ?? ((s) => s.label || s.curso_nombre),
    },
    14,
    opts.brand,
  )
  saveDoc(doc, opts.filename ?? 'horario-actual.pdf')
}

/** Una página (o bloque) por maestro. */
export function downloadHorariosMaestrosPdf(opts: {
  versionLabel: string
  periodoNombre: string
  slots: HorarioSlotDetail[]
  recess?: TimeInterval | null
  jornadaFin?: string
  brand?: PdfBrand
  filename?: string
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const byMaestro = new Map<string, { nombre: string; slots: HorarioSlotDetail[] }>()
  for (const s of opts.slots) {
    const cur = byMaestro.get(s.maestro_id) ?? { nombre: s.maestro_nombre, slots: [] }
    cur.slots.push(s)
    byMaestro.set(s.maestro_id, cur)
  }
  const entries = [...byMaestro.entries()].sort((a, b) => a[1].nombre.localeCompare(b[1].nombre))
  if (entries.length === 0) {
    drawBrand(doc, opts.brand, 14)
    doc.setFontSize(12)
    doc.text('Sin asignaciones', 14, 28)
  } else {
    entries.forEach(([_, m], i) => {
      if (i > 0) doc.addPage()
      drawBlock(
        doc,
        {
          title: `Horario · ${m.nombre}`,
          subtitle: `${opts.versionLabel} · ${opts.periodoNombre}`,
          slots: m.slots,
          recess: opts.recess,
          jornadaFin: opts.jornadaFin,
          cellText: (s) => `${s.curso_nombre}\n${s.grado_nombre} sec${s.seccion_nombre}`,
        },
        14,
        opts.brand,
      )
    })
  }
  saveDoc(doc, opts.filename ?? 'horarios-maestros.pdf')
}

/** Una página por grado-sección (alumnos). */
export function downloadHorariosAlumnosPdf(opts: {
  versionLabel: string
  periodoNombre: string
  slots: HorarioSlotDetail[]
  recess?: TimeInterval | null
  jornadaFin?: string
  brand?: PdfBrand
  filename?: string
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const bySeccion = new Map<string, { label: string; slots: HorarioSlotDetail[] }>()
  for (const s of opts.slots) {
    const label = `${s.grado_nombre} · sec${s.seccion_nombre}`
    const cur = bySeccion.get(s.seccion_id) ?? { label, slots: [] }
    cur.slots.push(s)
    bySeccion.set(s.seccion_id, cur)
  }
  const entries = [...bySeccion.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label))
  if (entries.length === 0) {
    drawBrand(doc, opts.brand, 14)
    doc.setFontSize(12)
    doc.text('Sin asignaciones', 14, 28)
  } else {
    entries.forEach(([_, sec], i) => {
      if (i > 0) doc.addPage()
      drawBlock(
        doc,
        {
          title: `Horario alumnos · ${sec.label}`,
          subtitle: `${opts.versionLabel} · ${opts.periodoNombre}`,
          slots: sec.slots,
          recess: opts.recess,
          jornadaFin: opts.jornadaFin,
          cellText: (s) => `${s.curso_nombre}\n${s.maestro_nombre}`,
        },
        14,
        opts.brand,
      )
    })
  }
  saveDoc(doc, opts.filename ?? 'horarios-alumnos.pdf')
}
