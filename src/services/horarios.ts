import { apiRequest } from '#/lib/api'

export interface HorarioFixedBlock {
  asignacion_docente_id: string
  seccion_id: string
  curso_id: string
  maestro_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
}

export interface HorarioAssignment {
  asignacion_docente_id: string
  seccion_id: string
  curso_id: string
  maestro_id: string
  horas_semana_minimas: number
  grado_label?: string
}

export interface HorarioRecess {
  hora_inicio: string
  hora_fin: string
}

export interface HorarioPreviewInput {
  slot_minutes: number
  modalidad_hora_inicio: string
  modalidad_hora_fin: string
  extra_hora_fin?: string
  dias: number[]
  recreos: HorarioRecess[]
  bloques_fijos: HorarioFixedBlock[]
  asignaciones: HorarioAssignment[]
  numero_version: number
  codigo_semilla?: string
}

export interface HorarioSlot {
  asignacion_docente_id: string
  seccion_id: string
  curso_id: string
  maestro_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  es_fijo: boolean
  es_extra?: boolean
  grado_label?: string
}

export interface HorarioAviso {
  codigo: string
  mensaje: string
}

export interface HorarioResumenCapacidad {
  huecos_normales_por_seccion: number
  horas_pedidas: number
  horas_colocadas: number
  horas_libres: number
  horas_extra: number
  horas_pedidas_por_seccion?: Record<string, number>
}

export interface HorarioPreview {
  codigo_semilla: string
  numero_version: number
  slots: HorarioSlot[]
  avisos: HorarioAviso[]
  resumen_capacidad: HorarioResumenCapacidad
}

export interface HorarioConfirmRequest {
  periodo_academico_id: string
  codigo_semilla: string
  numero_version: number
  slots: HorarioSlot[]
  activar: boolean
}

export interface HorarioVersion {
  id: string
  periodo_academico_id: string
  codigo_semilla: string
  numero_version: number
  es_activa: boolean
}

export async function previewHorario(body: HorarioPreviewInput) {
  return apiRequest<HorarioPreview>('/horarios/preview', { method: 'POST', body })
}

export async function previewHorarioPeriodo(periodoAcademicoId: string, modalidadId: string) {
  return apiRequest<HorarioPreview>('/horarios/preview-periodo', {
    method: 'POST',
    body: { periodo_academico_id: periodoAcademicoId, modalidad_id: modalidadId },
  })
}

export async function confirmHorario(body: HorarioConfirmRequest) {
  return apiRequest<HorarioVersion>('/horarios/confirm', { method: 'POST', body })
}

export async function listHorarioVersiones(periodoAcademicoId: string) {
  const qs = new URLSearchParams({ periodo_academico_id: periodoAcademicoId })
  return apiRequest<HorarioVersion[]>(`/horarios/versiones?${qs}`)
}

export async function reaplicarHorario(versionId: string, activar: boolean) {
  return apiRequest<HorarioVersion>('/horarios/reaplicar', {
    method: 'POST',
    body: { version_id: versionId, activar },
  })
}
