import { apiRequest } from '#/lib/api'

export interface MonitorBloque {
  hora_inicio: string
  hora_fin: string
}

/** Un bloque del horario junto con la fecha concreta (YYYY-MM-DD) en que ocurre. */
export interface MonitorBloqueFecha {
  fecha: string
  hora_inicio: string
  hora_fin: string
}

export interface MonitorPlanItem {
  id: string
  titulo: string
  tipo_item?: string
  puntos: number
  estado_cumplimiento: string
  fecha_inicio: string
  fecha_fin: string
}

export interface MonitorTarea {
  id: string
  titulo: string
  revisados: number
  total: number
}

export interface MonitorAlumnoMarca {
  alumno_id: string
  codigo: string
  nombre: string
  tipo_codigo: string
}

export interface MonitorClase {
  asignacion_docente_id: string
  curso_nombre: string
  grado_nombre: string
  seccion_nombre: string
  modalidad_nombre: string
  maestro_nombre: string
  hora_inicio: string
  hora_fin: string
  alumnos_count: number
  plan: {
    total: number
    finalizados: number
    iniciados: number
    porcentaje: number
    items: MonitorPlanItem[]
  }
  tareas: { total: number; items: MonitorTarea[] }
  asistencia: {
    pasada: boolean
    marcas: number
    alumnos: number
    faltantes: number
    tarde: number
    faltantes_lista: MonitorAlumnoMarca[]
    tarde_lista: MonitorAlumnoMarca[]
  }
}

export interface MonitorRespuesta {
  consulta: { fecha: string; hora: string; dia_semana: number }
  estado: 'en_clase' | 'recreo' | 'sin_clase'
  bloque?: MonitorBloque
  proxima?: MonitorBloque
  anterior?: MonitorBloqueFecha
  siguiente?: MonitorBloqueFecha
  clases: MonitorClase[]
}

export async function getMonitor(opts: { fecha?: string; hora?: string } = {}) {
  const qs = new URLSearchParams()
  if (opts.fecha) qs.set('fecha', opts.fecha)
  if (opts.hora) qs.set('hora', opts.hora)
  const suffix = qs.toString() ? `?${qs}` : ''
  return apiRequest<MonitorRespuesta>(`/monitor/${suffix}`)
}
