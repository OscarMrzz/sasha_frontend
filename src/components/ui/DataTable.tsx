import { flexRender, type RowData } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { downloadCsv } from '#/helpers/export-csv'
import { downloadTablePdf } from '#/helpers/export-pdf'
import { RowMenu } from '#/components/ui/RowMenu'
import type { RowAction } from '#/components/ui/RowMenu'
import { SearchInput } from '#/components/ui/SearchInput'
import { useEsMovil } from '#/hooks/use-media-query'

export type DataTableFilter<T> = {
  id: string
  label: string
  /** Valor canónico para filtrar. Nunca usar código de catálogo. */
  getValue: (row: T) => string
  getLabel?: (row: T) => string
  /** Si el filtro no es igualdad exacta (ej. usuario con varios roles). */
  matches?: (row: T, selected: string) => boolean
  /** Valores extra para armar opciones (ej. cada rol del usuario). */
  getOptionValues?: (row: T) => string[]
  /** Si se omite, se derivan de los datos únicos. */
  options?: { value: string; label: string }[]
}

export type DataTableCardField = { label: string; value: ReactNode }

export type DataTableCardStatus = { label: string; tone?: 'ok' | 'mal' | 'espera' }

/** Vista de cards que reemplaza a la tabla en teléfono/tablet (`< 768px`). */
export type DataTableCard<T> = {
  /** Titular de la card (normalmente una columna de la tabla). */
  title: (row: T) => ReactNode
  /** Pares etiqueta/valor visibles en la card. */
  fields?: (row: T) => DataTableCardField[]
  /** Pill de estado opcional. */
  status?: (row: T) => DataTableCardStatus | null
  /** `data-testid` de la card (por defecto `data-card-<fila>`). */
  testId?: (row: T) => string
}

type DataTableProps<T extends RowData> = {
  data: T[]
  columns: LegacyColumnDef<T, any>[]
  /** Si se pasa, renderiza el h1 con el conteo de filas al lado. */
  title?: string
  /** Filtros clave (select). No incluir códigos. */
  filters?: DataTableFilter<T>[]
  onRowContextMenu?: (row: T, event: React.MouseEvent) => void
  onRowClick?: (row: T, event: React.MouseEvent) => void
  onRowDoubleClick?: (row: T, event: React.MouseEvent) => void
  toolbarExtra?: ReactNode
  /** Recibe los valores de los selects cada vez que cambian (para filtros que calcula el padre). */
  onFiltersChange?: (values: Record<string, string>) => void
  /** Valores con los que arrancan los selects (id del filtro → valor). */
  initialFilters?: Record<string, string>
  /** Contenido entre la barra de filtros y la tabla. */
  beforeTable?: ReactNode
  addLabel?: string
  onAdd?: () => void
  canAdd?: boolean
  /** `data-testid` del botón Agregar (por defecto `data-table-add-button`). */
  addTestId?: string
  /**
   * Texto adicional por fila para el buscador global (el buscador usa los valores
   * crudos de las columnas; pásalo cuando las columnas guardan IDs y quieras
   * encontrar por nombre: maestro, clase, grado, sección, etc.).
   */
  searchText?: (row: T) => string
  onExport?: () => void
  /** Filas para Descargar (Excel + PDF). Si se pasa, se ignora onExport. */
  exportFilename?: string
  exportRows?: Record<string, unknown>[]
  pageSize?: number
  /**
   * Vista de cards en teléfono/tablet (`< 768px`). En escritorio la tabla se ve
   * igual que siempre. Sin esta prop, la tabla no cambia en ningún tamaño.
   */
  card?: DataTableCard<T>
  /** Acciones de fila para el botón de 3 puntos de las cards. */
  rowActions?: (row: T) => RowAction[]
}

function isCodigoFilterId(id: string) {
  const n = id.toLowerCase()
  return n === 'codigo' || n === 'code' || n.endsWith('_codigo') || n.endsWith('_code') || n === 'user_code'
}

/** Columna oculta que aporta texto buscable (nombres) sin mostrarse en la tabla. */
const SEARCH_COL_ID = '__search'

function isSearchOnly(colDef: { meta?: unknown }) {
  return Boolean((colDef.meta as { searchOnly?: boolean } | undefined)?.searchOnly)
}

