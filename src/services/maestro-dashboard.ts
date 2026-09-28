import { apiRequest } from '#/lib/api'

export interface MaestroDashboard {
  consulta: { fecha: string; hora: string; dia_semana: number }
  materia: {
    asignacion_docente_id: string
    curso_nombre: string
    grado_nombre: string
    seccion_nombre: string
    modalidad_nombre: string
    periodo_nombre: string
  }
  slot: {
    dia_semana: number
    hora_inicio: string
    hora_fin: string
    en_clase: boolean
    minutos_restantes?: number
    minutos_para_inicio?: number
    etiqueta: 'en_clase' | 'proxima' | 'ya_paso' | 'sin_bloque' | string
  }
  plan_hoy: Array<{
    id: string
    titulo: string
    descripcion?: string | null
    materiales?: string | null
    tipo_item?: string
    puntos: number
    estado_cumplimiento: string
    fecha_inicio: string
    fecha_fin: string
  }>
  tareas_hoy: Array<{
    id: string
    titulo: string
    fecha_entrega: string
    revisados: number
    total: number
  }>
  por_calificar: Array<{
    tarea_id: string
    tarea_titulo: string
    alumno_id: string
    alumno_codigo: string
    alumno_nombre: string
    fecha_entrega: string
  }>
  asistencia_hoy: {
    pasada: boolean
    marcas: number
    alumnos: number
    inasistencias_7d: number
  }
  alumnos_count: number
}

export async function getMaestroDashboard(opts: {
  asignacionDocenteId: string
  fecha?: string
  hora?: string
}) {
  const qs = new URLSearchParams({
    asignacion_docente_id: opts.asignacionDocenteId,
  })
  if (opts.fecha) qs.set('fecha', opts.fecha)
  if (opts.hora) qs.set('hora', opts.hora)
  return apiRequest<MaestroDashboard>(`/maestro/dashboard?${qs}`)
}
