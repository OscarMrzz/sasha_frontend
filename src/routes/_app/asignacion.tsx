import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AsignacionFormModal } from '#/components/asignacion/AsignacionFormModal'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { labelPeriodo } from '#/helpers/periodos'
import { listCursos, listPeriodos, listSecciones } from '#/services/catalogos'
import { listMaestros } from '#/services/personas'
import { listAsignaciones, type Asignacion } from '#/services/asignacion'

export const Route = createFileRoute('/_app/asignacion')({ component: AsignacionPage })

const col = createColumnHelper<Asignacion>()

function AsignacionPage() {
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['asignaciones'], queryFn: listAsignaciones })
  const { data: maestros = [] } = useQuery({ queryKey: ['maestros'], queryFn: listMaestros })
  const { data: cursos = [] } = useQuery({ queryKey: ['cursos'], queryFn: listCursos })
  const { data: secciones = [] } = useQuery({ queryKey: ['secciones'], queryFn: listSecciones })
  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })

  const maestroMap = useMemo(() => Object.fromEntries(maestros.map((m) => [m.id, m.nombre])), [maestros])
  const cursoMap = useMemo(() => Object.fromEntries(cursos.map((c) => [c.id, c.nombre])), [cursos])
  const seccionMap = useMemo(() => Object.fromEntries(secciones.map((s) => [s.id, s.nombre])), [secciones])
  const periodoMap = useMemo(
    () => Object.fromEntries(periodos.map((p) => [p.id, labelPeriodo(p)])),
    [periodos],
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Asignacion } | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const columns = useMemo(
    () => [
      col.accessor('maestro_id', { header: 'Maestro', cell: (i) => maestroMap[i.getValue()] ?? i.getValue() }),
      col.accessor('curso_id', { header: 'Curso', cell: (i) => cursoMap[i.getValue()] ?? i.getValue() }),
      col.accessor('seccion_id', { header: 'Sección', cell: (i) => seccionMap[i.getValue()] ?? i.getValue() }),
      col.accessor('periodo_academico_id', {
        header: 'Periodo',
        cell: (i) => periodoMap[i.getValue()] ?? i.getValue(),
      }),
      col.accessor('status', { header: 'Estado', cell: (i) => <span className="badge">{i.getValue()}</span> }),
    ],
    [maestroMap, cursoMap, seccionMap, periodoMap],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'maestro',
        label: 'Maestro',
        getValue: (r: Asignacion) => r.maestro_id,
        getLabel: (r: Asignacion) => maestroMap[r.maestro_id] ?? r.maestro_id,
      },
      {
        id: 'curso',
        label: 'Curso',
        getValue: (r: Asignacion) => r.curso_id,
        getLabel: (r: Asignacion) => cursoMap[r.curso_id] ?? r.curso_id,
      },
      {
        id: 'seccion',
        label: 'Sección',
        getValue: (r: Asignacion) => r.seccion_id,
        getLabel: (r: Asignacion) => seccionMap[r.seccion_id] ?? r.seccion_id,
      },
      { id: 'status', label: 'Estado', getValue: (r: Asignacion) => r.status },
    ],
    [maestroMap, cursoMap, seccionMap],
  )

  if (isLoading) return <div className="empty-state">Cargando asignaciones…</div>

  return (
    <RequirePermission permission="asignacion:get">
      <DataTable
        title="Asignación docente"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Nueva asignación"
        canAdd={can('asignacion:post')}
        onAdd={() => setModalOpen(true)}
        exportFilename="asignaciones"
        exportRows={data.map((a) => ({
          maestro: maestroMap[a.maestro_id],
          curso: cursoMap[a.curso_id],
          seccion: seccionMap[a.seccion_id],
          periodo: periodoMap[a.periodo_academico_id],
          status: a.status,
        }))}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button
            type="button"
            className="ctx-menu__item"
            onClick={() => {
              toast.info(`Asignación ${ctx.row.id}`)
              closeCtx()
            }}
          >
            Ver
          </button>
        </div>
      ) : null}

      <AsignacionFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </RequirePermission>
  )
}
