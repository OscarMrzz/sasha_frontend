import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo } from 'react'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { PortalCalificacionesView } from '#/components/portal/PortalCalificacionesView'
import { RequirePortalClase } from '#/components/portal/RequirePortalClase'
import { DataTable } from '#/components/ui/DataTable'
import { isPortalRole } from '#/lib/home-path'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import { listMateriasAsistencia } from '#/services/asistencia'
import { listNotasClase } from '#/services/calificaciones'
import type { NotaClaseRow, ParcialColumna } from '#/services/calificaciones'

export const Route = createFileRoute('/_app/calificaciones')({ component: CalificacionesPage })

const col = createColumnHelper<NotaClaseRow>()

function fmtPuntos(v: number | null | undefined) {
  return v == null ? '—' : v
}

function buildColumns(parciales: ParcialColumna[]) {
  return [
    col.accessor('codigo', { header: 'Código' }),
    col.accessor('nombre', { header: 'Nombre' }),
    ...parciales.map((p, idx) =>
      col.accessor((r) => r.puntos_parcial[idx] ?? null, {
        id: `parcial-${p.id}`,
        header: p.etiqueta,
        cell: (i) => fmtPuntos(i.getValue()),
      }),
    ),
    col.accessor('total', {
      header: 'Total',
      cell: (i) => fmtPuntos(i.getValue()),
    }),
    col.accessor('promedio', {
      header: 'Promedio',
      cell: (i) => fmtPuntos(i.getValue()),
    }),
    col.accessor('etiqueta', { header: 'Estado' }),
  ]
}

function CalificacionesPage() {
  const { roles } = useCan()
  if (isPortalRole(roles)) {
    return (
      <RequirePermission permission="calificaciones:get">
        <RequirePortalClase>
          {({ clase, alumnoId }) => (
            <PortalCalificacionesView
              asignacionId={clase.asignacionId}
              cursoNombre={clase.cursoNombre}
              alumnoId={alumnoId}
            />
          )}
        </RequirePortalClase>
      </RequirePermission>
    )
  }
  return <CalificacionesStaffPage />
}

function CalificacionesStaffPage() {
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

  const {
    data: clase,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['calificaciones-clase', asigEffective],
    queryFn: () => listNotasClase(asigEffective),
    enabled: Boolean(asigEffective),
  })

  const parciales = clase?.parciales
  const filas = clase?.filas ?? []

  const columns = useMemo(() => buildColumns(parciales ?? []), [parciales])

  const tableFilters = useMemo(
    () => [
      {
        id: 'etiqueta',
        label: 'Estado',
        getValue: (r: NotaClaseRow) => r.etiqueta,
        options: [
          { value: 'Reprobado', label: 'Reprobado' },
          { value: 'Aprobado', label: 'Aprobado' },
          { value: 'Honor al mérito', label: 'Honor al mérito' },
          { value: 'Excelencia académica', label: 'Excelencia académica' },
          { value: 'Sin nota', label: 'Sin nota' },
        ],
      },
    ],
    [],
  )

  const title = materiaRow
    ? `Calificaciones · ${materiaRow.curso_nombre} · ${materiaRow.grado_nombre} sec${materiaRow.seccion_nombre}`
    : 'Calificaciones'

  const exportRows = useMemo(
    () =>
      filas.map((r) => {
        const row: Record<string, unknown> = { Código: r.codigo, Nombre: r.nombre }
        ;(parciales ?? []).forEach((p, idx) => {
          row[p.etiqueta] = fmtPuntos(r.puntos_parcial[idx])
        })
        row.Total = fmtPuntos(r.total)
        row.Promedio = fmtPuntos(r.promedio)
        row.Estado = r.etiqueta
        return row
      }),
    [filas, parciales],
  )

  const exportFilename = materiaRow
    ? `calificaciones-${materiaRow.curso_nombre}-${materiaRow.grado_nombre}-sec${materiaRow.seccion_nombre}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-]+/g, '-')
        .toLowerCase()
    : 'calificaciones'

  if (loadingMaterias) {
    return (
      <RequirePermission permission="calificaciones:get">
        <div className="empty-state">Cargando clases…</div>
      </RequirePermission>
    )
  }

  if (materias.length === 0 || !asigEffective) {
    return (
      <RequirePermission permission="calificaciones:get">
        <div className="empty-state" data-testid="calif-sin-clases">
          Entrá a una clase desde el dashboard para ver calificaciones.
        </div>
      </RequirePermission>
    )
  }

  if (isError) {
    return (
      <RequirePermission permission="calificaciones:get">
        <div className="empty-state" data-testid="calif-error">
          Hay problemas de conexión.
        </div>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="calificaciones:get">
      <DataTable
        title={title}
        data={isLoading ? [] : filas}
        columns={columns}
        filters={tableFilters}
        searchPlaceholder="Buscar por código o nombre…"
        exportFilename={exportFilename}
        exportRows={isLoading ? undefined : exportRows}
      />
    </RequirePermission>
  )
}
