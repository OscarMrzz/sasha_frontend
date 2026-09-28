/** Matriz de permisos alineada a backend_sasha/db/seed.sql (fuente UI hasta que exista /me). */

export const ROLES = [
  'admin',
  'admin_temporal',
  'secretaria',
  'director',
  'consejeria',
  'contabilidad',
  'maestro',
  'responsable',
  'alumno',
  'developer',
] as const

export type RoleName = (typeof ROLES)[number]

export type Permission = `${string}:${string}`

const adminPerms: Permission[] = [
  'users:get',
  'users:post',
  'users:put',
  'users:delete',
  'roles:get',
  'roles:put',
  'auditoria:get',
  'configuracion:get',
  'configuracion:put',
  'catalogos:get',
  'catalogos:post',
  'catalogos:put',
  'catalogos:delete',
  'personas:get',
  'personas:post',
  'personas:put',
  'matricula:get',
  'matricula:post',
  'matricula:put',
  'asignacion:get',
  'asignacion:post',
  'asignacion:put',
  'horarios:get',
  'horarios:post',
  'horarios:put',
  'planestudio:get',
  'planestudio:put',
  'asistencia:get',
  'asistencia:post',
  'tareas:get',
  'tareas:post',
  'tareas:put',
  'notas:get',
  'notas:post',
  'notas:put',
  'notas:delete',
  'calificaciones:get',
  'calificaciones:post',
  'calificaciones:put',
  'pagos:get',
  'pagos:post',
  'pagos:put',
  'notificaciones:get',
  'notificaciones:post',
  'notificaciones:put',
  'estadisticas:get',
  'boveda:post',
  'boveda:get',
  'sace:get',
]

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  admin: adminPerms,
  admin_temporal: [...adminPerms, 'planestudio:post'],
  secretaria: [
    'users:get',
    'users:post',
    'users:put',
    'catalogos:get',
    'personas:get',
    'personas:post',
    'personas:put',
    'matricula:get',
    'matricula:post',
    'matricula:put',
    'asignacion:get',
    'asignacion:post',
    'horarios:get',
    'notificaciones:get',
    'notificaciones:post',
    'boveda:post',
    'boveda:get',
    'sace:get',
  ],
  director: [
    'catalogos:get',
    'catalogos:post',
    'catalogos:put',
    'personas:get',
    'matricula:get',
    'horarios:get',
    'planestudio:get',
    'planestudio:put',
    'calificaciones:get',
    'calificaciones:put',
    'estadisticas:get',
    'notificaciones:get',
    'notificaciones:post',
    'sace:get',
  ],
  consejeria: [
    'planestudio:get',
    'planestudio:put',
    'asistencia:get',
    'tareas:get',
    'calificaciones:get',
    'personas:get',
    'estadisticas:get',
    'notificaciones:get',
    'sace:get',
  ],
  contabilidad: [
    'pagos:get',
    'pagos:post',
    'pagos:put',
    'personas:get',
    'matricula:get',
    'estadisticas:get',
    'notificaciones:get',
    'boveda:post',
    'boveda:get',
  ],
  maestro: [
    'planestudio:get',
    'planestudio:post',
    'planestudio:put',
    'asistencia:get',
    'asistencia:post',
    'tareas:get',
    'tareas:post',
    'tareas:put',
    'calificaciones:get',
    'horarios:get',
    'personas:get',
    'notificaciones:get',
    'notas:get',
    'notas:post',
    'notas:put',
    'notas:delete',
  ],
  responsable: [
    'tareas:get',
    'calificaciones:get',
    'horarios:get',
    'pagos:get',
    'pagos:post',
    'notificaciones:get',
    'personas:get',
    'boveda:post',
    'boveda:get',
  ],
  alumno: [
    'tareas:get',
    'calificaciones:get',
    'horarios:get',
    'planestudio:get',
    'notificaciones:get',
  ],
  developer: ['auditoria:get', 'notificaciones:get'],
}

export const SECRETARIA_ASSIGNABLE_ROLES: RoleName[] = [
  'maestro',
  'responsable',
  'alumno',
  'consejeria',
]

export function roleHasPermission(role: string | null | undefined, permission: Permission): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) return false
  return ROLE_PERMISSIONS[role as RoleName].includes(permission)
}

/** Unión de permisos: basta con que un rol de la sesión lo tenga. */
export function rolesHavePermission(
  roles: readonly string[] | null | undefined,
  permission: Permission,
): boolean {
  if (!roles?.length) return false
  return roles.some((role) => roleHasPermission(role, permission))
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Admin',
    admin_temporal: 'Admin temporal',
    secretaria: 'Secretaría',
    director: 'Director',
    consejeria: 'Consejería',
    contabilidad: 'Contabilidad',
    maestro: 'Maestro',
    responsable: 'Responsable',
    alumno: 'Alumno',
    developer: 'Developer',
  }
  return labels[role] ?? role
}
