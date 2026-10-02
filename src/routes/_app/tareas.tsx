import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { TareaCreateModal } from '#/components/tareas/TareaCreateModal'
import { TareaRevisionModal } from '#/components/tareas/TareaRevisionModal'
import { ClaseTareasModal } from '#/components/tareas/ClaseTareasModal'
import { PortalTareasView } from '#/components/portal/PortalTareasView'
import { RequirePortalClase } from '#/components/portal/RequirePortalClase'
import { isPortalRole } from '#/lib/home-path'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import { listMateriasAsistencia } from '#/services/asistencia'
import { listClasesTareas, listTareas, labelCriterioModo } from '#/services/tareas'
import type { ClaseResumen, Tarea } from '#/services/tareas'

/** Roles que ven las tareas por clase de todo el colegio, en solo lectura. */
const VISTA_GENERAL = new Set(['consejeria', 'director', 'secretaria', 'coordinador'])

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
  const { roles } = useCan()
  if (isPortalRole(roles)) {
    return (
      <RequirePermission permission="tareas:get">
        <RequirePortalClase>
          {({ clase, alumnoId }) => (
            <PortalTareasView
              asignacionId={clase.asignacionId}
              cursoNombre={clase.cursoNombre}
              alumnoId={alumnoId}
            />
          )}
        </RequirePortalClase>
      </RequirePermission>
    )
  }
  if (roles.some((r) => VISTA_GENERAL.has(r))) return <TareasConsejeriaView />
  return <TareasStaffPage />
}

const colClase = createColumnHelper<ClaseResumen>()

function TareasConsejeriaView() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['tareas-clases'],
    queryFn: listClasesTareas,
  })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: ClaseResumen } | null>(null)
  const [verClase, setVerClase] = useState<ClaseResumen | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const columns = useMemo(
    () => [
      colClase.accessor('curso_nombre', { header: 'Materia' }),
      colClase.accessor('grado_nombre', { header: 'Grado' }),
      colClase.accessor('seccion_nombre', { header: 'Sección' }),
      colClase.accessor('modalidad_nombre', { header: 'Modalidad' }),
      colClase.accessor('maestro_nombre', {
        header: 'Maestro',
        cell: (i) => i.getValue() || '—',
      }),
      colClase.accessor('tareas_total', { header: 'Tareas' }),
      colClase.accessor('tareas_semana', { header: 'Esta semana' }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'maestro',
        label: 'Maestro',
        getValue: (r: ClaseResumen) => r.maestro_id,
        getLabel: (r: ClaseResumen) => r.maestro_nombre,
      },
      { id: 'materia', label: 'Materia', getValue: (r: ClaseResumen) => r.curso_nombre },
      { id: 'grado', label: 'Grado', getValue: (r: ClaseResumen) => r.grado_nombre },
      { id: 'seccion', label: 'Sección', getValue: (r: ClaseResumen) => r.seccion_nombre },
      { id: 'modalidad', label: 'Modalidad', getValue: (r: ClaseResumen) => r.modalidad_nombre },
    ],
    [],
  )

  return (
    <RequirePermission permission="tareas:get">
      {isLoading ? (
        <div className="empty-state">Cargando clases…</div>
      ) : (
        <DataTable
          title="Tareas"
          data={data}
          columns={columns}
          filters={tableFilters}
          canAdd={false}
          onRowDoubleClick={(row) => setVerClase(row)}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      )}

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          data-testid="tareas-ctx-menu"
        >
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="tareas-ctx-ver"
            onClick={() => {
              setVerClase(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
        </div>
      ) : null}

      {verClase ? <ClaseTareasModal clase={verClase} onClose={() => setVerClase(null)} /> : null}
    </RequirePermission>
  )
}

function TareasStaffPage() {
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
