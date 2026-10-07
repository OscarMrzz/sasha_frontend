import { apiRequest } from '#/lib/api'

export interface GradoRepetidoInput {
  grado_id: string
  anio?: number
}

export interface DireccionTrabajoInput {
  direccion: string
  telefono_trabajo?: string
}

export interface PersonaCreate {
  user_id: string
  primer_nombre: string
  segundo_nombre?: string
  primer_apellido: string
  segundo_apellido?: string
  numero_identidad?: string
  tipo_documento_identidad?: string
  fecha_nacimiento?: string
  sexo?: string
  telefono_contacto?: string
  path_imagen?: string
  status: string
  procede_otra_institucion?: boolean
  nombre_institucion_origen?: string
  presenta_condicion_aprendizaje?: boolean
  ha_repetido_grado?: boolean
  alergias?: string[]
  condiciones_aprendizaje?: string[]
  grados_repetidos?: GradoRepetidoInput[]
  profesion?: string
  direccion_domicilio?: string
  direcciones_trabajo?: DireccionTrabajoInput[]
}

export interface Alumno {
  id: string
  perfil_id: string
  user_id: string
  user_code?: string
  nombre: string
  status: string
}

export interface Maestro {
  id: string
  perfil_id: string
  user_id: string
  user_code?: string
  nombre: string
  status: string
}

export interface Responsable {
  id: string
  perfil_id: string
  user_id: string
  user_code?: string
  nombre: string
  status: string
}

export async function listAlumnos() {
  return apiRequest<Alumno[]>('/personas/alumnos')
}

export async function createAlumno(body: PersonaCreate) {
  return apiRequest<Alumno>('/personas/alumnos', { method: 'POST', body })
}

export async function listMaestros() {
  return apiRequest<Maestro[]>('/personas/maestros')
}

export async function createMaestro(body: PersonaCreate) {
  return apiRequest<Maestro>('/personas/maestros', { method: 'POST', body })
}

export async function listResponsables() {
  return apiRequest<Responsable[]>('/personas/responsables')
}

export async function createResponsable(body: PersonaCreate) {
  return apiRequest<Responsable>('/personas/responsables', { method: 'POST', body })
}

export async function getResponsableByCode(code: string) {
  return apiRequest<Responsable>(`/personas/responsables/by-code/${encodeURIComponent(code)}`)
}

export interface UserFicha {
  user: {
    code: string
    username: string
    roles: string[]
    statususer: string
  }
  perfil?: {
    primer_nombre: string
    segundo_nombre?: string
    primer_apellido: string
    segundo_apellido?: string
    sexo?: string
    fecha_nacimiento?: string
    telefono_contacto?: string
    numero_identidad?: string
    tipo_documento_identidad?: string
    path_imagen?: string
  }
  alumno?: {
    id: string
    procede_otra_institucion: boolean
    nombre_institucion_origen?: string
    religion?: string
    presenta_condicion_aprendizaje: boolean
    cuenta_dispositivo_movil: boolean
    ha_repetido_grado: boolean
    alergias: string[]
    condiciones_aprendizaje: string[]
    deportes_pasatiempos: string[]
    dispositivos_moviles: string[]
    convivencia: string[]
    grados_repetidos: { grado_nombre: string; anio?: number }[]
    matriculas: {
      id: string
      periodo: string
      anio_lectivo: number
      grado: string
      seccion: string
      modalidad: string
      es_reingreso: boolean
      cursos_retrasados?: string[]
      status: string
    }[]
    responsables: {
      nombre: string
      user_code?: string
      parentesco: string
      es_principal: boolean
      telefono?: string
      profesion?: string
    }[]
    documentos: { tipo: string; observaciones?: string; status: string }[]
  }
  maestro?: {
    id: string
    asignaciones: {
      curso: string
      grado?: string
      seccion: string
      periodo: string
      status: string
      horarios?: { dia_semana: number; hora_inicio: string; hora_fin: string }[]
    }[]
    disponibilidad: {
      modalidad?: string
      dia_semana?: number
      hora_inicio?: string
      hora_fin?: string
      es_disponible: boolean
      motivo?: string
    }[]
  }
  responsable?: {
    id: string
    profesion?: string
    direccion_domicilio?: string
    direcciones_trabajo: { direccion: string; telefono_trabajo?: string }[]
    alumnos_a_cargo: { nombre: string; user_code?: string; parentesco: string }[]
  }
  operativo?: FichaOperativo
}

export interface FichaSlot {
  asignacion_docente_id: string
  seccion_id: string
  curso_id: string
  maestro_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  curso_nombre: string
  maestro_nombre: string
  seccion_nombre: string
  grado_id: string
  grado_nombre: string
  modalidad_id: string
  modalidad_nombre: string
  asistencia_codigo?: string
  asistencia_nombre?: string
  asistencia_observaciones?: string
}

export interface FichaPlanItem {
  id: string
  parcial_id: string
  parcial_nombre?: string
  titulo: string
  tipo_item: string
  fecha_inicio: string
  fecha_fin: string
  estado_cumplimiento: string
  porcentaje_avance: number
  curso_nombre?: string
  asignacion_docente_id?: string
}

export interface FichaPlanParcial {
  parcial_id: string
  parcial_nombre?: string
  items: FichaPlanItem[]
}

export interface FichaTarea {
  tarea_id: string
  titulo: string
  fecha_entrega: string
  curso_nombre?: string
  entregado: boolean
  asignacion_docente_id?: string
}

export interface FichaOperativo {
  consulta: { fecha: string; hora: string; dia_semana: number }
  clase_actual: FichaSlot[]
  horario_dia: FichaSlot[]
  horario_semana: FichaSlot[]
  plan_dia?: FichaPlanItem[]
  plan_periodo?: FichaPlanParcial[]
  tareas_hoy?: FichaTarea[]
  tareas_proximas?: FichaTarea[]
  mensaje?: string
}

/** Fecha y hora locales del navegador para la consulta operativa. */
export function localConsulta(): { fecha: string; hora: string } {
  const now = new Date()
  const fecha = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
  const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return { fecha, hora }
}

export function labelAsistencia(codigo?: string | null): string {
  switch (codigo) {
    case 'presente':
      return 'Asistió'
    case 'tarde':
      return 'Llegada tarde'
    case 'injustificada':
      return 'Falta'
    case 'justificada':
      return 'Excusa'
    default:
      return 'Sin registro'
  }
}

export async function getFicha(code: string, consulta?: { fecha?: string; hora?: string }) {
  const c = consulta ?? localConsulta()
  const qs = new URLSearchParams()
  if (c.fecha) qs.set('fecha', c.fecha)
  if (c.hora) qs.set('hora', c.hora)
  const suffix = qs.toString() ? `?${qs}` : ''
  return apiRequest<UserFicha>(`/personas/ficha/${encodeURIComponent(code)}${suffix}`)
}

/** Ficha del usuario en sesión (sin la parte operativa del día). */
export async function getMiFicha() {
  return apiRequest<UserFicha>('/personas/mi-ficha')
}

/** Guarda en el perfil la foto ya subida a la bóveda (tipo perfil_foto). */
export async function guardarMiFoto(objectKey: string) {
  return apiRequest<{ status: string; path_imagen: string }>('/personas/mi-foto', {
    method: 'PUT',
    body: { object_key: objectKey },
  })
}
