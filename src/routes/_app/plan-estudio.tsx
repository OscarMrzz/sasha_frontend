import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { labelPeriodo } from '#/helpers/periodos'
import { userMessageFromError } from '#/lib/api'
import { listAsignaciones } from '#/services/asignacion'
import { listCursos, listGrados, listModalidades, listPeriodos } from '#/services/catalogos'
import {
  activarPlan,
  addAuditoria,
  createPlan,
  downloadPlanPdf,
  getPlan,
  listPlanes,
  resolverAuditoria,
  setAprobacion,
  updatePlan,
  type Plan,
  type PlanComentario,
  type PlanCreate,
  type PlanItem,
} from '#/services/planestudio'

export const Route = createFileRoute('/_app/plan-estudio')({ component: PlanEstudioPage })

const col = createColumnHelper<Plan>()

const REVIEWER_ROLES = new Set(['admin', 'director', 'consejeria'])

const emptyItem = {
  parcial_id: '',
  titulo: '',
  fecha_inicio: '',
  fecha_fin: '',
  orden: 1,
}

function labelAprobacion(v: string) {
  if (v === 'aprobado') return 'Aprobado'
  if (v === 'denegado') return 'Denegado'
  return 'Pendiente'
}

function labelAuditoria(v: string) {
  if (v === 'en_progreso') return 'En progreso'
  if (v === 'finalizado') return 'Finalizado'
  return 'Sin revisar'
}

function PlanEstudioPage() {
  const { roles, can } = useCan()
  const isReviewer = roles.some((r) => REVIEWER_ROLES.has(r))
  const isMaestro = roles.includes('maestro') && !isReviewer

  if (isReviewer) return <ReviewerView canPut={can('planestudio:put')} />
  if (isMaestro) return <MaestroView canPost={can('planestudio:post')} canPut={can('planestudio:put')} />
  return (
    <RequirePermission permission="planestudio:get">
      <ReviewerView canPut={false} />
    </RequirePermission>
  )
}

