import type { Permission, RoleName } from '#/helpers/permissions'

/**
 * Registro del buscador de comandos (Ctrl+K).
 * Los atajos de teclado viven en `src/config/atajos-teclado.json`.
 * Aquí viven las descripciones, sinónimos (palabras clave ocultas) y acciones.
 */

export type GrupoComando = 'Ir a' | 'Agregar'

export type Comando = {
  id: string
  titulo: string
  descripcion: string
  grupo: GrupoComando
  icono: string
  /** Términos que no se muestran pero sirven para encontrar el comando. */
  palabrasClave: string[]
  /** Ejecuta el comando. */
  ejecutar: () => void
}

export type ComandoNavegacion = {
  id: string
  to: string
  titulo: string
  descripcion: string
  icono: string
  permiso: Permission | null
  ocultarRoles?: readonly RoleName[]
  palabrasClave: string[]
}

export type ComandoAgregar = {
  id: string
  to: string
  /** Id que consume la página destino con `useAccionPalette`. */
  intentId: string
  titulo: string
  descripcion: string
  icono: string
  permiso: Permission
  palabrasClave: string[]
}

/** Descripción corta por ruta (se muestra bajo el título). */
export const DESCRIPCION_RUTA: Record<string, string> = {
  '/dashboard': 'Resumen de inicio',
  '/configuracion': 'Ajustes de la institución',
  '/catalogos/grados': 'Niveles académicos',
  '/catalogos/modalidades': 'Turnos y jornadas',
  '/catalogos/secciones': 'Grupos por grado y modalidad',
  '/catalogos/cursos': 'Clases con sílabo',
  '/catalogos/periodos': 'Periodos lectivos y parciales',
  '/usuarios': 'Cuentas de la plataforma',
  '/coordinaciones': 'Alcance de cada coordinador',
  '/controladores': 'Roles y accesos',
  '/matricula': 'Registrar alumnos y responsables',
  '/carnets': 'Credenciales estudiantiles',
  '/asignacion': 'Maestro ↔ clase, grado y sección',
  '/horarios': 'Bloques y versiones de horario',
  '/plan-estudio': 'Planificación de clases',
  '/asistencia': 'Faltas, tardes y excusas',
  '/tareas': 'Tareas por clase',
  '/calificaciones': 'Notas por parcial',
  '/recuperaciones': 'Recuperación de parcial o periodo',
  '/liberacion-notas': 'Publicar notas a los portales',
  '/consejeria/alumnos': 'Expediente de alumnos',
  '/consejeria/maestros': 'Expediente de maestros',
  '/consejeria/horarios': 'Horarios de sólo lectura',
  '/disciplina': 'Fichas disciplinarias',
  '/disciplina/tipos': 'Tipos de ficha y castigos',
  '/excusas': 'Justificaciones de inasistencia',
  '/excusas/tipos': 'Tipos de excusa',
  '/contratos': 'Documentos de contratos',
  '/alumnos': 'Cartera de alumnos y pagos',
  '/padres': 'Cartera de padres',
  '/pagos': 'Mensualidades y cobros',
  '/tipos-pagos': 'Conceptos de pago por periodo',
  '/recibos': 'Revisar recibos de pago',
  '/analitica-pagos': 'Análisis de recaudación',
  '/notificaciones-admin': 'Avisos y banners',
  '/estadisticas': 'Análisis institucional',
  '/sace': 'Exportar planilla SACE',
  '/auditoria': 'Historial de acciones',
}

