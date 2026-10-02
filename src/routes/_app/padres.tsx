import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RequirePermission } from '#/components/gates/Can'
import { EstadoPago, MontoVencido, etiquetaEstadoPago } from '#/components/pagos/EstadoPago'
import { DataTable } from '#/components/ui/DataTable'
import { UserFichaModal } from '#/components/usuarios/UserFichaModal'
import { listCarteraPadres } from '#/services/pagos'
import type { CarteraPadre } from '#/services/pagos'

export const Route = createFileRoute('/_app/padres')({ component: PadresCajaPage })

const col = createColumnHelper<CarteraPadre>()

function PadresCajaPage() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({ queryKey: ['cartera-padres'], queryFn: listCarteraPadres })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: CarteraPadre } | null>(null)
  const [ficha, setFicha] = useState<string | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const columns = useMemo(
    () => [
      col.accessor((r) => `${r.nombre} ${r.codigo}`, {
        id: 'nombre',
        header: 'Padre o encargado',
        cell: (i) => (
          <>
            {i.row.original.nombre}
            <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
              {i.row.original.codigo}
            </span>
          </>
        ),
      }),
      col.accessor('telefono', { header: 'Teléfono', cell: (i) => i.getValue() || '—' }),
      col.accessor('profesion', { header: 'Profesión', cell: (i) => i.getValue() || '—' }),
      col.accessor((r) => r.hijos.map((h) => h.nombre).join(', '), {
        id: 'hijos',
        header: 'Hijos',
        enableSorting: false,
        cell: (i) =>
          i.row.original.hijos.length === 0 ? (
            <span className="texto-muted">Sin hijos matriculados</span>
          ) : (
            <ul className="cartera-hijos">
              {i.row.original.hijos.map((h) => (
                <li key={h.codigo}>
                  {h.nombre}
                  <span className="texto-muted">
                    {' '}
                    · {h.grado} {h.seccion}
                  </span>
                </li>
              ))}
            </ul>
          ),
      }),
      col.accessor((r) => etiquetaEstadoPago(r), {
        id: 'estado_pago',
        header: 'Estado de pago',
        cell: (i) => <EstadoPago deuda={i.row.original} />,
      }),
      col.accessor('monto_vencido', {
        header: 'Debe',
        cell: (i) => <MontoVencido monto={i.getValue()} />,
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      {
        id: 'estado_pago',
        label: 'Estado de pago',
        getValue: (r: CarteraPadre) => r.estado_pago,
        options: [
          { value: 'al_dia', label: 'Al día' },
          { value: 'debe', label: 'Debe 1 mes' },
          { value: 'mora', label: 'En mora' },
        ],
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando padres…</div>

  return (
    <RequirePermission permission="cartera:get">
      <div data-testid="caja-padres-page">
        <DataTable
          title="Padres"
          data={data}
          columns={columns}
          filters={filters}
          canAdd={false}
          exportFilename="padres-cartera"
          exportRows={data.map((p) => ({
            codigo: p.codigo,
            nombre: p.nombre,
            telefono: p.telefono,
            profesion: p.profesion,
            hijos: p.hijos.map((h) => `${h.nombre} (${h.grado} ${h.seccion})`).join('; '),
            estado_pago: etiquetaEstadoPago(p),
            debe: p.monto_vencido,
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="caja-padres-ctx">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="caja-padres-ctx-ficha"
            onClick={() => {
              setFicha(ctx.row.codigo)
              closeCtx()
            }}
          >
            Ver ficha
          </button>
          {ctx.row.hijos.map((h) => (
            <button
              key={h.codigo}
              type="button"
              className="ctx-menu__item"
              data-testid={`caja-padres-ctx-cobrar-${h.codigo}`}
              onClick={() => {
                void navigate({ to: '/pagos', search: { alumno: h.codigo } })
                closeCtx()
              }}
            >
              {ctx.row.hijos.length === 1 ? 'Cobrar' : `Cobrar · ${h.nombre.split(' ')[0]}`}
            </button>
          ))}
        </div>
      ) : null}

      {ficha ? <UserFichaModal code={ficha} onClose={() => setFicha(null)} /> : null}
    </RequirePermission>
  )
}
