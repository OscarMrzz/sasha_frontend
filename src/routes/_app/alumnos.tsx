import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RequirePermission } from '#/components/gates/Can'
import { EstadoPago, MontoVencido, etiquetaEstadoPago } from '#/components/pagos/EstadoPago'
import { DataTable } from '#/components/ui/DataTable'
import { UserFichaModal } from '#/components/usuarios/UserFichaModal'
import { listCarteraAlumnos } from '#/services/pagos'
import type { CarteraAlumno } from '#/services/pagos'

export const Route = createFileRoute('/_app/alumnos')({ component: AlumnosCajaPage })

const col = createColumnHelper<CarteraAlumno>()

function Subtexto({ children }: { children: React.ReactNode }) {
  return (
    <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
      {children}
    </span>
  )
}

function AlumnosCajaPage() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useQuery({ queryKey: ['cartera-alumnos'], queryFn: listCarteraAlumnos })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: CarteraAlumno } | null>(null)
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
        header: 'Alumno',
        cell: (i) => (
          <>
            {i.row.original.nombre}
            <Subtexto>{i.row.original.codigo}</Subtexto>
          </>
        ),
      }),
      col.accessor((r) => `${r.grado} ${r.seccion}`, {
        id: 'grado',
        header: 'Grado',
      }),
      col.accessor('responsable_nombre', {
        header: 'Responsable',
        cell: (i) =>
          i.getValue() ? (
            <>
              {i.getValue()}
              <Subtexto>
                {[i.row.original.parentesco, i.row.original.responsable_telefono].filter(Boolean).join(' · ')}
              </Subtexto>
            </>
          ) : (
            <span className="texto-muted">Sin responsable</span>
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

  const grados = useMemo(
    () =>
      [...new Map(data.map((a) => [a.grado, a.grado_orden])).entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([g]) => ({ value: g, label: g })),
    [data],
  )

  const filters = useMemo(
    () => [
      {
        id: 'grado',
        label: 'Grado',
        getValue: (r: CarteraAlumno) => r.grado,
        options: grados,
      },
      {
        id: 'estado_pago',
        label: 'Estado de pago',
        getValue: (r: CarteraAlumno) => r.estado_pago,
        options: [
          { value: 'al_dia', label: 'Al día' },
          { value: 'debe', label: 'Debe 1 mes' },
          { value: 'mora', label: 'En mora' },
        ],
      },
    ],
    [grados],
  )

  if (isLoading) return <div className="empty-state">Cargando alumnos…</div>

  return (
    <RequirePermission permission="cartera:get">
      <div data-testid="caja-alumnos-page">
        <DataTable
          title="Alumnos"
          searchPlaceholder="Buscar por nombre, código o responsable…"
          data={data}
          columns={columns}
          filters={filters}
          canAdd={false}
          exportFilename="alumnos-cartera"
          exportRows={data.map((a) => ({
            codigo: a.codigo,
            alumno: a.nombre,
            grado: a.grado,
            seccion: a.seccion,
            responsable: a.responsable_nombre,
            telefono: a.responsable_telefono,
            estado_pago: etiquetaEstadoPago(a),
            meses_vencidos: a.meses_vencidos,
            debe: a.monto_vencido,
            recibos_por_revisar: a.recibos_sin_revisar,
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="caja-alumnos-ctx">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="caja-alumnos-ctx-ficha"
            onClick={() => {
              setFicha(ctx.row.codigo)
              closeCtx()
            }}
          >
            Ver ficha
          </button>
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="caja-alumnos-ctx-cobrar"
            onClick={() => {
              void navigate({ to: '/pagos', search: { alumno: ctx.row.codigo } })
              closeCtx()
            }}
          >
            Cobrar
          </button>
        </div>
      ) : null}

      {ficha ? <UserFichaModal code={ficha} onClose={() => setFicha(null)} /> : null}
    </RequirePermission>
  )
}
