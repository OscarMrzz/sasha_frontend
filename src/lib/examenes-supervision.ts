import { labelGradoSeccion } from '#/lib/examenes'
import type { RoleName } from '#/helpers/permissions'
import type { ExamenAhora } from '#/services/examenes'

export const ROLES_SUPERVISION_EXAMEN: RoleName[] = [
  'admin',
  'director',
  'consejeria',
  'coordinador',
]

export function puedeSupervisarExamenes(roles: readonly string[]) {
  return roles.some((rol) => ROLES_SUPERVISION_EXAMEN.includes(rol as RoleName))
}

export function agruparExamenesSupervision(examenes: ExamenAhora[]) {
  const grupos = new Map<
    string,
    {
      key: string
      responsables: string[]
      secciones: string[]
      examenes: ExamenAhora[]
    }
  >()
  const vistos = new Set<string>()
  for (const examen of examenes) {
    if (vistos.has(examen.examen_asignacion_id)) continue
    vistos.add(examen.examen_asignacion_id)
    const responsables = new Map(
      examen.supervisores.map((s) => [
        s.maestro_id,
        s.maestro_nombre || s.maestro_codigo || 'Maestro sin nombre',
      ]),
    )
    const ids = [...responsables.keys()].sort()
    const key = JSON.stringify(ids)
    const grupo = grupos.get(key) ?? {
      key,
      responsables: ids.map((id) => responsables.get(id)!),
      secciones: [],
      examenes: [],
    }
    const seccion = labelGradoSeccion(
      examen.grado_nombre,
      examen.seccion_nombre,
    )
    if (!grupo.secciones.includes(seccion)) grupo.secciones.push(seccion)
    grupo.examenes.push(examen)
    grupos.set(key, grupo)
  }
  return [...grupos.values()]
    .map((grupo) => ({
      ...grupo,
      secciones: grupo.secciones.sort((a, b) =>
        a.localeCompare(b, 'es', { numeric: true }),
      ),
      examenes: grupo.examenes.sort(
        (a, b) =>
          labelGradoSeccion(a.grado_nombre, a.seccion_nombre).localeCompare(
            labelGradoSeccion(b.grado_nombre, b.seccion_nombre),
            'es',
            { numeric: true },
          ) || a.curso_nombre.localeCompare(b.curso_nombre, 'es'),
      ),
    }))
    .sort((a, b) =>
      a.responsables.join(', ').localeCompare(b.responsables.join(', '), 'es'),
    )
}
