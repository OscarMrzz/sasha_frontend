import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ContratoArchivoModal } from '#/components/contratos/ContratoArchivoModal'
import { ContratoPreview } from '#/components/contratos/ContratoPreview'
import { Can, RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { userMessageFromError } from '#/lib/api'
import {
  contratoBadgeClass,
  deleteContrato,
  fechaContrato,
  listContratos,
  tipoContratoLabel,
  visibilidadLabel,
} from '#/services/contratos'
import type { Contrato } from '#/services/contratos'

export const Route = createFileRoute('/_app/contratos/')({ component: ContratosPage })

const col = createColumnHelper<Contrato>()

function ContratosPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => listContratos(),
  })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Contrato } | null>(null)
  const [altaOpen, setAltaOpen] = useState(false)
  const [editar, setEditar] = useState<Contrato | null>(null)
  const [ver, setVer] = useState<Contrato | null>(null)
  const [eliminar, setEliminar] = useState<Contrato | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const eliminarMut = useMutation({
    mutationFn: (c: Contrato) => deleteContrato(c.id),
    onSuccess: () => {
      toast.success('Contrato eliminado')
      qc.invalidateQueries({ queryKey: ['contratos'] })
      setEliminar(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('titulo', { header: 'Título' }),
      col.accessor((r) => tipoContratoLabel(r.tipo), {
        id: 'tipo',
        header: 'Tipo',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
      col.accessor((r) => visibilidadLabel(r.visibilidad), {
        id: 'visibilidad',
        header: 'Visibilidad',
        cell: (i) => (
          <span className={contratoBadgeClass(i.row.original.visibilidad)}>{i.getValue()}</span>
        ),
      }),
      col.accessor('autor', { header: 'Autor' }),
      col.accessor((r) => r.archivo_nombre || '—', { id: 'archivo', header: 'Archivo' }),
      col.accessor((r) => fechaContrato(r.creado_en), { id: 'creado', header: 'Fecha creación' }),
      col.accessor((r) => fechaContrato(r.actualizado_en), {
        id: 'actualizado',
        header: 'Fecha modificación',
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      {
        id: 'tipo',
        label: 'Tipo',
        getValue: (r: Contrato) => tipoContratoLabel(r.tipo),
        getLabel: (r: Contrato) => tipoContratoLabel(r.tipo),
      },
      {
        id: 'visibilidad',
        label: 'Visibilidad',
        getValue: (r: Contrato) => visibilidadLabel(r.visibilidad),
        getLabel: (r: Contrato) => visibilidadLabel(r.visibilidad),
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando contratos…</div>

  return (
    <RequirePermission permission="contratos:get">
      <div data-testid="contratos-page">
        <DataTable
          title="Contratos"
          data={data}
          columns={columns}
          filters={filters}
          addLabel="Agregar"
          addTestId="contratos-add"
          canAdd={can('contratos:post')}
          onAdd={() => setAltaOpen(true)}
          exportFilename="contratos"
          exportRows={data.map((c) => ({
            titulo: c.titulo,
            tipo: tipoContratoLabel(c.tipo),
            visibilidad: visibilidadLabel(c.visibilidad),
            autor: c.autor,
            archivo: c.archivo_nombre ?? '',
            creado: fechaContrato(c.creado_en),
            actualizado: fechaContrato(c.actualizado_en),
          }))}
          onRowClick={(row) => setVer(row)}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      </div>

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          data-testid="contratos-ctx"
        >
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="contrato-ctx-ver"
            onClick={() => {
              setVer(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
          {ctx.row.puede_editar && can('contratos:put') ? (
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="contrato-ctx-editar"
              onClick={() => {
                setEditar(ctx.row)
                closeCtx()
              }}
            >
              Editar
            </button>
          ) : null}
          {ctx.row.puede_eliminar && can('contratos:delete') ? (
            <Can permission="contratos:delete">
              <button
                type="button"
                className="ctx-menu__item ctx-menu__item--danger"
                data-testid="contrato-ctx-eliminar"
                onClick={() => {
                  setEliminar(ctx.row)
                  closeCtx()
                }}
              >
                Eliminar
              </button>
            </Can>
          ) : null}
        </div>
      ) : null}

      {altaOpen ? <ContratoArchivoModal onClose={() => setAltaOpen(false)} /> : null}
      {editar ? <ContratoArchivoModal contrato={editar} onClose={() => setEditar(null)} /> : null}
      {ver ? <ContratoPreview contrato={ver} onClose={() => setVer(null)} /> : null}

      <ConfirmDialog
        open={Boolean(eliminar)}
        title="Eliminar contrato"
        message={`«${eliminar?.titulo ?? ''}» se eliminará de forma permanente, junto con su archivo. Esta acción no se puede deshacer.`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => eliminar && eliminarMut.mutate(eliminar)}
        onCancel={() => setEliminar(null)}
      />
    </RequirePermission>
  )
}
