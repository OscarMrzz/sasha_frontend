import { jsPDF } from 'jspdf'
import {
  buildDocumentosMatriculaZip,
  carnetSvgBlob,
  fichaPdfBlob,
  nombreZip,
} from '#/helpers/documentos-matricula'
import type { DocumentoMatriculaItem } from '#/helpers/documentos-matricula'
import type { AprobacionPrematricula } from '#/services/prematricula'
import { getFicha } from '#/services/personas'
import {
  getContratoPeriodo,
  getContratoPeriodoArchivo,
} from '#/services/catalogos'
import { getLoginConfig } from '#/services/configuracion'

export async function documentosPrematriculaAprobada(
  result: AprobacionPrematricula,
) {
  const credentials = result.credenciales ?? []
  const codigo =
    result.matricula.alumno_code ??
    credentials.find((c) => c.rol === 'alumno')?.codigo
  if (!codigo)
    throw new Error(
      'La matrícula se aprobó, pero no se recibió el código del alumno para generar sus documentos.',
    )
  const [ficha, institucion] = await Promise.all([
    getFicha(codigo),
    getLoginConfig(),
  ])
  const nombre =
    [
      ficha.perfil?.primer_nombre,
      ficha.perfil?.segundo_nombre,
      ficha.perfil?.primer_apellido,
      ficha.perfil?.segundo_apellido,
    ]
      .filter(Boolean)
      .join(' ') || codigo
  const docs: DocumentoMatriculaItem[] = []
  for (const c of credentials) {
    const pdf = new jsPDF()
    pdf.setFontSize(18)
    pdf.text(institucion.nombre_institucion || 'Sasha', 20, 25)
    pdf.setFontSize(13)
    pdf.text('Credenciales de acceso', 20, 45)
    pdf.setFontSize(11)
    pdf.text(
      [
        `Nombre: ${c.nombre ?? ''}`,
        `Rol: ${c.rol ?? ''}`,
        `Código: ${c.codigo}`,
        `Contraseña temporal: ${c.password}`,
        'Conserve este documento en un lugar seguro.',
      ],
      20,
      60,
    )
    docs.push({
      nombre: `credencial-${c.rol ?? 'usuario'}-${c.codigo}.pdf`,
      data: pdf.output('blob'),
    })
  }
  const mat =
    ficha.alumno?.matriculas.find((m) => m.id === result.matricula.id) ??
    ficha.alumno?.matriculas[0]
  docs.push({
    nombre: 'ficha-alumno.pdf',
    data: fichaPdfBlob(ficha, { institucion: institucion.nombre_institucion }),
  })
  docs.push({
    nombre: 'carnet.svg',
    data: await carnetSvgBlob(
      {
        nombre: nombre.toUpperCase(),
        codigo,
        dni: ficha.perfil?.numero_identidad ?? '',
        grado: mat ? `${mat.grado} ${mat.seccion}` : '',
        jornada: mat?.modalidad ?? '',
        vigencia: mat ? `${mat.anio_lectivo} - ${mat.anio_lectivo + 1}` : '',
        fotoKey: ficha.perfil?.path_imagen ?? undefined,
        logoUrl: institucion.logo_url || undefined,
      },
      institucion.nombre_institucion,
    ),
  })
  let aviso: string | null = null
  try {
    const [meta, archivo] = await Promise.all([
      getContratoPeriodo(result.matricula.periodo_academico_id),
      getContratoPeriodoArchivo(result.matricula.periodo_academico_id),
    ])
    docs.push({ nombre: meta.archivo_nombre, data: archivo })
  } catch {
    aviso = 'La carpeta se generó sin contrato. Revisa el contrato del período.'
  }
  const blob = await buildDocumentosMatriculaZip(docs)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreZip(nombre, codigo)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return aviso
}
