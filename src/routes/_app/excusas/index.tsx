import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ExcusaModal } from '#/components/excusas/ExcusaModal'
import { Can, RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { userMessageFromError } from '#/lib/api'
import { desactivarExcusa, estadoExcusaLabel, listExcusas, rangoExcusa } from '#/services/excusas'
import type { Excusa } from '#/services/excusas'

export const Route = createFileRoute('/_app/excusas/')({ component: ExcusasPage })

const col = createColumnHelper<Excusa>()

function ExcusasPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['excusas'], queryFn: listExcusas })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Excusa } | null>(null)
  const [modal, setModal] = useState<{ excusa: Excusa | null; soloVer: boolean } | null>(null)
  const [quitar, setQuitar] = useState<Excusa | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const quitarMut = useMutation({
    mutationFn: (e: Excusa) => desactivarExcusa(e.id),
    onSuccess: () => {
      toast.success('Excusa desactivada')
      qc.invalidateQueries({ queryKey: ['excusas'] })
      setQuitar(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('alumno_nombre', {
        header: 'Alumno',
        cell: (i) => (
          <>
            {i.getValue()}
            <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
              {i.row.original.alumno_codigo}
            </span>
          </>
        ),
      }),
      col.accessor((r) => (r.grado ? `${r.grado} ${r.seccion}` : '—'), { id: 'grado', header: 'Grado' }),
      col.accessor('tipo_nombre', {
        header: 'Tipo',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
      col.accessor((r) => rangoExcusa(r), { id: 'fechas', header: 'Fechas' }),
      col.accessor('descripcion', {
        header: 'Descripción',
        cell: (i) => i.getValue() || <span className="texto-muted">—</span>,
      }),
      col.accessor('clases', { header: 'Clases con permiso' }),
      col.accessor((r) => estadoExcusaLabel(r.status), {
        id: 'status',
        header: 'Estado',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      { id: 'tipo', label: 'Tipo', getValue: (r: Excusa) => r.tipo_nombre },
      { id: 'grado', label: 'Grado', getValue: (r: Excusa) => r.grado || '—' },
      { id: 'status', label: 'Estado', getValue: (r: Excusa) => estadoExcusaLabel(r.status) },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando excusas…</div>

  return (
    <RequirePermission permission="excusas:get">
      <div data-testid="excusas-page">
        <DataTable
          title="Excusas"
          data={data}
          columns={columns}
          filters={filters}
          addLabel="Agregar"
          canAdd={can('excusas:post')}
          onAdd={() => setModal({ excusa: null, soloVer: false })}
          exportFilename="excusas"
          exportRows={data.map((e) => ({
            codigo: e.alumno_codigo,
            alumno: e.alumno_nombre,
            grado: e.grado ? `${e.grado} ${e.seccion}` : '',
            tipo: e.tipo_nombre,
            fechas: rangoExcusa(e),
            descripcion: e.descripcion,
            clases: e.clases,
            estado: estadoExcusaLabel(e.status),
            registrado_por: e.registrado_por,
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          onRowDoubleClick={(row) =>
            setModal({ excusa: row, soloVer: !(can('excusas:post') && row.status === 'ACTIVE') })
          }
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="excusas-ctx">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="excusas-ctx-ver"
            onClick={() => {
              setModal({ excusa: ctx.row, soloVer: true })
              closeCtx()
            }}
          >
            Ver
          </button>
          {ctx.row.status === 'ACTIVE' ? (
            <Can permission="excusas:post">
              <button
                type="button"
                className="ctx-menu__item"
                data-testid="excusas-ctx-editar"
                onClick={() => {
                  setModal({ excusa: ctx.row, soloVer: false })
                  closeCtx()
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className="ctx-menu__item ctx-menu__item--danger"
                data-testid="excusas-ctx-desactivar"
                onClick={() => {
                  setQuitar(ctx.row)
                  closeCtx()
                }}
              >
                Desactivar
              </button>
            </Can>
          ) : null}
        </div>
      ) : null}

      {modal ? (
        <ExcusaModal excusa={modal.excusa} soloVer={modal.soloVer} onClose={() => setModal(null)} />
      ) : null}

      <ConfirmDialog
        open={Boolean(quitar)}
        title="Desactivar excusa"
        message={`La excusa de ${quitar?.alumno_nombre ?? ''} dejará de bloquear sus clases. Quedarán en «Excusa», pero los maestros podrán cambiarlas.`}
        danger
        confirmLabel="Desactivar"
        onConfirm={() => quitar && quitarMut.mutate(quitar)}
        onCancel={() => setQuitar(null)}
      />
    </RequirePermission>
  )
}
