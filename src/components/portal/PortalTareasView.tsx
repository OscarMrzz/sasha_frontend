import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo } from 'react'
import { DataTable } from '#/components/ui/DataTable'
import { listTareasClase } from '#/services/portal'
import type { PortalTarea } from '#/services/portal'

const col = createColumnHelper<PortalTarea>()

function labelEstado(e: PortalTarea['estado']) {
  return e === 'revisada' ? 'Revisada' : 'Pendiente'
}

export function PortalTareasView({
  asignacionId,
  cursoNombre,
  alumnoId,
}: {
  asignacionId: string
  cursoNombre: string
  alumnoId: string | null
}) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['portal-tareas', asignacionId, alumnoId ?? 'self'],
    queryFn: () => listTareasClase(asignacionId, alumnoId),
  })

  const columns = useMemo(
    () => [
      col.accessor('titulo', { header: 'Título' }),
      col.accessor((r) => r.tipo_tarea_nombre || '—', { id: 'tipo', header: 'Tipo' }),
      col.accessor('fecha_asignacion', { header: 'Asignada' }),
      col.accessor('fecha_entrega', { header: 'Entrega' }),
      col.accessor('estado', {
        header: 'Estado',
        cell: (i) => (
          <span
            className={`mdash__chip ${i.getValue() === 'revisada' ? 'mdash__chip--ok' : 'mdash__chip--warn'}`}
          >
            {labelEstado(i.getValue())}
          </span>
        ),
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      { id: 'estado', label: 'Estado', getValue: (r: PortalTarea) => labelEstado(r.estado) },
      { id: 'tipo', label: 'Tipo', getValue: (r: PortalTarea) => r.tipo_tarea_nombre || 'Sin tipo' },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando tareas…</div>
  if (isError) {
    return (
      <div className="empty-state" data-testid="portal-tareas-error">
        Hay problemas de conexión.
      </div>
    )
  }

  return (
    <div data-testid="portal-tareas">
      <DataTable
        title={`Tareas · ${cursoNombre}`}
        data={data}
        columns={columns}
        filters={filters}
        canAdd={false}
      />
    </div>
  )
}
