import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function headerLabel(key: string) {
  return key.replace(/_/g, ' ')
}

export function downloadTablePdf(filename: string, title: string, rows: Record<string, unknown>[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text(title || 'Listado', 14, 16)
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  autoTable(doc, {
    startY: 22,
    head: [headers.map(headerLabel)],
    body: rows.map((row) => headers.map((h) => String(row[h] ?? ''))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30] },
  })
  const name = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename.replace(/\.csv$/i, '')}.pdf`
  doc.save(name)
}
