import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { roleLabel } from '#/helpers/permissions'
import { labelAsistencia, type UserFicha } from '#/services/personas'

const yn = (v: boolean) => (v ? 'Sí' : 'No')
const dash = (v?: string | number | null) => (v === undefined || v === null || v === '' ? '—' : String(v))

function joinName(p?: UserFicha['perfil']) {
  if (!p) return ''
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ')
}

function kvTable(doc: jsPDF, startY: number, title: string, rows: [string, string][]) {
  doc.setFontSize(11)
  doc.text(title, 14, startY)
  autoTable(doc, {
    startY: startY + 3,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    body: rows,
  })
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20
}

function dataTable(doc: jsPDF, startY: number, title: string, head: string[], body: string[][]) {
  doc.setFontSize(11)
  doc.text(title, 14, startY)
  autoTable(doc, {
    startY: startY + 3,
    head: [head],
    body: body.length ? body : [['—']],
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: [30, 30, 30] },
  })
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 20
}

export function downloadFichaPdf(ficha: UserFicha) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const u = ficha.user
  const p = ficha.perfil
  const nombre = joinName(p) || u.username
  doc.setFontSize(16)
  doc.text(nombre, 14, 16)
  doc.setFontSize(10)
  doc.text(`Ficha de usuario · ${u.code}`, 14, 22)

  let y = 28
  y = kvTable(doc, y, 'Cuenta', [
    ['Código', u.code],
    ['Username', u.username],
    ['Roles', u.roles.map((r) => roleLabel(r)).join(', ') || '—'],
    ['Estado', u.statususer],
  ])

  const op = ficha.operativo
  if (op) {
    const clase =
      op.clase_actual.length > 0
        ? op.clase_actual
            .map((s) => `${s.curso_nombre} (${s.hora_inicio}-${s.hora_fin})`)
            .join('; ')
        : 'Sin clase en este horario'
    y = kvTable(doc, y + 8, 'Operativo', [
      ['Consulta', `${op.consulta.fecha} ${op.consulta.hora}`],
      ['Clase actual', clase],
    ])
    if (op.horario_dia.length) {
      y = dataTable(
        doc,
        y + 8,
        'Horario del día',
        ['Hora', 'Curso', 'Sección', 'Asistencia'],
        op.horario_dia.map((s) => [
          `${s.hora_inicio}-${s.hora_fin}`,
          s.curso_nombre,
          `${s.grado_nombre} sec ${s.seccion_nombre}`,
          s.asistencia_nombre || labelAsistencia(s.asistencia_codigo),
        ]),
      )
    }
  }

  if (p) {
    y = kvTable(doc, y + 8, 'Perfil', [
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
    y = kvTable(doc, y + 8, 'Alumno · historial', [
      ['Otra institución', yn(a.procede_otra_institucion)],
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
        a.grados_repetidos.map((g) => `${g.grado_nombre}${g.anio ? ` (${g.anio})` : ''}`).join(', ') || '—',
      ],
    ])
    y = dataTable(
      doc,
      y + 8,
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
      y + 8,
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
        y + 8,
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
      y + 8,
      'Asignación docente',
      ['Curso', 'Sección', 'Periodo', 'Estado'],
      m.asignaciones.map((as) => [as.curso, as.seccion, as.periodo, as.status]),
    )
    if (m.disponibilidad.length) {
      y = dataTable(
        doc,
        y + 8,
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
    y = kvTable(doc, y + 8, 'Responsable', [
      ['Profesión', dash(r.profesion)],
      ['Domicilio', dash(r.direccion_domicilio)],
    ])
    if (r.direcciones_trabajo.length) {
      y = dataTable(
        doc,
        y + 8,
        'Direcciones de trabajo',
        ['Dirección', 'Teléfono'],
        r.direcciones_trabajo.map((d) => [d.direccion, dash(d.telefono_trabajo)]),
      )
    }
    y = dataTable(
      doc,
      y + 8,
      'Alumnos a cargo',
      ['Nombre', 'Código', 'Parentesco'],
      r.alumnos_a_cargo.map((al) => [al.nombre, dash(al.user_code), dash(al.parentesco)]),
    )
  }

  doc.save(`ficha-${u.code}.pdf`)
}
