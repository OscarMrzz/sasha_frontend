import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useEffect, useMemo, useState } from 'react'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { TareaCreateModal } from '#/components/tareas/TareaCreateModal'
import { TareaRevisionModal } from '#/components/tareas/TareaRevisionModal'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import { listMateriasAsistencia } from '#/services/asistencia'
import { listTareas, labelCriterioModo, type Tarea } from '#/services/tareas'

export const Route = createFileRoute('/_app/tareas')({
  validateSearch: (s: Record<string, unknown>) => ({
    revisar: typeof s.revisar === 'string' ? s.revisar : undefined,
  }),
  component: TareasPage,
})

const col = createColumnHelper<Tarea>()

function claseLabel(t: Tarea) {
  return `${t.curso_nombre ?? '—'} · ${t.grado_nombre ?? ''} sec${t.seccion_nombre ?? ''}`
}

function TareasPage() {
  const { can } = useCan()
  const { revisar: revisarFromSearch } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: materias = [] } = useQuery({
    queryKey: ['asistencia-materias'],
    queryFn: listMateriasAsistencia,
  })
  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ['tareas'],
    queryFn: listTareas,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [revisarId, setRevisarId] = useState<string | null>(revisarFromSearch ?? null)
  const [asigId, setAsigId] = useState(() => readLastAsignacionId() ?? '')

  useEffect(() => {
    if (revisarFromSearch) setRevisarId(revisarFromSearch)
  }, [revisarFromSearch])

  const asigEffective =
    asigId && materias.some((m) => m.asignacion_docente_id === asigId)
      ? asigId
      : (materias[0]?.asignacion_docente_id ?? '')

  const materiaRow = materias.find((m) => m.asignacion_docente_id === asigEffective)
  const createLabel = materiaRow
    ? `${materiaRow.curso_nombre} · ${materiaRow.grado_nombre} sec${materiaRow.seccion_nombre} · ${materiaRow.modalidad_nombre}`
    : 'Sin clase'

  const columns = useMemo(
    () => [
      col.accessor('titulo', { header: 'Título' }),
      col.accessor((r) => claseLabel(r), { id: 'clase', header: 'Clase' }),
      col.accessor((r) => r.parcial_nombre || '—', { id: 'parcial', header: 'Parcial' }),
      col.accessor((r) => r.tipo_tarea_nombre || '—', { id: 'tipo_tarea', header: 'Tipo' }),
      col.accessor('tipo', {
        header: 'Criterio',
        cell: (i) => labelCriterioModo(i.getValue()),
      }),
      col.accessor('puntos', { header: 'Puntos' }),
      col.accessor('fecha_entrega', { header: 'Entrega' }),
      col.display({
        id: 'acciones',
        header: '',
        cell: ({ row }) => (
          <Can permission="tareas:post">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              data-testid={`tarea-revisar-${row.original.id}`}
              onClick={() => setRevisarId(row.original.id)}
            >
              Revisar
            </button>
          </Can>
        ),
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'parcial',
        label: 'Parcial',
        getValue: (r: Tarea) => r.parcial_nombre || 'Sin parcial',
      },
      {
        id: 'tipo_tarea',
        label: 'Tipo',
        getValue: (r: Tarea) => r.tipo_tarea_nombre || 'Sin tipo',
      },
      {
        id: 'criterio',
        label: 'Criterio',
        getValue: (r: Tarea) => labelCriterioModo(r.tipo),
      },
      {
        id: 'clase',
        label: 'Clase',
        getValue: (r: Tarea) => claseLabel(r),
      },
    ],
    [],
  )

  const closeRevision = () => {
    setRevisarId(null)
    if (revisarFromSearch) {
      void navigate({ search: { revisar: undefined } })
    }
  }

  return (
    <RequirePermission permission="tareas:get">
      {isLoading ? (
        <div className="empty-state">Cargando tareas…</div>
      ) : (
        <DataTable
          title="Tareas"
          data={tareas}
          columns={columns}
          filters={tableFilters}
          searchPlaceholder="Buscar…"
          canAdd={can('tareas:post')}
          addLabel="Nueva tarea"
          onAdd={() => setCreateOpen(true)}
        />
      )}

      {createOpen ? (
        <TareaCreateModal
          asignacionDocenteId={asigEffective}
          periodoAcademicoId={materiaRow?.periodo_academico_id ?? ''}
          claseLabel={createLabel}
          claseSelect={
            materias.length > 1 ? (
              <Field label="Clase">
                <select
                  className="field__select"
                  data-testid="tarea-asignacion-select"
                  value={asigEffective}
                  onChange={(e) => setAsigId(e.target.value)}
                >
                  {materias.map((m) => (
                    <option key={m.asignacion_docente_id} value={m.asignacion_docente_id}>
                      {m.curso_nombre} · {m.grado_nombre} sec{m.seccion_nombre}
                    </option>
                  ))}
                </select>
              </Field>
            ) : undefined
          }
          onClose={() => setCreateOpen(false)}
        />
      ) : null}

      {revisarId ? <TareaRevisionModal tareaId={revisarId} onClose={closeRevision} /> : null}
    </RequirePermission>
  )
}
