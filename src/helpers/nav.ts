import type { Permission } from '#/helpers/permissions'

export type NavItem = {
  to: string
  label: string
  permission: Permission
  icon: string
}

/** Menú lateral: solo se muestran ítems cuyo permiso cumple el rol activo. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', permission: 'catalogos:get', icon: 'home' },
  { to: '/configuracion', label: 'Configuración', permission: 'configuracion:get', icon: 'settings' },
  { to: '/catalogos/grados', label: 'Grados', permission: 'catalogos:get', icon: 'layers' },
  { to: '/catalogos/modalidades', label: 'Modalidades', permission: 'catalogos:get', icon: 'clock' },
  { to: '/catalogos/secciones', label: 'Secciones', permission: 'catalogos:get', icon: 'grid' },
  { to: '/catalogos/cursos', label: 'Cursos', permission: 'catalogos:get', icon: 'book' },
  { to: '/catalogos/periodos', label: 'Periodos', permission: 'catalogos:get', icon: 'calendar' },
  { to: '/usuarios', label: 'Usuarios', permission: 'users:get', icon: 'users' },
  { to: '/controladores', label: 'Controladores', permission: 'users:put', icon: 'shield' },
  { to: '/matricula', label: 'Matrícula', permission: 'matricula:get', icon: 'clipboard' },
  { to: '/asignacion', label: 'Asignación', permission: 'asignacion:get', icon: 'link' },
  { to: '/horarios', label: 'Horarios', permission: 'horarios:get', icon: 'calendar-days' },
  { to: '/plan-estudio', label: 'Plan de estudio', permission: 'planestudio:get', icon: 'file' },
  { to: '/asistencia', label: 'Asistencia', permission: 'asistencia:get', icon: 'check' },
  { to: '/tareas', label: 'Tareas', permission: 'tareas:get', icon: 'list' },
  { to: '/calificaciones', label: 'Calificaciones', permission: 'calificaciones:get', icon: 'award' },
  {
    to: '/liberacion-notas',
    label: 'Liberación de notas',
    permission: 'calificaciones:post',
    icon: 'unlock',
  },
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
