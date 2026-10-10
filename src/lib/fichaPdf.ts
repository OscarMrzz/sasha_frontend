import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { UserOptions } from 'jspdf-autotable'
import { formatHoras, minutosSemana } from '#/helpers/horas'
import { roleLabel } from '#/helpers/permissions'
import type { UserFicha } from '#/services/personas'

type RGB = [number, number, number]

/** Paleta sobria: tinta oscura + un único acento sólido (sin degradados). */
const INK: RGB = [26, 34, 48] // #1a2230
const ACCENT: RGB = [255, 80, 35] // #ff5023
const SOFT: RGB = [110, 118, 130]
const HEAD_FILL: RGB = [237, 240, 244]
const ZEBRA: RGB = [248, 249, 251]
const RULE: RGB = [208, 214, 222]

/** Márgenes consistentes (mm). */
const MARGIN = 14
/** Reserva superior para el encabezado en páginas de continuación. */
const TABLE_TOP = 17
/** Reserva inferior para el pie de página. */
const TABLE_BOTTOM = 18
/** Espacio en blanco entre secciones (mm). */
const GAP = 9
/** Altura mínima que debe quedar para no dejar un título huérfano. */
const SECCION_MIN = 26

const yn = (v: boolean) => (v ? 'Sí' : 'No')
const dash = (v?: string | number | null) =>
  v === undefined || v === null || v === '' ? '—' : String(v)

function joinName(p?: UserFicha['perfil']) {
  if (!p) return ''
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
    .filter(Boolean)
    .join(' ')
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Fecha/hora del encabezado en formato `dd/mm/aaaa hh:mm`. */
function fechaGeneracion(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Título del documento según el contenido de la ficha. */
function tituloFicha(ficha: UserFicha): string {
  if (ficha.alumno) return 'Ficha de alumno'
  if (ficha.maestro) return 'Ficha de maestro'
  if (ficha.responsable) return 'Ficha de responsable'
  return 'Ficha de usuario'
}

interface HeaderData {
  institucion?: string
  titulo: string
  nombre: string
  codigo: string
  generado: string
}

/** Encabezado de la primera página: banda institucional + nombre y código. */
function drawHeader(doc: jsPDF, data: HeaderData) {
  const w = doc.internal.pageSize.getWidth()

  doc.setFillColor(INK[0], INK[1], INK[2])
  doc.rect(0, 0, w, 20, 'F')

  doc.setTextColor(255, 255, 255)
  if (data.institucion) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(data.institucion.toUpperCase(), MARGIN, 7.5, { charSpace: 0.4 })
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(200, 206, 214)
  doc.text(`Generado: ${data.generado}`, w - MARGIN, 7.5, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(data.titulo, MARGIN, 16)

  // Línea fina de acento bajo el encabezado.
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.setLineWidth(0.8)
  doc.line(MARGIN, 22.5, w - MARGIN, 22.5)

  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(data.nombre, MARGIN, 30)

  doc.setTextColor(SOFT[0], SOFT[1], SOFT[2])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(data.codigo, MARGIN, 35.5)
}

/** Encabezado compacto para las páginas de continuación. */
function drawContinuationHeader(
  doc: jsPDF,
  data: { institucion?: string; titulo: string },
) {
  const w = doc.internal.pageSize.getWidth()

  doc.setFillColor(INK[0], INK[1], INK[2])
  doc.rect(0, 0, w, 11, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (data.institucion) {
    doc.setTextColor(255, 255, 255)
    doc.text(data.institucion.toUpperCase(), MARGIN, 7, { charSpace: 0.4 })
  }

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(200, 206, 214)
  doc.text(data.titulo, w - MARGIN, 7, { align: 'right' })

  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.setLineWidth(0.6)
  doc.line(MARGIN, 12.5, w - MARGIN, 12.5)
}

/** Pie de página con numeración «Página X de Y». */
function drawFooter(doc: jsPDF, page: number, total: number, izquierda: string) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const y = h - 11

  doc.setDrawColor(RULE[0], RULE[1], RULE[2])
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y - 4, w - MARGIN, y - 4)

  doc.setTextColor(SOFT[0], SOFT[1], SOFT[2])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(izquierda, MARGIN, y)
  doc.text(`Página ${page} de ${total}`, w - MARGIN, y, { align: 'right' })
}

/** Título de sección en MAYÚSCULAS con regla fina y un tramo de acento. */
function sectionTitle(doc: jsPDF, y: number, titulo: string): number {
  const w = doc.internal.pageSize.getWidth()

  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(titulo.toUpperCase(), MARGIN, y, { charSpace: 0.5 })

  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y + 1.8, MARGIN + 14, y + 1.8)
  doc.setDrawColor(RULE[0], RULE[1], RULE[2])
  doc.setLineWidth(0.2)
  doc.line(MARGIN + 14, y + 1.8, w - MARGIN, y + 1.8)

  return y + 5
}

/** Si no queda espacio suficiente, salta de página dejando sitio al encabezado. */
function ensureSpace(doc: jsPDF, y: number, needed = SECCION_MIN): number {
  const h = doc.internal.pageSize.getHeight()
  if (y + needed > h - TABLE_BOTTOM) {
    doc.addPage()
    return TABLE_TOP + 7
  }
  return y
}

function lastY(doc: jsPDF, fallback: number): number {
  const t = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
  return t?.finalY ?? fallback
}

/** Opciones comunes a todas las tablas (paleta, tipografía, márgenes). */
function baseTableOptions(): UserOptions {
  return {
    margin: { top: TABLE_TOP, right: MARGIN, bottom: TABLE_BOTTOM, left: MARGIN },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.6,
      cellPadding: { top: 1.7, bottom: 1.7, left: 2, right: 2 },
      textColor: INK,
      lineColor: RULE,
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: INK,
      fontStyle: 'bold',
      fontSize: 8.6,
      lineColor: RULE,
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: ZEBRA },
    bodyStyles: { textColor: INK },
  }
}