/** Sinónimos por ruta: se buscan aunque no coincidan con el título. */
export const PALABRAS_CLAVE_RUTA: Record<string, string[]> = {
  '/dashboard': ['inicio', 'home', 'panel', 'principal', 'escritorio'],
  '/configuracion': ['configuracion', 'ajustes', 'settings', 'institución'],
  '/catalogos/grados': ['grado', 'grados', 'nivel', 'niveles', 'año', 'curso'],
  '/catalogos/modalidades': ['modalidad', 'modalidades', 'turno', 'jornada', 'horario'],
  '/catalogos/secciones': ['seccion', 'secciones', 'grupo', 'salon', 'aula'],
  '/catalogos/cursos': ['curso', 'cursos', 'clase', 'clases', 'materia', 'materias', 'asignatura', 'silabo'],
  '/catalogos/periodos': ['periodo', 'periodos', 'año lectivo', 'calendario', 'parciales'],
  '/usuarios': ['usuario', 'usuarios', 'cuenta', 'cuentas', 'persona', 'empleado', 'staff'],
  '/coordinaciones': ['coordinacion', 'coordinaciones', 'coordinador', 'alcance'],
  '/controladores': ['controlador', 'controladores', 'roles', 'permisos', 'accesos'],
  '/matricula': ['matricula', 'matrícula', 'alumno', 'estudiante', 'niño', 'niños', 'inscripcion', 'inscribir'],
  '/carnets': ['carnet', 'carnets', 'credencial', 'identificacion'],
  '/asignacion': ['asignacion', 'asignar', 'maestro', 'clase', 'docente'],
  '/horarios': ['horario', 'horarios', 'clase', 'clases', 'bloques', 'semana'],
  '/plan-estudio': ['plan', 'planes', 'planificacion', 'contenido', 'pensum'],
  '/asistencia': ['asistencia', 'falta', 'faltas', 'tarde', 'tardes', 'presente'],
  '/tareas': ['tarea', 'tareas', 'deber', 'deberes', 'trabajo', 'actividad', 'asignacion'],
  '/calificaciones': ['calificacion', 'calificaciones', 'nota', 'notas', 'examen', 'promedio', 'resultado'],
  '/recuperaciones': ['recuperacion', 'recuperaciones', 'recuperar', 'recuperatorio'],
  '/liberacion-notas': ['liberar', 'liberacion', 'notas', 'publicar', 'portal'],
  '/consejeria/alumnos': ['alumno', 'alumnos', 'estudiante', 'estudiantes', 'niño', 'niños', 'expediente', 'ficha'],
  '/consejeria/maestros': ['maestro', 'maestros', 'profesor', 'profesores', 'docente', 'expediente'],
  '/consejeria/horarios': ['horario', 'horarios', 'maestros', 'consejeria'],
  '/disciplina': ['ficha', 'fichas', 'disciplina', 'sancion', 'sanciones', 'castigo', 'conducta'],
  '/disciplina/tipos': ['tipo', 'tipos', 'ficha', 'disciplina', 'castigos', 'niveles'],
  '/excusas': ['excusa', 'excusas', 'permiso', 'permisos', 'justificacion', 'justificar'],
  '/excusas/tipos': ['tipo', 'tipos', 'excusa', 'excusas'],
  '/contratos': ['contrato', 'contratos', 'documento', 'convenio', 'empleado'],
  '/alumnos': ['alumno', 'alumnos', 'estudiante', 'cartera', 'pagos', 'caja', 'mora'],
  '/padres': ['padre', 'padres', 'responsable', 'responsables', 'encargado', 'tutor', 'cartera'],
  '/pagos': ['pago', 'pagos', 'mensualidad', 'mensualidades', 'cobro', 'cobrar', 'caja'],
  '/tipos-pagos': ['tipos', 'tipo', 'concepto', 'conceptos', 'adicional', 'paseo', 'cuota', 'bloquea notas'],
  '/recibos': ['recibo', 'recibos', 'validar', 'comprobante', 'transferencia'],
  '/analitica-pagos': ['analitica', 'pagos', 'finanzas', 'recaudacion', 'mora'],
  '/notificaciones-admin': ['notificacion', 'notificaciones', 'aviso', 'avisos', 'banner', 'comunicado'],
  '/estadisticas': ['estadistica', 'estadisticas', 'analisis', 'reporte', 'reportes', 'graficas'],
  '/sace': ['sace', 'export', 'exportar', 'planilla', 'reporte'],
  '/auditoria': ['auditoria', 'log', 'logs', 'historial', 'registro', 'acciones'],
}

