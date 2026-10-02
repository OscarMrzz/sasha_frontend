import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FichaFormModal } from '#/components/disciplina/FichaFormModal'
import { FichasAlumnoModal } from '#/components/disciplina/FichasAlumnoModal'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { fechaLarga, listAlumnosConFichas } from '#/services/disciplina'
import type { AlumnoConFichas } from '#/services/disciplina'

export const Route = createFileRoute('/_app/disciplina/')({ component: DisciplinaPage })

const col = createColumnHelper<AlumnoConFichas>()

function Subtexto({ children }: { children: React.ReactNode }) {
  return (
    <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
      {children}
    </span>
  )
}

const estado = (r: AlumnoConFichas) => (r.sancionado_hasta ? 'Sancionado' : 'Sin sanción activa')

function DisciplinaPage() {
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['disciplina-alumnos'], queryFn: listAlumnosConFichas })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: AlumnoConFichas } | null>(null)
  const [ver, setVer] = useState<AlumnoConFichas | null>(null)
  const [nueva, setNueva] = useState(false)

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
      col.accessor((r) => `${String(r.grado_orden).padStart(2, '0')} ${r.seccion}`, {
        id: 'grado',
        header: 'Grado',
        cell: (i) =>
          i.row.original.grado ? (
            <>
              {i.row.original.grado} · sec {i.row.original.seccion}
              <Subtexto>{i.row.original.modalidad}</Subtexto>
            </>
          ) : (
            <span className="texto-muted">—</span>
          ),
      }),
      col.accessor('total_parcial', {
        header: 'Fichas',
        cell: (i) => (
          <>
            <strong>{i.getValue()}</strong> en el parcial
            <Subtexto>{i.row.original.total_periodo} en el periodo</Subtexto>
          </>
        ),
      }),
      col.accessor('ultima_fecha', {
        header: 'Última ficha',
        cell: (i) => (
          <>
            {i.row.original.ultimo_tipo}
            <Subtexto>{fechaLarga(i.getValue())}</Subtexto>
          </>
        ),
      }),
      col.accessor((r) => r.sancionado_hasta || '', {
        id: 'estado',
        header: 'Estado',
        cell: (i) =>
          i.getValue() ? (
            <span className="sancion-badge sancion-badge--activa">Sancionado hasta {fechaLarga(i.getValue())}</span>
          ) : (
            <span className="sancion-badge">Sin sanción activa</span>
          ),
      }),
    ],
    [],
  )

  const grados = useMemo(
    () =>
      [...new Map(data.filter((a) => a.grado).map((a) => [a.grado, a.grado_orden])).entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([g]) => ({ value: g, label: g })),
    [data],
  )

  const filters = useMemo(
    () => [
      { id: 'grado', label: 'Grado', getValue: (r: AlumnoConFichas) => r.grado, options: grados },
      { id: 'seccion', label: 'Sección', getValue: (r: AlumnoConFichas) => r.seccion },
      { id: 'modalidad', label: 'Modalidad', getValue: (r: AlumnoConFichas) => r.modalidad },
      {
        id: 'tipo',
        label: 'Tipo',
        getValue: (r: AlumnoConFichas) => r.ultimo_tipo,
        getOptionValues: (r: AlumnoConFichas) => r.tipos,
        matches: (r: AlumnoConFichas, sel: string) => r.tipos.includes(sel),
      },
      { id: 'estado', label: 'Estado', getValue: estado },
    ],
    [grados],
  )

  if (isLoading) return <div className="empty-state">Cargando fichas…</div>

  return (
    <RequirePermission permission="fichas:get">
      <div data-testid="disciplina-page">
        <DataTable
          title="Fichas disciplinarias"
          data={data}
          columns={columns}
          filters={filters}
          addLabel="Nueva ficha"
          canAdd={can('fichas:post')}
          onAdd={() => setNueva(true)}
          exportFilename="fichas-disciplinarias"
          exportRows={data.map((a) => ({
            codigo: a.codigo,
            alumno: a.nombre,
            grado: a.grado,
            seccion: a.seccion,
            modalidad: a.modalidad,
            fichas_parcial: a.total_parcial,
            fichas_periodo: a.total_periodo,
            ultima_ficha: a.ultimo_tipo,
            fecha_ultima: fechaLarga(a.ultima_fecha),
            estado: a.sancionado_hasta ? `Sancionado hasta ${fechaLarga(a.sancionado_hasta)}` : 'Sin sanción activa',
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          onRowDoubleClick={(row) => setVer(row)}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="disciplina-ctx">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="disciplina-ctx-ver"
            onClick={() => {
              setVer(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
        </div>
      ) : null}

      {ver ? <FichasAlumnoModal alumno={ver} onClose={() => setVer(null)} /> : null}
      {nueva ? <FichaFormModal onClose={() => setNueva(false)} /> : null}
    </RequirePermission>
  )
}
