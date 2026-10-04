import type { Permission, RoleName } from '#/helpers/permissions'

export type NavItem = {
  to: string
  label: string
  permission: Permission
  icon: string
  /** Roles con el permiso que igual no ven el ítem (consejería, director, secretaría y admisiones usan catalogos:get solo para matrícula). */
  hideForRoles?: RoleName[]
}

const SIN_CATALOGOS: RoleName[] = ['consejeria', 'director', 'secretaria', 'admisiones']

/** Admin y admin temporal usan expediente:get solo para Alumnos y Maestros; sus horarios están en /horarios. */
export const SIN_HORARIOS_CONSEJERIA: RoleName[] = ['admin', 'admin_temporal']

/** Menú lateral: solo se muestran ítems cuyo permiso cumple el rol activo. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', permission: 'catalogos:get', icon: 'home' },
  { to: '/configuracion', label: 'Configuración', permission: 'configuracion:get', icon: 'settings' },
  { to: '/catalogos/grados', label: 'Grados', permission: 'catalogos:get', icon: 'layers', hideForRoles: SIN_CATALOGOS },
  { to: '/catalogos/modalidades', label: 'Modalidades', permission: 'catalogos:get', icon: 'clock', hideForRoles: SIN_CATALOGOS },
  { to: '/catalogos/secciones', label: 'Secciones', permission: 'catalogos:get', icon: 'grid', hideForRoles: SIN_CATALOGOS },
  { to: '/catalogos/cursos', label: 'Cursos', permission: 'catalogos:get', icon: 'book', hideForRoles: SIN_CATALOGOS },
  { to: '/catalogos/periodos', label: 'Periodos', permission: 'catalogos:get', icon: 'calendar', hideForRoles: SIN_CATALOGOS },
  { to: '/usuarios', label: 'Usuarios', permission: 'users:get', icon: 'users' },
  { to: '/coordinaciones', label: 'Coordinaciones', permission: 'coordinaciones:get', icon: 'network' },
  { to: '/controladores', label: 'Controladores', permission: 'users:put', icon: 'shield' },
  { to: '/matricula', label: 'Matrícula', permission: 'matricula:get', icon: 'clipboard' },
  { to: '/asignacion', label: 'Asignación', permission: 'asignacion:get', icon: 'link' },
  { to: '/horarios', label: 'Horarios', permission: 'horarios:get', icon: 'calendar-days' },
  { to: '/plan-estudio', label: 'Plan de estudio', permission: 'planestudio:get', icon: 'file' },
  { to: '/asistencia', label: 'Asistencia', permission: 'asistencia:get', icon: 'check' },
  { to: '/tareas', label: 'Tareas', permission: 'tareas:get', icon: 'list' },
  { to: '/calificaciones', label: 'Calificaciones', permission: 'calificaciones:get', icon: 'award' },
  { to: '/recuperaciones', label: 'Recuperaciones', permission: 'recuperaciones:get', icon: 'refresh' },
  {
    to: '/liberacion-notas',
    label: 'Liberación de notas',
    permission: 'calificaciones:post',
    icon: 'unlock',
  },
  { to: '/consejeria/alumnos', label: 'Alumnos', permission: 'expediente:get', icon: 'users' },
  { to: '/consejeria/maestros', label: 'Maestros', permission: 'expediente:get', icon: 'user' },
  {
    to: '/consejeria/horarios',
    label: 'Horarios',
    permission: 'expediente:get',
    icon: 'calendar-days',
    hideForRoles: SIN_HORARIOS_CONSEJERIA,
  },
  { to: '/disciplina', label: 'Fichas disciplinarias', permission: 'fichas:get', icon: 'shield-alert' },
  { to: '/disciplina/tipos', label: 'Tipos de ficha', permission: 'tipos_ficha:post', icon: 'gavel' },
  { to: '/excusas', label: 'Excusas', permission: 'excusas:get', icon: 'calendar-check' },
  { to: '/excusas/tipos', label: 'Tipos de excusa', permission: 'tipos_excusa:post', icon: 'shield-plus' },
  { to: '/alumnos', label: 'Alumnos', permission: 'cartera:get', icon: 'users' },
  { to: '/padres', label: 'Padres', permission: 'cartera:get', icon: 'user' },
  { to: '/pagos', label: 'Pagos', permission: 'pagos:get', icon: 'wallet' },
  { to: '/recibos', label: 'Recibos', permission: 'pagos:put', icon: 'receipt' },
  { to: '/analitica-pagos', label: 'Analítica de pagos', permission: 'analitica_pagos:get', icon: 'chart' },
  {
    to: '/notificaciones-admin',
    label: 'Notificaciones',
    permission: 'notificaciones:post',
    icon: 'bell',
  },
  { to: '/estadisticas', label: 'Estadísticas', permission: 'estadisticas:get', icon: 'chart' },
  { to: '/sace', label: 'Export SACE', permission: 'sace:get', icon: 'download' },
  { to: '/auditoria', label: 'Auditoría', permission: 'auditoria:get', icon: 'search' },
]

/** Dashboard is visible to any authenticated role — use a soft permission check in layout. */
export const DASHBOARD_ALWAYS = true
