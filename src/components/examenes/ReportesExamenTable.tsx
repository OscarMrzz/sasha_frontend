import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Combobox } from '#/components/ui/Combobox'
import { DataTable } from '#/components/ui/DataTable'
import type { DataTableFilter } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import type { RowAction } from '#/components/ui/RowMenu'
import { fechaCorta, labelGradoSeccion, soloFecha } from '#/lib/examenes'
import type { ExamenReporte } from '#/services/examenes'

type ReporteRow = ExamenReporte & {
  grado_seccion: string
  fecha_label: string
}

type ReportesExamenTableProps = {
  reportes: ExamenReporte[]
  codigoActual?: string
  onVer: (reporte: ExamenReporte) => void
  onEditar?: (reporte: ExamenReporte) => void
  onEliminar: (reporte: ExamenReporte) => void
  onNuevo: () => void
  canCreate: boolean
  /** Staff: puede eliminar cualquier reporte, no solo los propios. */
  puedeEliminarTodos?: boolean
}

const col = createColumnHelper<ReporteRow>()

/** Tabla de reportes del maestro con filtros y acciones solo sobre los propios. */
export function ReportesExamenTable({
  reportes,
  codigoActual,
  onVer,
  onEditar,
  onEliminar,
  onNuevo,
  canCreate,
  puedeEliminarTodos = false,
}: ReportesExamenTableProps) {
  const [fecha, setFecha] = useState('')
  const [alumnoId, setAlumnoId] = useState('')
  const [ctx, setCtx] = useState<{ x: number; y: number; row: ReporteRow } | null>(null)
  const closeCtx = useCallback(() => setCtx(null), [])

  useEffect(() => {
    if (!ctx) return
    const onPointer = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.ctx-menu')) return
      closeCtx()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCtx()
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', closeCtx, true)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', closeCtx, true)
    }
  }, [ctx, closeCtx])

  const rows = useMemo<ReporteRow[]>(
    () =>
      reportes.map((reporte) => ({
        ...reporte,
        grado_seccion: labelGradoSeccion(reporte.grado, reporte.seccion),
        fecha_label: fechaCorta(reporte.fecha),
      })),
    [reportes],
  )

  const alumnoOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const reporte of reportes) {
      map.set(reporte.alumno_id, `${reporte.codigo} — ${reporte.nombre}`)
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }))
  }, [reportes])

  const visibles = useMemo(
    () =>
      rows.filter((row) => {
        if (fecha && soloFecha(row.fecha) !== fecha) return false
        if (alumnoId && row.alumno_id !== alumnoId) return false
        return true
      }),
    [rows, fecha, alumnoId],
  )

  const filters = useMemo<DataTableFilter<ReporteRow>[]>(() => {
    const grados = new Map<string, string>()
    const secciones = new Map<string, string>()
    const cursos = new Map<string, string>()
    for (const row of reportes) {
      grados.set(row.grado_id || row.grado, row.grado)
      secciones.set(row.seccion_id || row.seccion, labelGradoSeccion(row.grado, row.seccion))
      cursos.set(row.curso_id, row.curso_nombre)
    }
    return [
      {
        id: 'grado',
        label: 'Grado',
        getValue: (row) => row.grado_id || row.grado,
        options: [...grados.entries()]
          .sort((a, b) => a[1].localeCompare(b[1], 'es'))
          .map(([value, label]) => ({ value, label })),
      },
      {
        id: 'seccion',
        label: 'Sección',
        getValue: (row) => row.seccion_id || row.seccion,
        options: [...secciones.entries()]
          .sort((a, b) => a[1].localeCompare(b[1], 'es'))
          .map(([value, label]) => ({ value, label })),
      },
      {
        id: 'materia',
        label: 'Materia',
        getValue: (row) => row.curso_id,
        options: [...cursos.entries()]
          .sort((a, b) => a[1].localeCompare(b[1], 'es'))
          .map(([value, label]) => ({ value, label })),
      },
    ]
  }, [reportes])

  const acciones = (row: ReporteRow): RowAction[] => {
    const items: RowAction[] = [
      { label: 'Ver', onClick: () => onVer(row), testId: `reporte-ver-${row.id}` },
    ]
    if (onEditar && codigoActual && row.autor_codigo === codigoActual) {
      items.push({
        label: 'Editar',
        onClick: () => onEditar(row),
        testId: `reporte-editar-${row.id}`,
      })
    }
    if (puedeEliminarTodos || (codigoActual && row.autor_codigo === codigoActual)) {
      items.push({
        label: 'Eliminar',
        onClick: () => onEliminar(row),
        danger: true,
        testId: `reporte-eliminar-${row.id}`,
      })
    }
    return items
  }

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Código' }),
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('grado_seccion', { header: 'Grado / sección' }),
      col.accessor('curso_nombre', { header: 'Materia' }),
      col.accessor('fecha_label', { header: 'Fecha' }),
      col.accessor('supervisor', {
        header: 'Supervisor',
        cell: (info) => info.getValue() || '—',
      }),
    ],
    [],
  )

  const exportRows = useMemo(
    () =>
      visibles.map((row) => ({
        Código: row.codigo,
        Nombre: row.nombre,
        'Grado / sección': row.grado_seccion,
        Materia: row.curso_nombre,
        Fecha: row.fecha_label,
        Supervisor: row.supervisor,
        Detalle: row.detalle,
      })),
    [visibles],
  )

  return (
    <>
      <DataTable
        title="Reportes de examen"
        data={visibles}
        columns={columns}
        filters={filters}
        searchText={(row) =>
          [
            row.codigo,
            row.nombre,
            row.grado_seccion,
            row.curso_nombre,
            row.fecha_label,
            row.supervisor,
            row.autor_nombre,
            row.detalle,
          ].join(' ')
        }
        addLabel="Nuevo reporte"
        addTestId="reporte-examen-nuevo"
        canAdd={canCreate}
        onAdd={onNuevo}
        exportFilename="reportes-examen"
        exportRows={exportRows}
        onRowClick={(row, event) => setCtx({ x: event.clientX, y: event.clientY, row })}
        onRowContextMenu={(row, event) =>
          setCtx({ x: event.clientX, y: event.clientY, row })
        }
        rowActions={acciones}
        card={{
          title: (row) => `${row.codigo} — ${row.nombre}`,
          fields: (row) => [
            { label: 'Grado / sección', value: row.grado_seccion },
            { label: 'Materia', value: row.curso_nombre },
            { label: 'Fecha', value: row.fecha_label },
            { label: 'Supervisor', value: row.supervisor || '—' },
          ],
          testId: (row) => `reporte-card-${row.id}`,
        }}
        beforeTable={
          <div className="reportes-examen__filtros">
            <Field label="Fecha">
              <input
                type="date"
                className="field__input"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                data-testid="reporte-filtro-fecha"
              />
            </Field>
            <Field label="Alumno">
              <Combobox
                value={alumnoId}
                onChange={setAlumnoId}
                options={[{ value: '', label: 'Todos' }, ...alumnoOptions]}
                placeholder="Alumno…"
                data-testid="reporte-filtro-alumno"
              />
            </Field>
          </div>
        }
      />
      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {acciones(ctx.row).map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`ctx-menu__item${item.danger ? ' ctx-menu__item--danger' : ''}`}
              data-testid={item.testId}
              onClick={() => {
                closeCtx()
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}
