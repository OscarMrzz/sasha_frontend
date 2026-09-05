import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { downloadCsv } from '#/helpers/export-csv'
import { userMessageFromError } from '#/lib/api'
import { listCursos, listPeriodos, listSecciones } from '#/services/catalogos'
import { listMaestros } from '#/services/personas'
import {
  createAsignacion,
  listAsignaciones,
  type Asignacion,
  type AsignacionCreate,
} from '#/services/asignacion'

export const Route = createFileRoute('/_app/asignacion')({ component: AsignacionPage })

const col = createColumnHelper<Asignacion>()

function AsignacionPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['asignaciones'], queryFn: listAsignaciones })
  const { data: maestros = [] } = useQuery({ queryKey: ['maestros'], queryFn: listMaestros })
  const { data: cursos = [] } = useQuery({ queryKey: ['cursos'], queryFn: listCursos })
  const { data: secciones = [] } = useQuery({ queryKey: ['secciones'], queryFn: listSecciones })
  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })

  const maestroMap = useMemo(() => Object.fromEntries(maestros.map((m) => [m.id, m.nombre])), [maestros])
  const cursoMap = useMemo(() => Object.fromEntries(cursos.map((c) => [c.id, c.nombre])), [cursos])
  const seccionMap = useMemo(() => Object.fromEntries(secciones.map((s) => [s.id, s.nombre])), [secciones])
  const periodoMap = useMemo(() => Object.fromEntries(periodos.map((p) => [p.id, p.nombre])), [periodos])

  const [modalOpen, setModalOpen] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Asignacion } | null>(null)
  const [form, setForm] = useState<AsignacionCreate>({
    maestro_id: '',
    curso_id: '',
    seccion_id: '',
    periodo_academico_id: '',
    status: 'ACTIVE',
  })

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const createMut = useMutation({
    mutationFn: () => createAsignacion(form),
    onSuccess: () => {
      toast.success('Asignación creada')
      qc.invalidateQueries({ queryKey: ['asignaciones'] })
      setModalOpen(false)
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

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

  if (isLoading) return <div className="empty-state">Cargando asignaciones…</div>

  return (
    <RequirePermission permission="asignacion:get">
      <h1 className="page-title">Asignación docente</h1>
      <DataTable
        data={data}
        columns={columns}
        addLabel="Nueva asignación"
        canAdd={can('asignacion:post')}
        onAdd={() => setModalOpen(true)}
        onExport={() =>
          downloadCsv(
            'asignaciones.csv',
            data.map((a) => ({
              maestro: maestroMap[a.maestro_id],
              curso: cursoMap[a.curso_id],
              seccion: seccionMap[a.seccion_id],
              periodo: periodoMap[a.periodo_academico_id],
              status: a.status,
            })),
          )
        }
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

      <Modal
        open={modalOpen}
        title="Nueva asignación"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <Can permission="asignacion:post">
              <button type="button" className="btn btn--primary" onClick={() => setConfirmSave(true)}>
                Guardar
              </button>
            </Can>
          </>
        }
      >
        <Field label="Maestro" htmlFor="asig-maestro">
          <select
            id="asig-maestro"
            className="field__select"
            data-testid="asignacion-maestro-select"
            value={form.maestro_id}
            onChange={(e) => setForm((f) => ({ ...f, maestro_id: e.target.value }))}
          >
            <option value="">Seleccionar…</option>
            {maestros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Curso">
          <select
            className="field__select"
            data-testid="asignacion-curso-select"
            value={form.curso_id}
            onChange={(e) => setForm((f) => ({ ...f, curso_id: e.target.value }))}
          >
            <option value="">Seleccionar…</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sección">
          <select
            className="field__select"
            data-testid="asignacion-seccion-select"
            value={form.seccion_id}
            onChange={(e) => setForm((f) => ({ ...f, seccion_id: e.target.value }))}
          >
            <option value="">Seleccionar…</option>
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Periodo académico">
          <select
            className="field__select"
            data-testid="asignacion-periodo-select"
            value={form.periodo_academico_id}
            onChange={(e) => setForm((f) => ({ ...f, periodo_academico_id: e.target.value }))}
          >
            <option value="">Seleccionar…</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Crear asignación"
        message="¿Registrar esta asignación docente?"
        onConfirm={() => createMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
