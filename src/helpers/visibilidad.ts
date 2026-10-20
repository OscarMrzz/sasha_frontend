/** Roles que pueden ver personas dadas de baja y restaurarlas. */
const ROLES_VER_INACTIVOS = new Set(['admin', 'admin_temporal', 'developer'])

export function puedeVerInactivos(roles: readonly string[] | undefined): boolean {
  return (roles ?? []).some((rol) => ROLES_VER_INACTIVOS.has(rol.toLowerCase()))
}

/** Una fila está dada de baja si el backend lo marca o si su usuario/alumno es INACTIVE.
 *  Ojo: no usar `status` genérico: en Matrícula ese campo es el estado de la matrícula,
 *  no el de la persona.
 */
export function esBaja(row: {
  dado_de_baja?: boolean
  statususer?: string
  alumno_status?: string
}): boolean {
  return Boolean(row.dado_de_baja) || row.statususer === 'INACTIVE' || row.alumno_status === 'INACTIVE'
}
