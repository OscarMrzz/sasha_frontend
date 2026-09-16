import type { Asignacion } from '#/services/asignacion'
import type { Grado, Seccion } from '#/services/catalogos'

/** Secciones que ya tienen el curso asignado en ese periodo (cualquier maestro). */
export function seccionIdsCubiertas(
  asignaciones: Asignacion[],
  cursoId: string,
  periodoId: string,
): Set<string> {
  const set = new Set<string>()
  if (!cursoId || !periodoId) return set
  for (const a of asignaciones) {
    if (a.status !== 'ACTIVE') continue
    if (a.curso_id !== cursoId) continue
    if (a.periodo_academico_id !== periodoId) continue
    set.add(a.seccion_id)
  }
  return set
}

export function gradosConSeccionesLibres(
  grados: Grado[],
  secciones: Seccion[],
  cubiertas: Set<string>,
): { grado: Grado; libres: number; total: number }[] {
  return grados
    .filter((g) => g.status === 'ACTIVE')
    .map((g) => {
      const secs = secciones.filter((s) => s.grado_id === g.id && s.status === 'ACTIVE')
      const libres = secs.filter((s) => !cubiertas.has(s.id)).length
      return { grado: g, libres, total: secs.length }
    })
    .filter((x) => x.libres > 0)
    .sort((a, b) => a.grado.nombre.localeCompare(b.grado.nombre))
}