function ReviewerView({ canPut }: { canPut: boolean }) {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({ queryKey: ['planes'], queryFn: () => listPlanes() })
  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })

  const [ctx, setCtx] = useState<{ x: number; y: number; row: Plan } | null>(null)
  const [verPlan, setVerPlan] = useState<Plan | null>(null)
  const [auditPlan, setAuditPlan] = useState<Plan | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const openVer = async (row: Plan) => {
    try {
      const p = await getPlan(row.id)
      setVerPlan(p)
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const openAudit = async (row: Plan) => {
    try {
      const p = await getPlan(row.id)
      setAuditPlan(p)
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const columns = useMemo(
    () => [
      col.accessor('curso_nombre', { header: 'Curso', cell: (i) => i.getValue() || '—' }),
      col.accessor('maestro_nombre', { header: 'Maestro', cell: (i) => i.getValue() || '—' }),
      col.accessor('grado_nombre', { header: 'Grado', cell: (i) => i.getValue() || '—' }),
      col.accessor('modalidad_nombre', { header: 'Modalidad', cell: (i) => i.getValue() || '—' }),
      col.accessor('estado_aprobacion', {
        header: 'Aprobación',
        cell: (i) => <span className="badge">{labelAprobacion(i.getValue())}</span>,
      }),
      col.accessor('estado_auditoria_maestro', {
        header: 'Auditoría maestro',
        cell: (i) => <span className="badge">{labelAuditoria(i.getValue())}</span>,
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'periodo',
        label: 'Periodo',
        getValue: (r: Plan) => r.periodo_academico_id,
        getLabel: (r: Plan) => {
          const p = periodos.find((x) => x.id === r.periodo_academico_id)
          return p ? labelPeriodo(p) : r.periodo_academico_id
        },
        options: periodos.map((p) => ({ value: p.id, label: labelPeriodo(p) })),
      },
      {
        id: 'curso',
        label: 'Curso',
        getValue: (r: Plan) => r.curso_id || r.curso_nombre || '',
        getLabel: (r: Plan) => r.curso_nombre || '',
      },
      {
        id: 'maestro',
        label: 'Maestro',
        getValue: (r: Plan) => r.maestro_id || r.maestro_nombre || '',
        getLabel: (r: Plan) => r.maestro_nombre || '',
      },
      {
        id: 'modalidad',
        label: 'Modalidad',
        getValue: (r: Plan) => r.modalidad_id || r.modalidad_nombre || '',
        getLabel: (r: Plan) => r.modalidad_nombre || '',
      },
      {
        id: 'grado',
        label: 'Grado',
        getValue: (r: Plan) => r.grado_id || r.grado_nombre || '',
        getLabel: (r: Plan) => r.grado_nombre || '',
      },
    ],
    [periodos],
  )

  if (isLoading) return <div className="empty-state">Cargando planes…</div>

  return (
    <RequirePermission permission="planestudio:get">
      <DataTable
        title="Plan de estudio"
        data={data}
        columns={columns}
        filters={tableFilters}
        searchPlaceholder="Buscar plan…"
        canAdd={false}
        exportFilename="planes-estudio"
        exportRows={data.map((p) => ({
          curso: p.curso_nombre,
          maestro: p.maestro_nombre,
          grado: p.grado_nombre,
          modalidad: p.modalidad_nombre,
          aprobacion: p.estado_aprobacion,
          auditoria: p.estado_auditoria_maestro,
        }))}
        onRowClick={(row) => void openVer(row)}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="plan-ctx-menu">
          <button
            type="button"
            className="ctx-menu__item"
            onClick={() => {
              void openVer(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
          {canPut ? (
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="plan-auditar"
              onClick={() => {
                void openAudit(ctx.row)
                closeCtx()
              }}
            >
              Auditar
            </button>
          ) : null}
        </div>
      ) : null}

      {verPlan ? (
        <VerPlanModal
          plan={verPlan}
          onClose={() => setVerPlan(null)}
        />
      ) : null}

      {auditPlan ? (
        <AuditarModal
          plan={auditPlan}
          onClose={() => {
            setAuditPlan(null)
            void qc.invalidateQueries({ queryKey: ['planes'] })
          }}
          onRefresh={async () => {
            const p = await getPlan(auditPlan.id)
            setAuditPlan(p)
          }}
        />
      ) : null}
    </RequirePermission>
  )
}

function MaestroView({ canPost, canPut }: { canPost: boolean; canPut: boolean }) {
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({ queryKey: ['planes'], queryFn: () => listPlanes() })
  const { data: asignaciones = [] } = useQuery({ queryKey: ['asignaciones'], queryFn: listAsignaciones })
  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })
  const { data: cursos = [] } = useQuery({ queryKey: ['cursos'], queryFn: listCursos })
  const { data: grados = [] } = useQuery({ queryKey: ['grados'], queryFn: listGrados })
  const { data: modalidades = [] } = useQuery({ queryKey: ['modalidades'], queryFn: listModalidades })

  const [ctx, setCtx] = useState<{ x: number; y: number; row: Plan } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [verPlan, setVerPlan] = useState<Plan | null>(null)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [auditPrompt, setAuditPrompt] = useState<Plan | null>(null)
  const [resolverPlan, setResolverPlan] = useState<Plan | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const cursoMap = useMemo(() => Object.fromEntries(cursos.map((c) => [c.id, c.nombre])), [cursos])
  const gradoMap = useMemo(() => Object.fromEntries(grados.map((g) => [g.id, g.nombre])), [grados])
  const modalidadMap = useMemo(
    () => Object.fromEntries(modalidades.map((m) => [m.id, m.nombre])),
    [modalidades],
  )

  const openVer = async (row: Plan) => {
    try {
      setVerPlan(await getPlan(row.id))
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const openEdit = async (row: Plan) => {
    try {
      setEditPlan(await getPlan(row.id))
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const openAudit = async (row: Plan) => {
    try {
      setAuditPrompt(await getPlan(row.id))
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const activarMut = useMutation({
    mutationFn: (id: string) => activarPlan(id),
    onSuccess: () => {
      toast.success('Plan activado')
      void qc.invalidateQueries({ queryKey: ['planes'] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('curso_nombre', { header: 'Curso', cell: (i) => i.getValue() || '—' }),
      col.accessor('grado_nombre', { header: 'Grado', cell: (i) => i.getValue() || '—' }),
      col.accessor('modalidad_nombre', { header: 'Modalidad', cell: (i) => i.getValue() || '—' }),
      col.accessor('estado_aprobacion', {
        header: 'Aprobación',
        cell: (i) => <span className="badge">{labelAprobacion(i.getValue())}</span>,
      }),
      col.accessor('es_activo', {
        header: 'Activo',
        cell: (i) => (i.getValue() ? 'Sí' : 'No'),
      }),
      col.accessor('estado_auditoria_maestro', {
        header: 'Auditoría',
        cell: (i) => <span className="badge">{labelAuditoria(i.getValue())}</span>,
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'periodo',
        label: 'Periodo',
        getValue: (r: Plan) => r.periodo_academico_id,
        options: periodos.map((p) => ({ value: p.id, label: labelPeriodo(p) })),
      },
      {
        id: 'curso',
        label: 'Curso',
        getValue: (r: Plan) => r.curso_id || '',
        getLabel: (r: Plan) => r.curso_nombre || cursoMap[r.curso_id || ''] || '',
      },
      {
        id: 'grado',
        label: 'Grado',
        getValue: (r: Plan) => r.grado_id || '',
        getLabel: (r: Plan) => r.grado_nombre || gradoMap[r.grado_id || ''] || '',
      },
      {
        id: 'modalidad',
        label: 'Modalidad',
        getValue: (r: Plan) => r.modalidad_id || '',
        getLabel: (r: Plan) => r.modalidad_nombre || modalidadMap[r.modalidad_id || ''] || '',
      },
    ],
    [periodos, cursoMap, gradoMap, modalidadMap],
  )

  if (isLoading) return <div className="empty-state">Cargando planes…</div>

  return (
    <RequirePermission permission="planestudio:get">
      <DataTable
        title="Mis planes de estudio"
        data={data}
        columns={columns}
        filters={tableFilters}
        searchPlaceholder="Buscar plan…"
        addLabel="Crear plan"
        canAdd={canPost}
        onAdd={() => setCreateOpen(true)}
        exportFilename="mis-planes"
        exportRows={data.map((p) => ({
          curso: p.curso_nombre,
          grado: p.grado_nombre,
          modalidad: p.modalidad_nombre,
          aprobacion: p.estado_aprobacion,
          activo: p.es_activo ? 'sí' : 'no',
          auditoria: p.estado_auditoria_maestro,
        }))}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="plan-ctx-menu">
          <button type="button" className="ctx-menu__item" onClick={() => { void openVer(ctx.row); closeCtx() }}>
            Ver
          </button>
          {canPut ? (
            <button type="button" className="ctx-menu__item" onClick={() => { void openEdit(ctx.row); closeCtx() }}>
              Editar
            </button>
          ) : null}
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="plan-auditoria"
            onClick={() => {
              void openAudit(ctx.row)
              closeCtx()
            }}
          >
            Auditoría
          </button>
          {canPut && !ctx.row.es_activo ? (
            <button
              type="button"
              className="ctx-menu__item"
              onClick={() => {
                activarMut.mutate(ctx.row.id)
                closeCtx()
              }}
            >
              Activar
            </button>
          ) : null}
        </div>
      ) : null}

      {createOpen ? (
        <CrearPlanModal
          asignaciones={asignaciones}
          periodos={periodos}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            void qc.invalidateQueries({ queryKey: ['planes'] })
          }}
        />
      ) : null}

      {verPlan ? <VerPlanModal plan={verPlan} onClose={() => setVerPlan(null)} /> : null}

      {editPlan ? (
        <EditarPlanModal
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onSaved={() => {
            setEditPlan(null)
            void qc.invalidateQueries({ queryKey: ['planes'] })
          }}
        />
      ) : null}

      {auditPrompt ? (
        <Modal
          open
          title="Auditoría"
          onClose={() => setAuditPrompt(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setAuditPrompt(null)}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setVerPlan(auditPrompt)
                  setAuditPrompt(null)
                }}
              >
                Ver
              </button>
              <button
                type="button"
                className="btn btn--primary"
                data-testid="plan-resolver"
                onClick={() => {
                  setResolverPlan(auditPrompt)
                  setAuditPrompt(null)
                }}
              >
                Resolver
              </button>
            </>
          }
        >
          <p data-testid="plan-tareas-count">
            Tienes <strong>{auditPrompt.tareas_abiertas ?? auditPrompt.comentarios?.filter((c) => !c.resuelto).length ?? 0}</strong>{' '}
            tarea(s) por resolver
            {(auditPrompt.tareas_total ?? auditPrompt.comentarios?.length ?? 0) > 0
              ? ` de ${auditPrompt.tareas_total ?? auditPrompt.comentarios?.length}`
              : ''}
            .
          </p>
        </Modal>
      ) : null}

      {resolverPlan ? (
        <ResolverModal
          plan={resolverPlan}
          onClose={() => {
            setResolverPlan(null)
            void qc.invalidateQueries({ queryKey: ['planes'] })
          }}
        />
      ) : null}
    </RequirePermission>
  )
}

function VerPlanModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  return (
    <Modal
      open
      title="Ver plan"
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="plan-download-pdf"
            onClick={() => {
              void downloadPlanPdf(plan.id).catch((e) => toast.error(userMessageFromError(e)))
            }}
          >
            Descargar PDF
          </button>
        </>
      }
    >
      <p className="texto-muted" style={{ marginBottom: '1rem' }}>
        {plan.curso_nombre} · {plan.maestro_nombre} · {plan.grado_nombre} · {plan.modalidad_nombre}
        <br />
        Aprobación: {labelAprobacion(plan.estado_aprobacion)} · Auditoría: {labelAuditoria(plan.estado_auditoria_maestro)}
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Título</th>
            <th>Tipo</th>
            <th>Fechas</th>
            <th>Cumplimiento</th>
          </tr>
        </thead>
        <tbody>
          {(plan.items ?? []).map((it, idx) => (
            <tr key={it.id}>
              <td>{idx + 1}</td>
              <td>{it.titulo}</td>
              <td>{it.tipo_item}</td>
              <td>
                {it.fecha_inicio?.slice(0, 10)} — {it.fecha_fin?.slice(0, 10)}
              </td>
              <td>
                {it.estado_cumplimiento} ({it.porcentaje_avance}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(plan.comentarios?.length ?? 0) > 0 ? (
        <div style={{ marginTop: '1.25rem' }}>
          <h3>Comentarios de auditoría</h3>
          <ul>
            {plan.comentarios!.map((c) => (
              <li key={c.id}>
                <strong>{c.item_titulo || c.plan_estudio_item_id}:</strong> {c.texto}{' '}
                {c.resuelto ? '(resuelto)' : '(pendiente)'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Modal>
  )
}

function AuditarModal({
  plan,
  onClose,
  onRefresh,
}: {
  plan: Plan
  onClose: () => void
  onRefresh: () => Promise<void>
}) {
  const [comentarioItem, setComentarioItem] = useState<PlanItem | null>(null)
  const [texto, setTexto] = useState('')
  const [aprobacion, setAprobacion] = useState(plan.estado_aprobacion)

  const addMut = useMutation({
    mutationFn: () => addAuditoria(plan.id, comentarioItem!.id, texto),
    onSuccess: async () => {
      toast.success('Comentario agregado')
      setTexto('')
      setComentarioItem(null)
      await onRefresh()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const aprMut = useMutation({
    mutationFn: () => setAprobacion(plan.id, aprobacion),
    onSuccess: async () => {
      toast.success('Aprobación actualizada')
      await onRefresh()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  return (
    <Modal
      open
      title="Auditar plan"
      xl
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="plan-guardar-aprobacion"
            onClick={() => aprMut.mutate()}
            disabled={aprMut.isPending}
          >
            Guardar aprobación
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: '1rem' }}>
        <Field label="Aprobación">
          <select
            className="field__input"
            value={aprobacion}
            onChange={(e) => setAprobacion(e.target.value)}
            data-testid="plan-aprobacion-select"
          >
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="denegado">Denegado</option>
          </select>
        </Field>

        <h3>Ítems del plan</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Fechas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(plan.items ?? []).map((it, idx) => (
              <tr key={it.id}>
                <td>{idx + 1}</td>
                <td>{it.titulo}</td>
                <td>
                  {it.fecha_inicio?.slice(0, 10)} — {it.fecha_fin?.slice(0, 10)}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    title="Comentar"
                    data-testid={`plan-comment-${it.id}`}
                    onClick={() => setComentarioItem(it)}
                  >
                    <MessageSquare size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Tareas / comentarios</h3>
        {(plan.comentarios?.length ?? 0) === 0 ? (
          <p className="texto-muted">Sin comentarios aún.</p>
        ) : (
          <ul data-testid="plan-tareas-list">
            {plan.comentarios!.map((c: PlanComentario) => (
              <li key={c.id}>
                <strong>{c.item_titulo || 'Ítem'}:</strong> {c.texto}{' '}
                <span className="badge">{c.resuelto ? 'Resuelto' : 'Pendiente'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {comentarioItem ? (
        <Modal
          open
          title={`Comentario · ${comentarioItem.titulo}`}
          onClose={() => setComentarioItem(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setComentarioItem(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!texto.trim() || addMut.isPending}
                onClick={() => addMut.mutate()}
              >
                Guardar comentario
              </button>
            </>
          }
        >
          <Field label="Indicación de cambio">
            <textarea
              className="field__input"
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              data-testid="plan-comentario-texto"
            />
          </Field>
        </Modal>
      ) : null}
    </Modal>
  )
}

function CrearPlanModal({
  asignaciones,
  periodos,
  onClose,
  onCreated,
}: {
  asignaciones: { id: string; curso_id: string; seccion_id: string; periodo_academico_id: string }[]
  periodos: { id: string; nombre: string; anio_lectivo: number; status: string }[]
  onClose: () => void
  onCreated: () => void
}) {
  const { data: cursos = [] } = useQuery({ queryKey: ['cursos'], queryFn: listCursos })
  const cursoMap = useMemo(() => Object.fromEntries(cursos.map((c) => [c.id, c.nombre])), [cursos])
  const [form, setForm] = useState<PlanCreate>({
    asignacion_docente_id: '',
    periodo_academico_id: '',
    items: [{ ...emptyItem }],
  })
  const [confirm, setConfirm] = useState(false)

  const mut = useMutation({
    mutationFn: () => createPlan(form),
    onSuccess: () => {
      toast.success('Plan creado')
      onCreated()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const asigOpts = asignaciones.map((a) => ({
    value: a.id,
    label: `${cursoMap[a.curso_id] ?? a.curso_id} · ${a.id.slice(0, 8)}`,
  }))

  return (
    <>
      <Modal
        open
        title="Crear plan"
        xl
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="plan-create-submit"
              onClick={() => setConfirm(true)}
            >
              Crear
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <Field label="Asignación">
            <Combobox
              options={asigOpts}
              value={form.asignacion_docente_id}
              onChange={(v) => {
                const a = asignaciones.find((x) => x.id === v)
                setForm((f) => ({
                  ...f,
                  asignacion_docente_id: v,
                  periodo_academico_id: a?.periodo_academico_id || f.periodo_academico_id,
                }))
              }}
              placeholder="Elegir asignación"
            />
          </Field>
          <Field label="Periodo">
            <select
              className="field__input"
              value={form.periodo_academico_id}
              onChange={(e) => setForm((f) => ({ ...f, periodo_academico_id: e.target.value }))}
            >
              <option value="">—</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {labelPeriodo(p)}
                </option>
              ))}
            </select>
          </Field>
          <h3>Ítems</h3>
          {form.items.map((it, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
              <input
                className="field__input"
                placeholder="Título"
                value={it.titulo}
                onChange={(e) => {
                  const items = [...form.items]
                  items[idx] = { ...items[idx], titulo: e.target.value, orden: idx + 1 }
                  setForm((f) => ({ ...f, items }))
                }}
              />
              <input
                className="field__input"
                type="date"
                value={it.fecha_inicio}
                onChange={(e) => {
                  const items = [...form.items]
                  items[idx] = { ...items[idx], fecha_inicio: e.target.value }
                  setForm((f) => ({ ...f, items }))
                }}
              />
              <input
                className="field__input"
                type="date"
                value={it.fecha_fin}
                onChange={(e) => {
                  const items = [...form.items]
                  items[idx] = { ...items[idx], fecha_fin: e.target.value }
                  setForm((f) => ({ ...f, items }))
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              setForm((f) => ({
                ...f,
                items: [...f.items, { ...emptyItem, orden: f.items.length + 1 }],
              }))
            }
          >
            + Ítem
          </button>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirm}
        title="Crear plan"
        message="¿Crear este plan de estudio?"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          mut.mutate()
        }}
      />
    </>
  )
}

function EditarPlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: Plan
  onClose: () => void
  onSaved: () => void
}) {
  const [items, setItems] = useState(plan.items ?? [])
  const mut = useMutation({
    mutationFn: () =>
      updatePlan(
        plan.id,
        items.map((it) => ({
          id: it.id,
          titulo: it.titulo,
          descripcion: it.descripcion,
          tipo_item: it.tipo_item,
          fecha_inicio: it.fecha_inicio.slice(0, 10),
          fecha_fin: it.fecha_fin.slice(0, 10),
          orden: it.orden ?? 0,
          estado_cumplimiento: it.estado_cumplimiento,
          porcentaje_avance: it.porcentaje_avance,
        })),
      ),
    onSuccess: () => {
      toast.success('Plan actualizado')
      onSaved()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  return (
    <Modal
      open
      title="Editar plan"
      xl
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={() => mut.mutate()} disabled={mut.isPending}>
            Guardar
          </button>
        </>
      }
    >
      {items.map((it, idx) => (
        <div key={it.id} style={{ marginBottom: '0.75rem', display: 'grid', gap: '0.35rem' }}>
          <Field label={`Ítem ${idx + 1}`}>
            <input
              className="field__input"
              value={it.titulo}
              onChange={(e) => {
                const next = [...items]
                next[idx] = { ...next[idx], titulo: e.target.value }
                setItems(next)
              }}
            />
          </Field>
          <textarea
            className="field__input"
            rows={2}
            value={it.descripcion ?? ''}
            onChange={(e) => {
              const next = [...items]
              next[idx] = { ...next[idx], descripcion: e.target.value }
              setItems(next)
            }}
          />
        </div>
      ))}
    </Modal>
  )
}

function ResolverModal({ plan: initial, onClose }: { plan: Plan; onClose: () => void }) {
  const [plan, setPlan] = useState(initial)
  const tareas = useMemo(
    () => (plan.comentarios ?? []).filter((c) => true),
    [plan.comentarios],
  )
  const pendientes = useMemo(() => tareas.filter((c) => !c.resuelto), [tareas])
  const itemIdsConTarea = useMemo(() => {
    const ids: string[] = []
    for (const c of pendientes) {
      if (!ids.includes(c.plan_estudio_item_id)) ids.push(c.plan_estudio_item_id)
    }
    // if none pendientes, allow navigating resolved ones
    if (ids.length === 0) {
      for (const c of tareas) {
        if (!ids.includes(c.plan_estudio_item_id)) ids.push(c.plan_estudio_item_id)
      }
    }
    return ids
  }, [pendientes, tareas])

  const [idx, setIdx] = useState(0)
  const currentItemId = itemIdsConTarea[idx]
  const item = (plan.items ?? []).find((i) => i.id === currentItemId)
  const comentariosItem = tareas.filter((c) => c.plan_estudio_item_id === currentItemId)

  const [draft, setDraft] = useState<PlanItem | null>(null)
  useEffect(() => {
    setDraft(item ? { ...item } : null)
  }, [item?.id])

  const resueltas = tareas.filter((c) => c.resuelto).length

  const refresh = async () => {
    const p = await getPlan(plan.id)
    setPlan(p)
  }

  const toggleMut = useMutation({
    mutationFn: async (c: PlanComentario) => {
      const body: { resuelto: boolean; item?: Parameters<typeof resolverAuditoria>[1]['item'] } = {
        resuelto: !c.resuelto,
      }
      if (draft && !c.resuelto) {
        body.item = {
          id: draft.id,
          titulo: draft.titulo,
          descripcion: draft.descripcion,
          tipo_item: draft.tipo_item,
          fecha_inicio: draft.fecha_inicio.slice(0, 10),
          fecha_fin: draft.fecha_fin.slice(0, 10),
          orden: draft.orden,
          estado_cumplimiento: draft.estado_cumplimiento,
          porcentaje_avance: draft.porcentaje_avance,
        }
      }
      return resolverAuditoria(c.id, body)
    },
    onSuccess: async () => {
      toast.success('Tarea actualizada')
      await refresh()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!draft) return
      // save item via first open comment or just update plan
      await updatePlan(plan.id, [
        {
          id: draft.id,
          titulo: draft.titulo,
          descripcion: draft.descripcion,
          tipo_item: draft.tipo_item,
          fecha_inicio: draft.fecha_inicio.slice(0, 10),
          fecha_fin: draft.fecha_fin.slice(0, 10),
          orden: draft.orden,
          estado_cumplimiento: draft.estado_cumplimiento,
          porcentaje_avance: draft.porcentaje_avance,
        },
      ])
    },
    onSuccess: async () => {
      toast.success('Guardado')
      await refresh()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  return (
    <Modal
      open
      title="Resolver auditoría"
      xl
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={idx <= 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
          >
            Anterior
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={idx >= itemIdsConTarea.length - 1}
            onClick={() => setIdx((i) => Math.min(itemIdsConTarea.length - 1, i + 1))}
          >
            Siguiente
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Cerrar
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span data-testid="plan-resolver-progress">
          Tareas resueltas: {resueltas} / {tareas.length}
        </span>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => saveMut.mutate()}
          disabled={!draft || saveMut.isPending}
        >
          Guardar
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', minHeight: 320 }}>
        <div>
          <h3>Indicaciones</h3>
          {comentariosItem.length === 0 ? (
            <p className="texto-muted">Sin tareas en este ítem.</p>
          ) : (
            <ul>
              {comentariosItem.map((c) => (
                <li key={c.id} style={{ marginBottom: '0.75rem' }}>
                  <p>{c.texto}</p>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={c.resuelto}
                      onChange={() => toggleMut.mutate(c)}
                      data-testid={`plan-tarea-toggle-${c.id}`}
                    />
                    Hecho
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3>Ítem editable</h3>
          {draft ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <Field label="Título">
                <input
                  className="field__input"
                  value={draft.titulo}
                  onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
                />
              </Field>
              <Field label="Descripción">
                <textarea
                  className="field__input"
                  rows={5}
                  value={draft.descripcion ?? ''}
                  onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
                />
              </Field>
              <Field label="Fecha inicio">
                <input
                  className="field__input"
                  type="date"
                  value={draft.fecha_inicio.slice(0, 10)}
                  onChange={(e) => setDraft({ ...draft, fecha_inicio: e.target.value })}
                />
              </Field>
              <Field label="Fecha fin">
                <input
                  className="field__input"
                  type="date"
                  value={draft.fecha_fin.slice(0, 10)}
                  onChange={(e) => setDraft({ ...draft, fecha_fin: e.target.value })}
                />
              </Field>
            </div>
          ) : (
            <p className="texto-muted">No hay ítems con tareas.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
