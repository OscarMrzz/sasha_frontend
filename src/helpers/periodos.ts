import type { ComboboxOption } from '#/components/ui/Combobox'
import type { Periodo } from '#/services/catalogos'

export function periodoEstadoPalabra(status: string): 'activo' | 'inactivo' {
  return status === 'ACTIVE' ? 'activo' : 'inactivo'
}

export function labelPeriodo(p: Pick<Periodo, 'nombre' | 'status'>): string {
  return `${p.nombre} · ${periodoEstadoPalabra(p.status)}`
}

/** Opciones para Combobox / OptionPick: activo primero; inactivo muted pero seleccionable. */
export function periodoSelectOptions(periodos: Periodo[]): (ComboboxOption & { muted?: boolean })[] {
  return [...periodos]
    .sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1
      return b.anio_lectivo - a.anio_lectivo || a.nombre.localeCompare(b.nombre)
    })
    .map((p) => ({
      value: p.id,
      label: labelPeriodo(p),
      keywords: `${p.nombre} ${p.anio_lectivo} ${periodoEstadoPalabra(p.status)} ACTIVE INACTIVE`,
      muted: p.status !== 'ACTIVE',
    }))
}

export function periodoActivoId(periodos: Periodo[]): string | undefined {
  return periodos.find((p) => p.status === 'ACTIVE')?.id
}
