import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  estadoExamen,
  fechaCorta,
  fechasEntre,
  horaSalidaConBloques,
  labelPill,
  normalizarHora,
  soloFecha,
} from '#/lib/examenes'
import type { ExamenAsignacion, ExamenDetalle } from '#/services/examenes'

type ExamenPdfOptions = {
  detail: ExamenDetalle
  asignaciones?: ExamenAsignacion[]
  title?: string
  filename?: string
}

function cellText(a: ExamenAsignacion): string {
  return labelPill(
    a.curso_nombre ?? 'Materia',
    a.grado_nombre ?? '',
    a.seccion_nombre ?? '',
  )
}

/** Exporta el horario de exámenes con la misma rejilla fecha × bloque del tablero. */
export function downloadExamenHorarioPdf(opts: ExamenPdfOptions) {
  const { detail } = opts
  const asignaciones = opts.asignaciones ?? detail.asignaciones
  const bloques = [...detail.bloques].sort((a, b) => a.orden - b.orden)
  const dates = fechasEntre(detail.fecha_inicio, detail.fecha_fin)
  const fechas =
    dates.length > 0
      ? dates
      : [...new Set(asignaciones.map((a) => soloFecha(a.fecha)))].sort()

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(11)
  doc.setTextColor(30)
  doc.text('Sasha', 14, 14)
  doc.setFontSize(13)
  doc.setTextColor(0)
  doc.text(opts.title ?? `Horario de exámenes · v${detail.numero_version}`, 14, 22)
  doc.setFontSize(9)
  doc.setTextColor(90)
  const estado = estadoExamen(detail.estado, detail.es_activa)
  doc.text(
    [
      detail.periodo_nombre || 'Periodo',
      detail.parcial_nombre || 'Parcial',
      detail.modalidad_nombre || 'Modalidad',
      `${fechaCorta(detail.fecha_inicio)} – ${fechaCorta(detail.fecha_fin)}`,
      estado.label,
    ].join(' · '),
    14,
    28,
  )
  doc.setTextColor(0)

  const head =
    bloques.length > 0
      ? [[
          'Fecha / salida',
          ...bloques.map(
            (b) =>
              `Bloque ${b.orden}\n${normalizarHora(b.hora_inicio)}–${normalizarHora(b.hora_fin)}`,
          ),
        ]]
      : [['Fecha', 'Exámenes']]

  const body = fechas.map((fecha) => {
    const delDia = asignaciones.filter((a) => soloFecha(a.fecha) === fecha)
    const salida = horaSalidaConBloques(delDia, bloques, fecha)
    const primera = `${fechaCorta(fecha)}\nSalida ${salida || '—'}`
    if (bloques.length === 0) {
      return [primera, delDia.map(cellText).join('\n') || '—']
    }
    return [
      primera,
      ...bloques.map((bloque) => {
        const items = delDia.filter((a) => a.bloque_orden === bloque.orden)
        return items.map(cellText).join('\n') || '—'
      }),
    ]
  })

  autoTable(doc, {
    startY: 34,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle' },
    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
    columnStyles: { 0: { cellWidth: 30 } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const row = body[data.row.index]
      if (typeof row[data.column.index] === 'string' && row[data.column.index] === '—') {
        data.cell.styles.textColor = [140, 140, 140]
      }
    },
  })

  const base = detail.periodo_nombre || 'examenes'
  const filename =
    opts.filename ??
    `${base}-${detail.parcial_nombre || 'parcial'}-v${detail.numero_version}.pdf`
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-')
  doc.save(filename)
}