/** Minúsculas y sin acentos, para que «chacon» encuentre «Chacón». */
function norm(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function DataTable<T extends RowData>({
  data,
  columns,
  title,
  filters = [],
  onRowContextMenu,
  onRowClick,
  onRowDoubleClick,
  toolbarExtra,
  onFiltersChange,
  initialFilters,
  beforeTable,
  addLabel = 'Agregar',
  onAdd,
  canAdd,
  addTestId = 'data-table-add-button',
  searchText,
  onExport,
  exportFilename,
  exportRows,
  pageSize = 25,
  card,
  rowActions,
}: DataTableProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => initialFilters ?? {})
  const exportRef = useRef<HTMLDetailsElement>(null)
  const paginationRef = useRef({ pageIndex: 0, pageSize })
  const esMovil = useEsMovil()

  const safeFilters = useMemo(
    () => filters.filter((f) => !isCodigoFilterId(f.id)),
    [filters],
  )

  const filterOptions = useMemo(() => {
    const map: Record<string, { value: string; label: string }[]> = {}
    for (const f of safeFilters) {
      if (f.options?.length) {
        map[f.id] = f.options
        continue
      }
      const seen = new Map<string, string>()
      for (const row of data) {
        const values = f.getOptionValues?.(row) ?? [String(f.getValue(row) ?? '').trim()]
        for (const raw of values) {
          const value = String(raw ?? '').trim()
          if (!value) continue
          if (!seen.has(value)) seen.set(value, f.getLabel?.(row) ?? value)
        }
      }
      map[f.id] = [...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    }
    return map
  }, [data, safeFilters])

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      for (const f of safeFilters) {
        const selected = filterValues[f.id]
        if (!selected) continue
        if (f.matches) {
          if (!f.matches(row, selected)) return false
        } else if (String(f.getValue(row) ?? '') !== selected) {
          return false
        }
      }
      return true
    })
  }, [data, safeFilters, filterValues])

  const tableColumns = useMemo(() => {
    const rowNum: LegacyColumnDef<T, any> = {
      id: '_n',
      header: '#',
      enableSorting: false,
      cell: ({ row }) => {
        const { pageIndex, pageSize: ps } = paginationRef.current
        return <span className="data-table__rownum">{pageIndex * ps + row.index + 1}</span>
      },
    }
    const cols: LegacyColumnDef<T, any>[] = [rowNum, ...columns]
    if (searchText) {
      cols.push({
        id: SEARCH_COL_ID,
        header: '',
        enableSorting: false,
        accessorFn: (row) => searchText(row as T),
        cell: () => null,
        meta: { searchOnly: true },
      })
    }
    return cols
  }, [columns, searchText])

  const table = useLegacyTable({
    data: filteredData,
    columns: tableColumns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, columnId, filterValue) => {
      const needle = norm(String(filterValue ?? ''))
      if (!needle) return true
      const raw = row.getValue(columnId)
      if (raw == null) return false
      const hay = norm(String(raw))
      return needle.split(/\s+/).every((token) => hay.includes(token))
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize } },
  })

  paginationRef.current = {
    pageIndex: table.getState().pagination.pageIndex,
    pageSize: table.getState().pagination.pageSize,
  }

  const rows = table.getRowModel().rows
  const pageCount = table.getPageCount()
  const totalRows = data.length
  const visibleRows = table.getFilteredRowModel().rows.length
  const empty = rows.length === 0

  const countLabel =
    visibleRows === totalRows ? `${totalRows} filas` : `${visibleRows} de ${totalRows} filas`

  const canExport = Boolean(exportRows) || Boolean(onExport)

  const closeExport = () => {
    if (exportRef.current) exportRef.current.open = false
  }

  const handleExcel = () => {
    closeExport()
    if (exportRows && exportFilename) {
      downloadCsv(exportFilename.endsWith('.csv') ? exportFilename : `${exportFilename}.csv`, exportRows)
      return
    }
    onExport?.()
  }

  const handlePdf = () => {
    closeExport()
    if (exportRows && exportFilename) {
      downloadTablePdf(exportFilename, title ?? 'Listado', exportRows)
    }
  }

  return (
    <div>
      {title ? (
        <div className="page-title-row">
          <h1 className="page-title">{title}</h1>
          <span className="page-title__count" data-testid="table-row-count">
            {countLabel}
          </span>
        </div>
      ) : null}

      <div className="panel-toolbar">
        <div className="panel-toolbar__search">
          <SearchInput
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            data-testid="data-table-search"
          />
        </div>
        {safeFilters.length > 0 ? (
          <div className="panel-toolbar__filters" data-testid="data-table-filters">
            {safeFilters.map((f) => (
              <label key={f.id} className="panel-toolbar__filter">
                <span className="panel-toolbar__filter-label">{f.label}</span>
                <select
                  className="field__select"
                  value={filterValues[f.id] ?? ''}
                  aria-label={`Filtrar por ${f.label}`}
                  data-testid={`data-table-filter-${f.id}`}
                  onChange={(e) => {
                    const next = { ...filterValues, [f.id]: e.target.value }
                    setFilterValues(next)
                    onFiltersChange?.(next)
                  }}
                >
                  <option value="">Todos</option>
                  {(filterOptions[f.id] ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}
        <div className="panel-toolbar__actions">
          {toolbarExtra}
          {canExport ? (
            <details className="export-menu" ref={exportRef}>
              <summary
                className="btn btn--ghost"
                data-testid="data-table-download"
              >
                Descargar
                <ChevronDown size={14} />
              </summary>
              <div className="export-menu__list" role="menu">
                <button type="button" className="ctx-menu__item" role="menuitem" onClick={handleExcel}>
                  Excel (.csv)
                </button>
                {exportRows ? (
                  <button type="button" className="ctx-menu__item" role="menuitem" onClick={handlePdf}>
                    PDF
                  </button>
                ) : null}
              </div>
            </details>
          ) : null}
          {canAdd && onAdd ? (
            <button type="button" className="btn btn--primary" data-testid={addTestId} onClick={onAdd}>
              {addLabel}
            </button>
          ) : null}
        </div>
      </div>

      {beforeTable}

      {esMovil && card ? (
        <ul className="data-cards" data-testid="data-cards">
          {empty ? (
            <li className="data-cards__vacio">
              <div className="empty-state">Sin resultados</div>
            </li>
          ) : (
            rows.map((row) => {
              const r: T = row.original
              const est = card.status?.(r) ?? null
              const campos = card.fields?.(r) ?? []
              return (
                <li
                  key={row.id}
                  className={`data-card${onRowClick ? ' data-card--click' : ''}`}
                  data-testid={card.testId?.(r) ?? `data-card-${row.id}`}
                  onClick={onRowClick ? (e) => onRowClick(r, e) : undefined}
                >
                  <div className="data-card__cab">
                    <span className="data-card__title">{card.title(r)}</span>
                    <span className="data-card__lado">
                      {est ? (
                        <span className={`estado-pill${est.tone ? ` estado-pill--${est.tone}` : ''}`}>
                          {est.label}
                        </span>
                      ) : null}
                      <RowMenu items={rowActions?.(r) ?? []} testId={`row-menu-${row.id}`} />
                    </span>
                  </div>
                  {campos.length > 0 ? (
                    <dl className="data-card__fields">
                      {campos.map((f) => (
                        <div key={f.label} className="data-card__field">
                          <dt className="data-card__field-label">{f.label}</dt>
                          <dd className="data-card__field-value">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </li>
              )
            })
          )}
        </ul>
      ) : (
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.filter((h) => !isSearchOnly(h.column.columnDef)).map((h) => {
                  const canSort = h.column.getCanSort()
                  const sorted = h.column.getIsSorted()
                  return (
                    <th
                      key={h.id}
                      className={canSort ? 'data-table__th--sortable' : undefined}
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                      }
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="data-table__th-inner">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {canSort ? (
                          <span className="data-table__sort" aria-hidden>
                            {sorted === 'asc' ? (
                              <ArrowUp size={13} />
                            ) : sorted === 'desc' ? (
                              <ArrowDown size={13} />
                            ) : (
                              <ArrowUpDown size={13} />
                            )}
                          </span>
                        ) : null}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td colSpan={tableColumns.length}>
                  <div className="empty-state">Sin resultados</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  style={onRowClick || onRowDoubleClick ? { cursor: 'pointer' } : undefined}
                  onClick={(e) => {
                    if (!onRowClick) return
                    onRowClick(row.original as T, e)
                  }}
                  onDoubleClick={(e) => {
                    if (!onRowDoubleClick) return
                    onRowDoubleClick(row.original as T, e)
                  }}
                  onContextMenu={(e) => {
                    if (!onRowContextMenu) return
                    e.preventDefault()
                    onRowContextMenu(row.original as T, e)
                  }}
                >
                  {row.getVisibleCells().filter((cell) => !isSearchOnly(cell.column.columnDef)).map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      <div className="data-table__pager">
        <span className="texto-muted" style={{ fontSize: '0.8rem' }}>
          Página {table.getState().pagination.pageIndex + 1} de {Math.max(pageCount, 1)} · {pageSize}{' '}
          por página
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
