import { apiRequest } from '#/lib/api'

export interface SaceExportQuery {
  periodo_academico_id: string
  grado_id: string
  seccion_id: string
  curso_id: string
  parciales?: number[]
}

export interface SaceEvaluacionParcial {
  inasistencias: number
  nota_total?: number
}

export interface SaceEvaluaciones {
  parcial_1: SaceEvaluacionParcial
  parcial_2: SaceEvaluacionParcial
  parcial_3: SaceEvaluacionParcial
  parcial_4: SaceEvaluacionParcial
  recuperacion?: number
}

export interface SaceEstudiante {
  tipo_documento_identidad: string
  identidad: string
  nombre: string
  evaluaciones: SaceEvaluaciones
}

export interface SaceMetadatosDocumento {
  codigo_sace: string
  nombre: string
  modalidad: string
  grado: string
  seccion: string
  jornada: string
  asignatura: string
}

export interface SaceExportDocument {
  metadatos_documento: SaceMetadatosDocumento
  estudiantes: SaceEstudiante[]
}

export interface MaestroSaceResumen {
  maestro_id: string
  codigo: string
  nombre: string
  clases: number
  materias: string[]
  grados: string[]
  secciones: string[]
}

export interface ParcialSace {
  numero: number
  /** Romano: I, II, III… */
  etiqueta: string
}

export interface EstudianteSace {
  tipo_documento: string
  identidad: string
  nombre: string
  /** Una celda por parcial, en el orden de `ClaseSace.parciales`. */
  parciales: { inasistencias: number; nota_total: number | null }[]
}

export interface ClaseSace {
  asignacion_id: string
  materia: string
  grado: string
  seccion: string
  jornada: string
  modalidad: string
  parciales: ParcialSace[]
  estudiantes: EstudianteSace[]
}

export interface DocumentoMaestroSace {
  institucion: { nombre: string; codigo_sace: string; modalidad_sace: string }
  periodo: string
  maestro: { id: string; codigo: string; nombre: string; identidad: string }
  clases: ClaseSace[]
}

export async function listMaestrosSace() {
  return apiRequest<MaestroSaceResumen[]>('/sace/maestros')
}

export async function getDocumentoMaestro(maestroId: string) {
  return apiRequest<DocumentoMaestroSace>(`/sace/maestros/${maestroId}`)
}

/** SACE del maestro de la sesión: solo sus clases. */
export async function getMiDocumentoSace() {
  return apiRequest<DocumentoMaestroSace>('/sace/mio')
}

export async function exportSace(query: SaceExportQuery) {
  const qs = new URLSearchParams({
    periodo_academico_id: query.periodo_academico_id,
    grado_id: query.grado_id,
    seccion_id: query.seccion_id,
    curso_id: query.curso_id,
  })
  if (query.parciales?.length) {
    qs.set('parciales', query.parciales.join(','))
  }
  return apiRequest<SaceExportDocument>(`/sace/export?${qs}`)
}
