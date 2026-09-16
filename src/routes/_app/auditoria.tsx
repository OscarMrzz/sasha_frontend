import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { listAuditoria, type AuditoriaEvento, type AuditoriaListFilters } from '#/services/auditoria'

export const Route = createFileRoute('/_app/auditoria')({ component: AuditoriaPage })

const col = createColumnHelper<AuditoriaEvento>()

function AuditoriaPage() {
  const [filters, setFilters] = useState<AuditoriaListFilters>({ limite: 100 })
  const [applied, setApplied] = useState<AuditoriaListFilters>({ limite: 100 })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: AuditoriaEvento } | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auditoria', applied],
    queryFn: () => listAuditoria(applied),
  })

  const eventos = data?.eventos ?? []

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const columns = useMemo(
    () => [
      col.accessor('creado_en', {
        header: 'Fecha',
        cell: (i) => new Date(String(i.getValue())).toLocaleString('es-HN'),
      }),
      col.accessor('actor_codigo', { header: 'Actor', cell: (i) => i.getValue() ?? '—' }),
      col.accessor('accion', { header: 'Acción' }),
      col.accessor('recurso', { header: 'Recurso' }),
      col.accessor('estado', {
        header: 'Estado',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'accion', label: 'Acción', getValue: (r: AuditoriaEvento) => r.accion },
      { id: 'recurso', label: 'Recurso', getValue: (r: AuditoriaEvento) => r.recurso },
      { id: 'estado', label: 'Estado', getValue: (r: AuditoriaEvento) => r.estado },
    ],
    [],
  )

  return (
    <RequirePermission permission="auditoria:get">
      <div
        className="panel-toolbar"
        style={{
          background: 'var(--sasha-bg-raised)',
          border: '1px solid var(--sasha-border-suave)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', flex: 1 }}>
          <Field label="Actor">
            <input
              className="field__input"
              data-testid="auditoria-actor-filter"
              value={filters.actor ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value || undefined }))}
            />
          </Field>
          <Field label="Recurso">
            <input
              className="field__input"
              value={filters.recurso ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, recurso: e.target.value || undefined }))}
            />
          </Field>
          <Field label="Acción">
            <input
              className="field__input"
              value={filters.accion ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, accion: e.target.value || undefined }))}
            />
          </Field>
          <Field label="Desde">
            <input
              type="date"
              className="field__input"
              value={filters.desde ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, desde: e.target.value || undefined }))}
            />
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              className="field__input"
              value={filters.hasta ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, hasta: e.target.value || undefined }))}
            />
          </Field>
          <Field label="Límite">
            <input
              type="number"
              className="field__input"
              value={filters.limite ?? 100}
              onChange={(e) => setFilters((f) => ({ ...f, limite: Number(e.target.value) }))}
            />
          </Field>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          data-testid="auditoria-search-button"
          onClick={() => {
            setApplied({ ...filters })
            refetch()
          }}
        >
          Buscar
        </button>
      </div>

      {data ? (
        <p className="texto-muted" style={{ fontSize: '0.85rem' }}>
          Total: {data.total} evento(s)
        </p>
      ) : null}

      {isLoading ? (
        <div className="empty-state">Cargando auditoría…</div>
      ) : (
        <DataTable
          title="Auditoría"
          data={eventos}
          columns={columns}
          filters={tableFilters}
          exportFilename="auditoria"
          exportRows={eventos.map((e) => ({
            fecha: e.creado_en,
            actor: e.actor_codigo,
            accion: e.accion,
            recurso: e.recurso,
            estado: e.estado,
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      )}

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button
            type="button"
            className="ctx-menu__item"
            onClick={() => {
              toast.info(JSON.stringify(ctx.row.detalle ?? ctx.row, null, 2).slice(0, 200))
              closeCtx()
            }}
          >
            Ver detalle
          </button>
        </div>
      ) : null}
    </RequirePermission>
  )
}
