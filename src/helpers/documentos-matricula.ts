import { zipSync } from 'fflate'
import { createElement, createRef } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { CarnetEstudiantil } from '#/components/carnets/CarnetEstudiantil'
import type { CarnetAlumno, CarnetRef } from '#/components/carnets/CarnetEstudiantil'
import { carnetSvgBlob as svgCombinadoBlob } from '#/helpers/export-carnet'
import { buildFichaPdfBlob } from '#/lib/fichaPdf'
import type { FichaPdfOpts } from '#/lib/fichaPdf'
import type { UserFicha } from '#/services/personas'

/**
 * Orquestador de la carpeta ZIP de documentos de matrícula (003-documentos-matricula).
 * Se ejecuta en el navegador: arma los PDF/SVG y los empaqueta con `fflate`.
 * Sin estado de React; cada función recibe datos ya obtenidos.
 */

/** Caracteres inválidos en nombres de archivo de Windows: `\ / : * ? " < > |`. */
const CARACTERES_INVALIDOS = /[\\/:*?"<>|]/g

/** Nombre del ZIP: `<Nombre completo> <código>.zip` (conserva acentos y espacios). */
export function nombreZip(nombreCompleto: string, codigo: string): string {
  const limpio = nombreCompleto.replace(CARACTERES_INVALIDOS, '').trim()
  return `${limpio} ${codigo}.zip`
}

/** Variante `Blob` de la ficha, delegando en `fichaPdf.ts`. */
export function fichaPdfBlob(ficha: UserFicha, opts?: FichaPdfOpts): Blob {
  return buildFichaPdfBlob(ficha, opts)
}

/**
 * Monta `<CarnetEstudiantil>` en un nodo oculto, toma las refs frente/reverso y
 * devuelve el SVG combinado como `Blob`. Limpia el nodo al terminar.
 */
export async function carnetSvgBlob(
  alumno: CarnetAlumno,
  institucion: string,
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('El carnet solo se puede generar en el navegador.')
  }

  const host = document.createElement('div')
  host.className = 'docs-oculto'
  host.setAttribute('aria-hidden', 'true')
  document.body.appendChild(host)

  const root = createRoot(host)
  const ref = createRef<CarnetRef>()

  try {
    flushSync(() => {
      root.render(createElement(CarnetEstudiantil, { ref, alumno, institucion }))
    })

    const front = ref.current?.front ?? null
    const back = ref.current?.back ?? null
    if (!front || !back) throw new Error('No se pudo renderizar el carnet.')
    return svgCombinadoBlob(front, back)
  } finally {
    root.unmount()
    host.remove()
  }
}

export interface DocumentoMatriculaItem {
  nombre: string
  data: Blob | Uint8Array
}

/** Archivo real del contrato de matrícula del periodo, tal como se subió a la bóveda. */
export interface ContratoArchivoZip {
  /** Nombre original, p. ej. `ejemplo-contrato-matricula.docx`. */
  nombre: string
  /** `Content-Type` del original. */
  mime: string
  /** Bytes reales del objeto de bóveda. */
  data: Blob
}

/** Extensión (`docx`/`pdf`) deducida del nombre o del MIME del contrato. */
function extensionContrato(archivo: ContratoArchivoZip): 'docx' | 'pdf' {
  const nombre = archivo.nombre.toLowerCase()
  if (nombre.endsWith('.docx')) return 'docx'
  if (nombre.endsWith('.pdf')) return 'pdf'
  return archivo.mime.includes('wordprocessingml') ? 'docx' : 'pdf'
}

/** Empaqueta una lista de archivos (PDF/SVG) en un único ZIP. */
export async function buildDocumentosMatriculaZip(
  docs: DocumentoMatriculaItem[],
): Promise<Blob> {
  const files: Record<string, Uint8Array> = {}
  for (const doc of docs) {
    files[doc.nombre] =
      doc.data instanceof Uint8Array
        ? doc.data
        : new Uint8Array(await doc.data.arrayBuffer())
  }
  const zipped = zipSync(files, { level: 6 })
  return new Blob([new Uint8Array(zipped)], { type: 'application/zip' })
}

export interface GenerarDocumentosInput {
  nombreAlumno: string
  codigoAlumno: string
  /** PDF de credenciales del alumno (password temporal, solo en memoria). */
  credencialAlumno: Blob
  /** Un PDF por cada responsable nuevo creado en la matrícula. */
  credencialesResponsables: { code: string; blob: Blob }[]
  /** Contrato del periodo como archivo real; ausente si el periodo no lo tiene (o falló su lectura). */
  contratoArchivo?: ContratoArchivoZip | null
  /** Datos ya resueltos para el carnet; ausente si falló su generación. */
  carnet?: { alumno: CarnetAlumno; institucion: string } | null
  /** Nombre de la institución (ya obtenido con `getInstitucion()`), para el encabezado de la ficha. */
  institucion?: string
  /** Ficha completa del alumno; ausente si falló su lectura. */
  ficha?: UserFicha | null
}

export interface DocumentosMatriculaResult {
  blob: Blob
  filename: string
  avisos: string[]
}

/**
 * Arma los 5 documentos de la matrícula y devuelve el ZIP listo para descargar.
 * Los fallos parciales (contrato/carnet/ficha) se acumulan en `avisos` y **no**
 * abortan el armado: el ZIP sale con lo que sí se pudo generar.
 */
export async function generarDocumentosMatricula(
  input: GenerarDocumentosInput,
): Promise<DocumentosMatriculaResult> {
  const docs: DocumentoMatriculaItem[] = []
  const avisos: string[] = []

  docs.push({ nombre: '1-credencial-alumno.pdf', data: input.credencialAlumno })
  for (const r of input.credencialesResponsables) {
    docs.push({ nombre: `2-credencial-responsable-${r.code}.pdf`, data: r.blob })
  }

  if (input.contratoArchivo) {
    const ext = extensionContrato(input.contratoArchivo)
    docs.push({
      nombre: `3-contrato-matricula.${ext}`,
      data: input.contratoArchivo.data,
    })
  } else {
    avisos.push('El periodo no tiene contrato de matrícula configurado.')
  }

  if (input.carnet) {
    try {
      docs.push({
        nombre: '4-carnet.svg',
        data: await carnetSvgBlob(input.carnet.alumno, input.carnet.institucion),
      })
    } catch {
      avisos.push('No se pudo generar el carnet del alumno.')
    }
  } else {
    avisos.push('No se pudo generar el carnet del alumno.')
  }

  if (input.ficha) {
    try {
      docs.push({
        nombre: '5-ficha-alumno.pdf',
        data: fichaPdfBlob(input.ficha, { institucion: input.institucion }),
      })
    } catch {
      avisos.push('No se pudo generar la ficha del alumno.')
    }
  } else {
    avisos.push('No se pudo generar la ficha del alumno.')
  }

  const blob = await buildDocumentosMatriculaZip(docs)
  return {
    blob,
    filename: nombreZip(input.nombreAlumno, input.codigoAlumno),
    avisos,
  }
}
