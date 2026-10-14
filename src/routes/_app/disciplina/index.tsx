import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FichaEditarModal } from '#/components/disciplina/FichaEditarModal'
import { FichaFormModal } from '#/components/disciplina/FichaFormModal'
import { FichaVerModal } from '#/components/disciplina/FichaVerModal'
import { Can, RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { userMessageFromError } from '#/lib/api'
import { eliminarFicha, fechaLarga, hoyISO, listFichas } from '#/services/disciplina'
import type { FichaFila } from '#/services/disciplina'
import { useAccionPalette } from '#/hooks/use-accion-palette'
import { useSession } from '#/hooks/use-session'

export const Route = createFileRoute('/_app/disciplina/')({ component: DisciplinaPage })

const col = createColumnHelper<FichaFila>()

function Subtexto({ children }: { children: React.ReactNode }) {
  return (
    <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
      {children}
    </span>
  )
}

const sancionActiva = (r: FichaFila) => Boolean(r.fecha_fin) && r.fecha_fin >= hoyISO()

function DisciplinaPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { session } = useSession()
  const { data = [], isLoading } = useQuery({ queryKey: ['disciplina-fichas-lista'], queryFn: listFichas })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: FichaFila } | null>(null)
  const [ver, setVer] = useState<FichaFila | null>(null)
  const [editar, setEditar] = useState<FichaFila | null>(null)
  const [eliminar, setEliminar] = useState<FichaFila | null>(null)
  const [nueva, setNueva] = useState(false)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  useAccionPalette('nuevo-ficha', () => setNueva(true))

  const eliminarMut = useMutation({
    mutationFn: (id: string) => eliminarFicha(id),
    onSuccess: () => {
      toast.success('Ficha eliminada')
      qc.invalidateQueries({ queryKey: ['disciplina-fichas-lista'] })
      qc.invalidateQueries({ queryKey: ['disciplina-fichas'] })
      qc.invalidateQueries({ queryKey: ['disciplina-alumnos'] })
      setEliminar(null)
    },
    onError: (e) => {
      setEliminar(null)
      toast.error(userMessageFromError(e))
    },
  })

  const columns = useMemo(
    () => [
      col.accessor((r) => r.fecha, {
        id: 'fecha',
        header: 'Fecha',
        cell: (i) => (
          <>
            {fechaLarga(i.getValue())}
            {i.row.original.parcial ? <Subtexto>{i.row.original.parcial}</Subtexto> : null}
          </>
        ),
      }),
      col.accessor((r) => `${r.alumno_nombre} ${r.alumno_codigo}`, {
        id: 'alumno',
        header: 'Alumno',
        cell: (i) => (
          <>
            {i.row.original.alumno_nombre}
            <Subtexto>{i.row.original.alumno_codigo}</Subtexto>
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
      col.accessor('titulo', { header: 'Tipo' }),
      col.accessor((r) => r.nivel, {
        id: 'nivel',
        header: 'Nivel',
        cell: (i) => <span className="nivel-badge">Nivel {i.getValue()}</span>,
      }),
      col.accessor('castigo', {
        header: 'Castigo',
        cell: (i) => (
          <>
            {i.getValue()}
            {i.row.original.dias ? (
              <Subtexto>
                {i.row.original.dias} día{i.row.original.dias === 1 ? '' : 's'}
              </Subtexto>
            ) : null}
          </>
        ),
      }),
      col.accessor((r) => (sancionActiva(r) ? 'activa' : 'sin'), {
        id: 'estado',
        header: 'Estado',
        cell: (i) =>
          i.row.original.fecha_fin && sancionActiva(i.row.original) ? (
            <span className="sancion-badge sancion-badge--activa">
              Sancionado hasta {fechaLarga(i.row.original.fecha_fin)}
            </span>
          ) : (
            <span className="sancion-badge">Sin sanción activa</span>
          ),
      }),
    ],
    [],
  )

  const grados = useMemo(
    () =>
      [...new Map(data.filter((f) => f.grado).map((f) => [f.grado, f.grado_orden])).entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([g]) => ({ value: g, label: g })),
    [data],
  )

  const filters = useMemo(
    () => [
      { id: 'grado', label: 'Grado', getValue: (r: FichaFila) => r.grado, options: grados },
      { id: 'seccion', label: 'Sección', getValue: (r: FichaFila) => r.seccion },
      { id: 'modalidad', label: 'Modalidad', getValue: (r: FichaFila) => r.modalidad },
      { id: 'tipo', label: 'Tipo', getValue: (r: FichaFila) => r.titulo },
      {
        id: 'nivel',
        label: 'Nivel',
        getValue: (r: FichaFila) => String(r.nivel),
        getLabel: (r: FichaFila) => `Nivel ${r.nivel}`,
      },
      {
        id: 'estado',
        label: 'Estado',
        getValue: (r: FichaFila) => (sancionActiva(r) ? 'activa' : 'sin'),
        getLabel: (r: FichaFila) => (sancionActiva(r) ? 'Con sanción activa' : 'Sin sanción activa'),
      },
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
          exportRows={data.map((f) => ({
            fecha: fechaLarga(f.fecha),
            parcial: f.parcial,
            alumno: f.alumno_nombre,
            codigo: f.alumno_codigo,
            grado: f.grado,
            seccion: f.seccion,
            modalidad: f.modalidad,
            tipo: f.titulo,
            nivel: f.nivel,
            castigo: f.castigo,
            dias: f.dias ?? '',
            fecha_inicio: f.fecha_inicio ? fechaLarga(f.fecha_inicio) : '',
            fecha_fin: f.fecha_fin ? fechaLarga(f.fecha_fin) : '',
            observaciones: f.observaciones,
            registrado_por: f.registrado_por,
            estado: f.fecha_fin && sancionActiva(f) ? `Sancionado hasta ${fechaLarga(f.fecha_fin)}` : 'Sin sanción activa',
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
          <Can permission="fichas:put">
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="disciplina-ctx-editar"
              onClick={() => {
                setEditar(ctx.row)
                closeCtx()
              }}
            >
              Editar
            </button>
          </Can>
          {can('fichas:delete') && ctx.row.registrado_por_codigo === session?.code ? (
            <button
              type="button"
              className="ctx-menu__item ctx-menu__item--danger"
              data-testid="disciplina-ctx-eliminar"
              onClick={() => {
                setEliminar(ctx.row)
                closeCtx()
              }}
            >
              Eliminar
            </button>
          ) : null}
        </div>
      ) : null}

      {ver ? <FichaVerModal ficha={ver} onClose={() => setVer(null)} /> : null}
      {editar ? <FichaEditarModal ficha={editar} onClose={() => setEditar(null)} /> : null}
      {nueva ? <FichaFormModal onClose={() => setNueva(false)} /> : null}

      <ConfirmDialog
        open={Boolean(eliminar)}
        title="Eliminar ficha"
        message={
          eliminar
            ? `¿Eliminar la ficha «${eliminar.titulo}» de ${eliminar.alumno_nombre} del ${fechaLarga(eliminar.fecha)}? Esta acción no se puede deshacer.`
            : ''
        }
        danger
        confirmLabel="Eliminar"
        testId="disciplina-eliminar-confirm"
        onConfirm={() => eliminar && eliminarMut.mutate(eliminar.id)}
        onCancel={() => setEliminar(null)}
      />
    </RequirePermission>
  )
}
