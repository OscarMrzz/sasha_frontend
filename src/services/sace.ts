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