/** Acciones rápidas "Agregar X": navegan a su página y abren el modal de creación. */
export const COMANDOS_AGREGAR: ComandoAgregar[] = [
  {
    id: 'agregar-tarea',
    to: '/tareas',
    intentId: 'nuevo-tarea',
    titulo: 'Agregar tarea',
    descripcion: 'Nueva tarea de una clase',
    icono: 'list',
    permiso: 'tareas:post',
    palabrasClave: ['tarea', 'tareas', 'deber', 'crear', 'nueva', 'nuevo'],
  },
  {
    id: 'agregar-curso',
    to: '/catalogos/cursos',
    intentId: 'nuevo-curso',
    titulo: 'Agregar clase',
    descripcion: 'Nueva clase con sílabo',
    icono: 'book',
    permiso: 'catalogos:post',
    palabrasClave: ['curso', 'clase', 'materia', 'asignatura', 'crear', 'nueva', 'nuevo'],
  },
  {
    id: 'agregar-grado',
    to: '/catalogos/grados',
    intentId: 'nuevo-grado',
    titulo: 'Agregar grado',
    descripcion: 'Nuevo nivel académico',
    icono: 'layers',
    permiso: 'catalogos:post',
    palabrasClave: ['grado', 'nivel', 'crear', 'nueva', 'nuevo'],
  },
  {
    id: 'agregar-seccion',
    to: '/catalogos/secciones',
    intentId: 'nuevo-seccion',
    titulo: 'Agregar sección',
    descripcion: 'Nuevo grupo de un grado',
    icono: 'grid',
    permiso: 'catalogos:post',
    palabrasClave: ['seccion', 'grupo', 'aula', 'crear', 'nueva', 'nuevo'],
  },
  {
    id: 'agregar-modalidad',
    to: '/catalogos/modalidades',
    intentId: 'nuevo-modalidad',
    titulo: 'Agregar modalidad',
    descripcion: 'Nuevo turno o jornada',
    icono: 'clock',
    permiso: 'catalogos:post',
    palabrasClave: ['modalidad', 'turno', 'jornada', 'crear', 'nueva', 'nuevo'],
  },
  {
    id: 'agregar-periodo',
    to: '/catalogos/periodos',
    intentId: 'nuevo-periodo',
    titulo: 'Agregar periodo',
    descripcion: 'Nuevo periodo lectivo',
    icono: 'calendar',
    permiso: 'catalogos:post',
    palabrasClave: ['periodo', 'año lectivo', 'crear', 'nueva', 'nuevo'],
  },
  {
    id: 'agregar-usuario',
    to: '/usuarios',
    intentId: 'nuevo-usuario',
    titulo: 'Agregar usuario',
    descripcion: 'Nueva cuenta de la plataforma',
    icono: 'users',
    permiso: 'users:post',
    palabrasClave: ['usuario', 'cuenta', 'persona', 'crear', 'nueva', 'nuevo'],
  },
  {
    id: 'agregar-excusa',
    to: '/excusas',
    intentId: 'nuevo-excusa',
    titulo: 'Agregar excusa',
    descripcion: 'Registrar justificación de inasistencia',
    icono: 'calendar-check',
    permiso: 'excusas:post',
    palabrasClave: ['excusa', 'permiso', 'justificacion', 'crear', 'nueva', 'nuevo'],
  },
  {
    id: 'agregar-ficha',
    to: '/disciplina',
    intentId: 'nuevo-ficha',
    titulo: 'Agregar ficha disciplinaria',
    descripcion: 'Aplicar una ficha a un alumno',
    icono: 'shield-alert',
    permiso: 'fichas:post',
    palabrasClave: ['ficha', 'disciplina', 'sancion', 'castigo', 'crear', 'nueva', 'nuevo'],
  },
  {
    id: 'agregar-matricula',
    to: '/matricula',
    intentId: 'nuevo-matricula',
    titulo: 'Nueva matrícula',
    descripcion: 'Registrar un alumno y sus responsables',
    icono: 'clipboard',
    permiso: 'matricula:post',
    palabrasClave: ['matricula', 'matrícula', 'alumno', 'estudiante', 'niño', 'inscribir', 'crear', 'nueva', 'nuevo'],
  },
]

/** Minúsculas, sin acentos y sin espacios sobrantes. */
export function normaliza(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Filtra y ordena comandos por relevancia.
 * Con consulta vacía devuelve todos. Exige que todos los tokens coincidan.
 */
export function buscarComandos(comandos: Comando[], consulta: string): Comando[] {
  const q = normaliza(consulta)
  if (!q) return [...comandos]

  const tokens = q.split(/\s+/).filter(Boolean)

  const puntuados: { comando: Comando; score: number }[] = []
  for (const comando of comandos) {
    const titulo = normaliza(comando.titulo)
    const descripcion = normaliza(comando.descripcion)
    const claves = comando.palabrasClave.map(normaliza)
    const grupo = normaliza(comando.grupo)

    let score = 0
    let valido = true
    for (const token of tokens) {
      let tokenScore = 0
      if (titulo.startsWith(token)) tokenScore = 100
      else if (titulo.split(/\s+/).some((palabra) => palabra.startsWith(token))) tokenScore = 80
      else if (titulo.includes(token)) tokenScore = 60
      else if (claves.some((clave) => clave.startsWith(token))) tokenScore = 50
      else if (claves.some((clave) => clave.includes(token))) tokenScore = 30
      else if (descripcion.includes(token)) tokenScore = 20
      else if (grupo.includes(token)) tokenScore = 5
      else {
        valido = false
        break
      }
      score += tokenScore
    }
    if (valido) puntuados.push({ comando, score })
  }

  puntuados.sort((a, b) => b.score - a.score)
  return puntuados.map((p) => p.comando)
}