function kvTable(doc: jsPDF, startY: number, title: string, rows: [string, string][]): number {
  const y = sectionTitle(doc, startY, title)
  autoTable(doc, {
    ...baseTableOptions(),
    theme: 'striped',
    startY: y,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52, textColor: INK } },
    body: rows.length ? rows : [['—', '—']],
  })
  return lastY(doc, y + 20)
}

function dataTable(
  doc: jsPDF,
  startY: number,
  title: string,
  head: string[],
  body: string[][],
): number {
  const y = sectionTitle(doc, startY, title)
  autoTable(doc, {
    ...baseTableOptions(),
    theme: 'grid',
    startY: y,
    head: [head],
    body: body.length ? body : [head.map(() => '—')],
  })
  return lastY(doc, y + 20)
}

export interface FichaPdfOpts {
  /** Nombre de la institución para el encabezado/pie; si falta, se omite. */
  institucion?: string
  /** Fecha/hora del encabezado; por defecto, la actual. */
  fecha?: Date
}

/** Construye el documento PDF de la ficha (sin guardarlo). */
export function buildFichaPdfDoc(ficha: UserFicha, opts: FichaPdfOpts = {}): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const u = ficha.user
  const p = ficha.perfil
  const nombre = joinName(p) || u.username
  const institucion = opts.institucion?.trim() || undefined
  const titulo = tituloFicha(ficha)
  const generado = fechaGeneracion(opts.fecha ?? new Date())

  drawHeader(doc, { institucion, titulo, nombre, codigo: u.code, generado })

  let y = 42
  const alumnoMatricula =
    ficha.alumno?.matriculas.find((x) => x.status === 'ACTIVE') ?? ficha.alumno?.matriculas[0]
  y = kvTable(doc, y, 'Cuenta', [
    ['Código', u.code],
    ['Username', u.username],
    ['Rol', u.roles[0] ? roleLabel(u.roles[0]) : '—'],
    ['Estado', u.statususer],
    ...(alumnoMatricula
      ? ([['Grado / sección', `${alumnoMatricula.grado} · sec ${alumnoMatricula.seccion}`]] as [
          string,
          string,
        ][])
      : []),
  ])

  if (p) {
    y = kvTable(doc, ensureSpace(doc, y + GAP), 'Perfil', [
      ['Nombre', joinName(p)],
      ['Sexo', dash(p.sexo)],
      ['Fecha de nacimiento', dash(p.fecha_nacimiento?.slice(0, 10))],
      ['Teléfono', dash(p.telefono_contacto)],
      ['Identidad', dash(p.numero_identidad)],
      ['Tipo de documento', dash(p.tipo_documento_identidad)],
    ])
  }

  const a = ficha.alumno
  if (a) {
    y = kvTable(doc, ensureSpace(doc, y + GAP), 'Alumno · historial', [
      ['Primer ingreso', yn(a.procede_otra_institucion)],
      ['Institución de origen', dash(a.nombre_institucion_origen)],
      ['Religión', dash(a.religion)],
      ['Condición de aprendizaje', yn(a.presenta_condicion_aprendizaje)],
      ['Dispositivo móvil', yn(a.cuenta_dispositivo_movil)],
      ['Ha repetido grado', yn(a.ha_repetido_grado)],
      ['Alergias', a.alergias.join(', ') || 'Ninguna'],
      ['Condiciones', a.condiciones_aprendizaje.join(', ') || 'Ninguna'],
      ['Deportes / pasatiempos', a.deportes_pasatiempos.join(', ') || '—'],
      ['Dispositivos', a.dispositivos_moviles.join(', ') || '—'],
      ['Convivencia', a.convivencia.join(', ') || '—'],
      [
        'Grados repetidos',
        a.grados_repetidos.map((g) => `${g.grado_nombre}${g.anio ? ` (${g.anio})` : ''}`).join(', ') ||
          '—',
      ],
    ])
    y = dataTable(
      doc,
      ensureSpace(doc, y + GAP),
      'Matrículas',
      ['Periodo', 'Grado', 'Sección', 'Modalidad', 'Reingreso', 'Cursos retrasados', 'Estado'],
      a.matriculas.map((m) => [
        `${m.periodo} (${m.anio_lectivo})`,
        m.grado,
        m.seccion,
        m.modalidad,
        yn(m.es_reingreso),
        (m.cursos_retrasados ?? []).join(', ') || '—',
        m.status,
      ]),
    )
    y = dataTable(
      doc,
      ensureSpace(doc, y + GAP),
      'Responsables',
      ['Nombre', 'Código', 'Parentesco', 'Principal', 'Teléfono', 'Profesión'],
      a.responsables.map((r) => [
        r.nombre,
        dash(r.user_code),
        dash(r.parentesco),
        yn(r.es_principal),
        dash(r.telefono),
        dash(r.profesion),
      ]),
    )
    if (a.documentos.length) {
      y = dataTable(
        doc,
        ensureSpace(doc, y + GAP),
        'Documentos de matrícula',
        ['Tipo', 'Observaciones', 'Estado'],
        a.documentos.map((d) => [d.tipo, dash(d.observaciones), d.status]),
      )
    }
  }

  const m = ficha.maestro
  if (m) {
    y = dataTable(
      doc,
      ensureSpace(doc, y + GAP),
      'Cursos',
      ['Curso', 'Grado', 'Sección', 'Horas'],
      m.asignaciones.length
        ? m.asignaciones.map((as) => {
            const min = minutosSemana(as.horarios)
            return [as.curso, dash(as.grado), as.seccion, min ? formatHoras(min) : '—']
          })
        : [['—', '—', '—', '—']],
    )
    if (m.disponibilidad.length) {
      y = dataTable(
        doc,
        ensureSpace(doc, y + GAP),
        'Disponibilidad',
        ['Modalidad', 'Día', 'Inicio', 'Fin', 'Disponible', 'Motivo'],
        m.disponibilidad.map((d) => [
          dash(d.modalidad),
          dash(d.dia_semana),
          dash(d.hora_inicio?.slice(0, 5)),
          dash(d.hora_fin?.slice(0, 5)),
          yn(d.es_disponible),
          dash(d.motivo),
        ]),
      )
    }
  }

  const r = ficha.responsable
  if (r) {
    y = kvTable(doc, ensureSpace(doc, y + GAP), 'Responsable', [
      ['Profesión', dash(r.profesion)],
      ['Domicilio', dash(r.direccion_domicilio)],
    ])
    if (r.direcciones_trabajo.length) {
      y = dataTable(
        doc,
        ensureSpace(doc, y + GAP),
        'Direcciones de trabajo',
        ['Dirección', 'Teléfono'],
        r.direcciones_trabajo.map((d) => [d.direccion, dash(d.telefono_trabajo)]),
      )
    }
    y = dataTable(
      doc,
      ensureSpace(doc, y + GAP),
      'Alumnos a cargo',
      ['Nombre', 'Código', 'Parentesco'],
      r.alumnos_a_cargo.map((al) => [al.nombre, dash(al.user_code), dash(al.parentesco)]),
    )
  }

  // Encabezado de continuación y pie («Página X de Y») en todas las páginas.
  const total = doc.getNumberOfPages()
  const izquierda = institucion ? `Sasha · ${institucion}` : 'Sasha'
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    if (page > 1) drawContinuationHeader(doc, { institucion, titulo })
    drawFooter(doc, page, total, izquierda)
  }

  return doc
}

/** Variante `Blob` de la ficha, para empaquetarla (p. ej. en el ZIP de matrícula). */
export function buildFichaPdfBlob(ficha: UserFicha, opts?: FichaPdfOpts): Blob {
  return buildFichaPdfDoc(ficha, opts).output('blob')
}

export function downloadFichaPdf(ficha: UserFicha, opts?: FichaPdfOpts) {
  buildFichaPdfDoc(ficha, opts).save(`ficha-${ficha.user.code}.pdf`)
}
