import { flexRender, type RowData } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'

type DataTableProps<T extends RowData> = {
  data: T[]
  columns: LegacyColumnDef<T, any>[]
  searchPlaceholder?: string
  onRowContextMenu?: (row: T, event: React.MouseEvent) => void
  toolbarExtra?: React.ReactNode
  addLabel?: string
  onAdd?: () => void
  canAdd?: boolean
  onExport?: () => void
}

export function DataTable<T extends RowData>({
  data,
  columns,
  searchPlaceholder = 'Buscar…',
  onRowContextMenu,
  toolbarExtra,
  addLabel = 'Agregar',
  onAdd,
  canAdd,
  onExport,
}: DataTableProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useLegacyTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  })

  const rows = table.getRowModel().rows
  const pageCount = table.getPageCount()

  const empty = useMemo(() => rows.length === 0, [rows.length])

  return (
    <div>
      <div className="panel-toolbar">
        <div className="panel-toolbar__search">
          <input
            className="field__input"
            style={{ width: '100%' }}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Buscar"
          />
        </div>
        <div className="panel-toolbar__actions">
          {toolbarExtra}
          {onExport ? (
            <button type="button" className="btn btn--ghost" onClick={onExport}>
              Descargar Excel
            </button>
          ) : null}
          {canAdd && onAdd ? (
            <button type="button" className="btn btn--primary" data-testid="data-table-add-button" onClick={onAdd}>
              {addLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty-state">Sin resultados</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onContextMenu={(e) => {
                    if (!onRowContextMenu) return
                    e.preventDefault()
                    onRowContextMenu(row.original as T, e)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.5rem',
          marginTop: '0.75rem',
          alignItems: 'center',
        }}
      >
        <span className="texto-muted" style={{ fontSize: '0.8rem' }}>
          Página {table.getState().pagination.pageIndex + 1} de {Math.max(pageCount, 1)}
        </span>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
