import { apiRequest } from '#/lib/api'

export interface AlumnoConsejeria {
  codigo: string
  nombre: string
  status: string
  grado: string
  grado_orden: number
  seccion_id: string
  seccion: string
  modalidad: string
  periodo: string
  estado_matricula: string
  responsable_codigo: string
  responsable_nombre: string
  responsable_telefono: string
  parentesco: string
}

export interface MaestroConsejeria {
  codigo: string
  nombre: string
  telefono: string
  status: string
  clases: number
  cursos: string[]
  grados: string[]
}

export interface BloqueHorario {
  dia_semana: number
  hora_inicio: string
  hora_fin: string
}

export interface AsistenciaResumen {
  presentes: number
  tardes: number
  justificadas: number
  injustificadas: number
  total: number
  porcentaje?: number
}

export interface MateriaRendimiento {
  asignacion_id: string
  curso: string
  maestro: string
  maestro_codigo: string
  horario: BloqueHorario[]
  notas: (number | null)[]
  total?: number
  promedio?: number
  etiqueta: string
  asistencia: AsistenciaResumen
}

export interface RendimientoAlumno {
  alumno_codigo: string
  alumno_nombre: string
  periodo_id: string
  periodo_nombre: string
  grado: string
  seccion: string
  modalidad: string
  parciales: { numero: number; etiqueta: string; max: number }[]
  materias: MateriaRendimiento[]
  asistencia: AsistenciaResumen
  mensaje?: string
}

export interface SlotHorario extends BloqueHorario {
  asignacion_id: string
  curso_id: string
  curso: string
  maestro_id: string
  maestro: string
  maestro_codigo: string
  grado_id: string
  grado: string
  grado_orden: number
  seccion_id: string
  seccion: string
  modalidad_id: string
  modalidad: string
}

export interface HorariosConsejeria {
  periodo_id: string
  periodos: { id: string; nombre: string; activo: boolean }[]
  slots: SlotHorario[]
}

export const DIAS_SEMANA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export async function listAlumnosConsejeria() {
  return apiRequest<AlumnoConsejeria[]>('/consejeria/alumnos')
}

export async function listMaestrosConsejeria() {
  return apiRequest<MaestroConsejeria[]>('/consejeria/maestros')
}

export async function getRendimientoAlumno(code: string, periodoId?: string) {
  const q = periodoId ? `?periodo_academico_id=${encodeURIComponent(periodoId)}` : ''
  return apiRequest<RendimientoAlumno>(`/consejeria/alumnos/${encodeURIComponent(code)}/rendimiento${q}`)
}

export async function listHorariosConsejeria(periodoId?: string) {
  const q = periodoId ? `?periodo_academico_id=${encodeURIComponent(periodoId)}` : ''
  return apiRequest<HorariosConsejeria>(`/consejeria/horarios${q}`)
}
