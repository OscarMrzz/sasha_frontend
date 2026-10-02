import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { TipoFichaModal } from '#/components/disciplina/TipoFichaModal'
import { Can, RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { userMessageFromError } from '#/lib/api'
import { acumulacionLabel, listTiposFicha, updateTipoFicha } from '#/services/disciplina'
import type { TipoFicha } from '#/services/disciplina'

export const Route = createFileRoute('/_app/disciplina/tipos')({ component: TiposFichaPage })

const col = createColumnHelper<TipoFicha>()

const conDias = (t: TipoFicha) => (t.niveles.some((n) => n.requiere_dias) ? 'Con días' : 'Sin días')
const estadoLabel = (s: string) => (s === 'ACTIVE' ? 'Activo' : 'Inactivo')

function TiposFichaPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({
    queryKey: ['disciplina-tipos', 'todos'],
    queryFn: () => listTiposFicha(true),
  })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: TipoFicha } | null>(null)
  const [editar, setEditar] = useState<{ tipo: TipoFicha | null } | null>(null)
  const [toggle, setToggle] = useState<TipoFicha | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const toggleMut = useMutation({
    mutationFn: (t: TipoFicha) =>
      updateTipoFicha(t.id, {
        titulo: t.titulo,
        descripcion: t.descripcion,
        acumulacion: t.acumulacion,
        status: t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        niveles: t.niveles,
      }),
    onSuccess: (t) => {
      toast.success(t.status === 'ACTIVE' ? 'Tipo activado' : 'Tipo desactivado')
      qc.invalidateQueries({ queryKey: ['disciplina-tipos'] })
      setToggle(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('titulo', {
        header: 'Tipo de ficha',
        cell: (i) => (
          <>
            {i.getValue()}
            {i.row.original.descripcion ? (
              <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
                {i.row.original.descripcion}
              </span>
            ) : null}
          </>
        ),
      }),
      col.accessor((r) => acumulacionLabel(r.acumulacion), {
        id: 'acumulacion',
        header: 'Acumulación',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
      col.accessor((r) => r.niveles.length, {
        id: 'niveles',
        header: 'Niveles',
        cell: (i) => (
          <ol className="niveles-resumen">
            {i.row.original.niveles.map((n) => (
              <li key={n.nivel}>
                {n.castigo}
                {n.requiere_dias ? <strong> · {n.dias} días</strong> : null}
              </li>
            ))}
          </ol>
        ),
      }),
      col.accessor('fichas_aplicadas', { header: 'Fichas aplicadas' }),
      col.accessor((r) => estadoLabel(r.status), {
        id: 'status',
        header: 'Estado',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      { id: 'status', label: 'Estado', getValue: (r: TipoFicha) => estadoLabel(r.status) },
      { id: 'acumulacion', label: 'Acumulación', getValue: (r: TipoFicha) => acumulacionLabel(r.acumulacion) },
      { id: 'dias', label: 'Días', getValue: conDias },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando tipos de ficha…</div>

  return (
    <RequirePermission permission="tipos_ficha:post">
      <div data-testid="tipos-ficha-page">
        <DataTable
          title="Tipos de ficha"
          data={data}
          columns={columns}
          filters={filters}
          addLabel="Agregar"
          canAdd={can('tipos_ficha:post')}
          onAdd={() => setEditar({ tipo: null })}
          exportFilename="tipos-de-ficha"
          exportRows={data.map((t) => ({
            titulo: t.titulo,
            descripcion: t.descripcion,
            acumulacion: acumulacionLabel(t.acumulacion),
            niveles: t.niveles
              .map((n) => `${n.nivel}. ${n.castigo}${n.requiere_dias ? ` (${n.dias} días)` : ''}`)
              .join(' | '),
            fichas_aplicadas: t.fichas_aplicadas,
            estado: estadoLabel(t.status),
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          onRowDoubleClick={(row) => can('tipos_ficha:put') && setEditar({ tipo: row })}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="tipos-ficha-ctx">
          <Can permission="tipos_ficha:put">
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="tipos-ficha-ctx-editar"
              onClick={() => {
                setEditar({ tipo: ctx.row })
                closeCtx()
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className={`ctx-menu__item${ctx.row.status === 'ACTIVE' ? ' ctx-menu__item--danger' : ''}`}
              onClick={() => {
                setToggle(ctx.row)
                closeCtx()
              }}
            >
              {ctx.row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
            </button>
          </Can>
        </div>
      ) : null}

      {editar ? <TipoFichaModal tipo={editar.tipo} onClose={() => setEditar(null)} /> : null}

      <ConfirmDialog
        open={Boolean(toggle)}
        title={toggle?.status === 'ACTIVE' ? 'Desactivar tipo' : 'Activar tipo'}
        message={
          toggle?.status === 'ACTIVE'
            ? `«${toggle.titulo}» ya no se podrá elegir al aplicar fichas. Las fichas ya aplicadas no cambian.`
            : `«${toggle?.titulo ?? ''}» volverá a estar disponible al aplicar fichas.`
        }
        danger={toggle?.status === 'ACTIVE'}
        confirmLabel={toggle?.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
        onConfirm={() => toggle && toggleMut.mutate(toggle)}
        onCancel={() => setToggle(null)}
      />
    </RequirePermission>
  )
}
