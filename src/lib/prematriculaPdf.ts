import { jsPDF } from 'jspdf'

export function descargarCodigoPrematriculaPdf(opts: {
  codigo: string
  institucion: string
  url: string
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 18
  const contentWidth = pageWidth - margin * 2

  doc.setFillColor(247, 248, 250)
  doc.rect(0, 0, pageWidth, 297, 'F')
  doc.setFillColor(233, 112, 33)
  doc.rect(margin, 18, 3, 27, 'F')
  doc.setTextColor(38, 43, 51)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('SASHA · ADMISIONES', margin + 8, 23)
  doc.setFontSize(20)
  doc.text('Comprobante de prematrícula', margin + 8, 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(doc.splitTextToSize(opts.institucion, contentWidth - 8), margin + 8, 41)

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(218, 222, 228)
  doc.roundedRect(margin, 57, contentWidth, 45, 3, 3, 'FD')
  doc.setTextColor(91, 99, 110)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('CÓDIGO DE SEGUIMIENTO · 8 CARACTERES', margin + 8, 69)
  doc.setTextColor(38, 43, 51)
  doc.setFont('courier', 'bold')
  doc.setFontSize(18)
  doc.text(doc.splitTextToSize(opts.codigo, contentWidth - 16), margin + 8, 83)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(91, 99, 110)
  doc.text('Guarda este comprobante. Necesitarás el código para consultar tu solicitud.', margin + 8, 94)

  let y = 117
  doc.setTextColor(38, 43, 51)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Cómo consultar el avance', margin, y)
  y += 11
  const instructions = [
    `Abre la página pública: ${opts.url}`,
    'Pulsa “Consultar avance de la prematrícula”.',
    'Escribe el código de seguimiento que aparece en este comprobante.',
    'La página mostrará si la solicitud está pendiente, aprobada o denegada.',
    'Si la deniegan, podrás leer el motivo, corregir la solicitud y reenviarla con el mismo código.',
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(54, 61, 70)
  instructions.forEach((text, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${text}`, contentWidth - 5)
    doc.text(lines, margin + 2, y)
    y += lines.length * 6 + 5
  })

  doc.setFillColor(255, 247, 239)
  doc.setDrawColor(244, 204, 176)
  doc.roundedRect(margin, y + 3, contentWidth, 24, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(119, 65, 28)
  doc.setFontSize(10)
  doc.text('Estado inicial: pendiente de revisión', margin + 7, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(91, 72, 58)
  doc.text('Conserva este código hasta que termine el proceso de admisión.', margin + 7, y + 20)

  doc.save(`seguimiento-prematricula-${opts.codigo}.pdf`)
}
