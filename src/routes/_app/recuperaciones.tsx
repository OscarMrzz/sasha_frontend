import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { RecuperacionModal } from '#/components/recuperaciones/RecuperacionModal'
import { DataTable } from '#/components/ui/DataTable'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import { listMateriasAsistencia } from '#/services/asistencia'
import { listRecuperaciones } from '#/services/recuperaciones'
import type { FilaRecuperacion } from '#/services/recuperaciones'

export const Route = createFileRoute('/_app/recuperaciones')({ component: RecuperacionesPage })

const col = createColumnHelper<FilaRecuperacion>()

function RecuperacionesPage() {
  const { can } = useCan()
  const [modalOpen, setModalOpen] = useState(false)
  const { data: materias = [], isLoading: loadingMaterias } = useQuery({
    queryKey: ['asistencia-materias'],
    queryFn: listMateriasAsistencia,
  })

  const lastId = readLastAsignacionId()
  const asigEffective =
    lastId && materias.some((m) => m.asignacion_docente_id === lastId)
      ? lastId
      : (materias[0]?.asignacion_docente_id ?? '')
  const materiaRow = materias.find((m) => m.asignacion_docente_id === asigEffective)
  const claseLabel = materiaRow
    ? `${materiaRow.curso_nombre} · ${materiaRow.grado_nombre} sec${materiaRow.seccion_nombre}`
    : ''

  const { data: lista, isLoading } = useQuery({
    queryKey: ['recuperaciones', asigEffective],
    queryFn: () => listRecuperaciones(asigEffective),
    enabled: Boolean(asigEffective),
  })
  const filas = lista?.filas ?? []

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Cuenta' }),
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('etiqueta', { header: 'Recuperación' }),
      col.accessor('nota_original', { header: 'Nota original' }),
      col.accessor('nota', { header: 'Nota recuperación' }),
      col.accessor('cuenta', { header: 'Nota que cuenta' }),
      col.accessor('aprobo', {
        header: 'Estado',
        cell: (i) => (
          <span className={`badge ${i.getValue() ? 'badge--ok' : 'badge--danger'}`}>
            {i.getValue() ? 'Aprobó' : 'Reprobó'}
          </span>
        ),
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'tipo',
        label: 'Tipo',
        getValue: (r: FilaRecuperacion) => r.tipo,
        options: [
          { value: 'parcial', label: 'De parcial' },
          { value: 'periodo', label: 'De periodo' },
        ],
      },
      { id: 'recuperacion', label: 'Recuperación', getValue: (r: FilaRecuperacion) => r.etiqueta },
      {
        id: 'estado',
        label: 'Estado',
        getValue: (r: FilaRecuperacion) => (r.aprobo ? 'aprobo' : 'reprobo'),
        options: [
          { value: 'aprobo', label: 'Aprobó' },
          { value: 'reprobo', label: 'Reprobó' },
        ],
      },
    ],
    [],
  )

  if (loadingMaterias || (asigEffective && isLoading)) {
    return (
      <RequirePermission permission="recuperaciones:get">
        <div className="empty-state">Cargando recuperaciones…</div>
      </RequirePermission>
    )
  }
  if (!asigEffective || !lista) {
    return (
      <RequirePermission permission="recuperaciones:get">
        <div className="empty-state" data-testid="recuperaciones-sin-clase">
          No tienes clases asignadas.
        </div>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="recuperaciones:get">
      <div data-testid="recuperaciones-page">
        {lista.finalizado ? (
          <p className="recuperacion-aviso" data-testid="recuperaciones-finalizado">
            El periodo está finalizado: las recuperaciones son de solo lectura.
          </p>
        ) : null}
        <DataTable
          title={`Recuperaciones · ${claseLabel}`}
          data={filas}
          columns={columns}
          filters={tableFilters}
          canAdd={can('recuperaciones:post')}
          addLabel="Agregar"
          onAdd={() => setModalOpen(true)}
          exportFilename="recuperaciones"
          exportRows={filas.map((r) => ({
            Cuenta: r.codigo,
            Nombre: r.nombre,
            Recuperación: r.etiqueta,
            'Nota original': r.nota_original,
            'Nota recuperación': r.nota,
            'Nota que cuenta': r.cuenta,
            Estado: r.aprobo ? 'Aprobó' : 'Reprobó',
          }))}
        />
      </div>
      {modalOpen ? (
        <RecuperacionModal
          asignacionId={asigEffective}
          lista={lista}
          claseLabel={claseLabel}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </RequirePermission>
  )
}
