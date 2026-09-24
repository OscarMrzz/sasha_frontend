import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { SearchInput } from '#/components/ui/SearchInput'
import { labelPeriodo } from '#/helpers/periodos'
import { userMessageFromError } from '#/lib/api'
import { listPeriodos } from '#/services/catalogos'
import { useSession } from '#/hooks/use-session'
import {
  activarPlan,
  addAuditoria,
  createPlan,
  downloadPlanPdf,
  getPlan,
  listMisCursos,
  listPlanes,
  resolverAuditoria,
  setAprobacion,
  updatePlan,
  updatePlanItem,
  type MisCurso,
  type Plan,
  type PlanComentario,
  type PlanItem,
} from '#/services/planestudio'

export const Route = createFileRoute('/_app/plan-estudio')({ component: PlanEstudioPage })

const col = createColumnHelper<Plan>()

const REVIEWER_ROLES = new Set(['admin', 'director', 'consejeria'])

const emptyItem = {
  parcial_id: '',
  titulo: '',
  descripcion: '',
  tipo_item: 'teorico',
  fecha_inicio: '',
  fecha_fin: '',
  orden: 1,
  puntos: 0,
  materiales: '',
}

const TIPO_ITEM_OPTIONS = [
  { value: 'teorico', label: 'Teórico' },
  { value: 'practico', label: 'Práctico' },
  { value: 'social', label: 'Social' },
  { value: 'prueba', label: 'Prueba' },
  { value: 'examen', label: 'Examen' },
] as const

function labelTipoItem(v: string) {
  return TIPO_ITEM_OPTIONS.find((o) => o.value === v)?.label ?? v
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
        searchPlaceholder="Buscar…"
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
          canToggleCumplimiento={canPut}
          onClose={() => setVerPlan(null)}
          onItemUpdated={(item) => {
            setVerPlan((p) =>
              p
                ? {
                    ...p,
                    items: (p.items ?? []).map((it) => (it.id === item.id ? { ...it, ...item } : it)),
                  }
                : p,
            )
            void qc.invalidateQueries({ queryKey: ['planes'] })
          }}
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
  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos'],
    queryFn: listPeriodos,
    retry: false,
  })

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
        getLabel: (r: Plan) => r.curso_nombre || '',
      },
      {
        id: 'grado',
        label: 'Grado',
        getValue: (r: Plan) => r.grado_id || '',
        getLabel: (r: Plan) => r.grado_nombre || '',
      },
      {
        id: 'modalidad',
        label: 'Modalidad',
        getValue: (r: Plan) => r.modalidad_id || '',
        getLabel: (r: Plan) => r.modalidad_nombre || '',
      },
    ],
    [periodos],
  )

  if (isLoading) return <div className="empty-state">Cargando planes…</div>

  return (
    <RequirePermission permission="planestudio:get">
      <DataTable
        title="Mis planes de estudio"
        data={data}
        columns={columns}
        filters={tableFilters}
        searchPlaceholder="Buscar…"
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
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            void qc.invalidateQueries({ queryKey: ['planes'] })
          }}
        />
      ) : null}

      {verPlan ? (
        <VerPlanModal
          plan={verPlan}
          canToggleCumplimiento={canPut}
          onClose={() => setVerPlan(null)}
          onItemUpdated={(item) => {
            setVerPlan((p) =>
              p
                ? {
                    ...p,
                    items: (p.items ?? []).map((it) => (it.id === item.id ? { ...it, ...item } : it)),
                  }
                : p,
            )
            void qc.invalidateQueries({ queryKey: ['planes'] })
          }}
        />
      ) : null}

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

function labelCumplimiento(v: string) {
  if (v === 'iniciado') return 'Iniciado'
  if (v === 'finalizado') return 'Finalizado'
  return 'Pendiente'
}

const CUMPLIMIENTO_CYCLE = [
  { estado: 'pendiente', avance: 0, label: 'Pendiente' },
  { estado: 'iniciado', avance: 50, label: 'Iniciado' },
  { estado: 'finalizado', avance: 100, label: 'Finalizado' },
] as const

function nextCumplimiento(actual: string) {
  const idx = CUMPLIMIENTO_CYCLE.findIndex((c) => c.estado === actual)
  return CUMPLIMIENTO_CYCLE[(idx + 1) % CUMPLIMIENTO_CYCLE.length]
}

function VerPlanModal({
  plan,
  onClose,
  canToggleCumplimiento = false,
  onItemUpdated,
}: {
  plan: Plan
  onClose: () => void
  canToggleCumplimiento?: boolean
  onItemUpdated?: (item: PlanItem) => void
}) {
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [cumplimiento, setCumplimiento] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (plan.items ?? []).filter((it) => {
      if (tipo && it.tipo_item !== tipo) return false
      if (cumplimiento && it.estado_cumplimiento !== cumplimiento) return false
      const ini = it.fecha_inicio?.slice(0, 10) || ''
      const fin = it.fecha_fin?.slice(0, 10) || ''
      if (fechaDesde && fin && fin < fechaDesde) return false
      if (fechaHasta && ini && ini > fechaHasta) return false
      if (!needle) return true
      const hay = `${it.titulo} ${it.descripcion ?? ''} ${it.materiales ?? ''} ${labelTipoItem(it.tipo_item)}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [plan.items, q, tipo, cumplimiento, fechaDesde, fechaHasta])

  const toggleCumplimiento = async (it: PlanItem) => {
    if (!canToggleCumplimiento || pendingId) return
    const next = nextCumplimiento(it.estado_cumplimiento)
    setPendingId(it.id)
    try {
      const updated = await updatePlanItem(it.id, {
        estado_cumplimiento: next.estado,
        porcentaje_avance: next.avance,
      })
      onItemUpdated?.(updated)
      toast.success(`Marcado como ${next.label.toLowerCase()}`)
    } catch (e) {
      toast.error(userMessageFromError(e))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Modal
      open
      title="Ver plan"
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

      <div
        style={{
          display: 'grid',
          gap: '0.5rem',
          marginBottom: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        }}
        data-testid="plan-ver-filtros"
      >
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="plan-ver-buscar"
          style={{ minWidth: 0 }}
        />
        <Field label="Tipo">
          <select className="field__input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {TIPO_ITEM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Desde">
          <input
            className="field__input"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </Field>
        <Field label="Hasta">
          <input
            className="field__input"
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </Field>
        <Field label="Cumplimiento">
          <select
            className="field__input"
            value={cumplimiento}
            onChange={(e) => setCumplimiento(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="iniciado">Iniciado</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </Field>
      </div>

      {items.length === 0 ? (
        <p className="texto-muted">No hay ítems con esos filtros.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }} data-testid="plan-ver-cards">
          {items.map((it, idx) => {
            const estado = ['pendiente', 'iniciado', 'finalizado'].includes(it.estado_cumplimiento)
              ? it.estado_cumplimiento
              : 'pendiente'
            return (
              <article
                key={it.id}
                className={`neon-surface neon-surface--${estado} neon-card-row`}
              >
                <div className="neon-card-row__body">
                  <div className="page-title-row" style={{ marginBottom: '0.35rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>
                      {idx + 1}. {it.titulo}
                    </h3>
                    <span className="badge">{labelCumplimiento(it.estado_cumplimiento)}</span>
                  </div>
                  {it.descripcion ? (
                    <p style={{ margin: '0 0 0.5rem', whiteSpace: 'pre-wrap' }}>{it.descripcion}</p>
                  ) : null}
                  <p className="texto-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                    <strong>Tipo:</strong> {labelTipoItem(it.tipo_item)} · <strong>Puntos:</strong>{' '}
                    {it.puntos ?? 0} · <strong>Avance:</strong> {it.porcentaje_avance}%
                    <br />
                    <strong>Fechas:</strong> {it.fecha_inicio?.slice(0, 10) || '—'} —{' '}
                    {it.fecha_fin?.slice(0, 10) || '—'}
                    <br />
                    <strong>Materiales:</strong> {it.materiales || '—'}
                  </p>
                </div>

                <button
                  type="button"
                  className={`neon-check neon-check--${estado}`}
                  aria-label={`Cumplimiento: ${labelCumplimiento(estado)}. Clic para cambiar`}
                  data-testid={`plan-item-check-${it.id}`}
                  disabled={!canToggleCumplimiento || pendingId === it.id}
                  onClick={() => void toggleCumplimiento(it)}
                  title={`${labelCumplimiento(estado)} → ${nextCumplimiento(estado).label}`}
                >
                  <span className="neon-check__box" aria-hidden>
                    {estado === 'finalizado' ? (
                      <svg viewBox="0 0 24 24" className="neon-check__mark">
                        <path
                          d="M5 13l4 4L19 7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                    {estado === 'iniciado' ? <span className="neon-check__dot" /> : null}
                  </span>
                  <span className="neon-check__label">{labelCumplimiento(estado)}</span>
                </button>
              </article>
            )
          })}
        </div>
      )}

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
              <th>Puntos</th>
              <th>Fechas</th>
              <th>Materiales</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(plan.items ?? []).map((it, idx) => (
              <tr key={it.id}>
                <td>{idx + 1}</td>
                <td>
                  {it.titulo}
                  {it.descripcion ? (
                    <div className="texto-muted" style={{ fontSize: '0.85em' }}>
                      {it.descripcion}
                    </div>
                  ) : null}
                </td>
                <td>{it.puntos ?? 0}</td>
                <td>
                  {it.fecha_inicio?.slice(0, 10)} — {it.fecha_fin?.slice(0, 10)}
                </td>
                <td>{it.materiales || '—'}</td>
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

function CrearPlanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { session } = useSession()
  const { data: mis, isLoading } = useQuery({
    queryKey: ['planestudio', 'mis-cursos'],
    queryFn: listMisCursos,
  })

  const [asigId, setAsigId] = useState('')
  const [parcialBlocks, setParcialBlocks] = useState<{ parcial_id: string; items: typeof emptyItem[] }[]>([])
  const [confirm, setConfirm] = useState(false)

  const cursos = mis?.cursos ?? []
  const selected: MisCurso | undefined = cursos.find((c) => c.asignacion_docente_id === asigId)
  const parciales = selected?.parciales ?? []

  useEffect(() => {
    if (!selected || parciales.length === 0) return
    setParcialBlocks([
      {
        parcial_id: parciales[0].id,
        items: [{ ...emptyItem, parcial_id: parciales[0].id, puntos: 100 }],
      },
    ])
  }, [selected?.asignacion_docente_id])

  const flatItems = useMemo(
    () =>
      parcialBlocks.flatMap((b, bi) =>
        b.items.map((it, ii) => ({
          ...it,
          parcial_id: b.parcial_id,
          orden: bi * 100 + ii + 1,
          puntos: Number(it.puntos) || 0,
          descripcion: it.descripcion || undefined,
          materiales: it.materiales || undefined,
        })),
      ),
    [parcialBlocks],
  )

  const mut = useMutation({
    mutationFn: () =>
      createPlan({
        asignacion_docente_id: asigId,
        periodo_academico_id: selected!.periodo_academico_id,
        items: flatItems,
      }),
    onSuccess: () => {
      toast.success('Plan creado')
      onCreated()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const usedParcialIds = new Set(parcialBlocks.map((b) => b.parcial_id))
  const availableParciales = parciales.filter((p) => !usedParcialIds.has(p.id))
  const sumParcial = (items: typeof emptyItem[]) =>
    items.reduce((acc, it) => acc + (Number(it.puntos) || 0), 0)

  return (
    <>
      <Modal
        open
        title="Crear plan de estudio"
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
              disabled={!asigId || !selected || flatItems.length === 0}
            >
              Crear
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: '0.75rem' }} data-testid="plan-create-wizard">
          <p className="texto-muted">
            <strong>Institución:</strong> {mis?.institucion_nombre || '—'}
            <br />
            <strong>Maestro:</strong> {session?.username || session?.code || '—'}
          </p>

          <Field label="Curso">
            <select
              className="field__input"
              value={asigId}
              data-testid="plan-create-curso"
              disabled={isLoading}
              onChange={(e) => {
                setAsigId(e.target.value)
                setParcialBlocks([])
              }}
            >
              <option value="">{isLoading ? 'Cargando cursos…' : 'Elegir curso…'}</option>
              {cursos.map((c) => (
                <option key={c.asignacion_docente_id} value={c.asignacion_docente_id}>
                  {[c.curso_nombre, c.grado_nombre, c.modalidad_nombre].filter(Boolean).join(' · ')}
                  {c.periodo_nombre ? ` · ${c.periodo_nombre}` : ''}
                  {` (${c.parciales?.length ?? 0} parciales)`}
                </option>
              ))}
            </select>
          </Field>

          {!isLoading && cursos.length === 0 ? (
            <p className="texto-muted">No tienes cursos asignados en este periodo.</p>
          ) : null}

          {selected ? (
            <p data-testid="plan-create-meta">
              Curso: <strong>{selected.curso_nombre}</strong> · Grado: {selected.grado_nombre || '—'} ·
              Modalidad: {selected.modalidad_nombre || '—'} · Periodo: {selected.periodo_nombre || '—'}
            </p>
          ) : null}

          {selected?.objetivo_general ? (
            <details>
              <summary>Sílabo del curso (solo lectura)</summary>
              <p style={{ whiteSpace: 'pre-wrap' }}>{selected.objetivo_general}</p>
            </details>
          ) : null}

          {parcialBlocks.map((block, bi) => {
            const parcial = parciales.find((p) => p.id === block.parcial_id)
            const sum = sumParcial(block.items)
            return (
              <div
                key={block.parcial_id}
                style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.75rem' }}
                data-testid={`plan-parcial-block-${bi}`}
              >
                <div className="page-title-row">
                  <h3 style={{ margin: 0 }}>{parcial?.nombre ?? `Parcial ${bi + 1}`}</h3>
                  <span style={{ color: sum !== 100 ? '#b00' : undefined }}>{sum} / 100 pts</span>
                </div>
                {block.items.map((it, ii) => (
                  <div
                    key={ii}
                    style={{
                      display: 'grid',
                      gap: '0.5rem',
                      marginTop: '0.75rem',
                      paddingTop: ii > 0 ? '0.75rem' : 0,
                      borderTop: ii > 0 ? '1px solid #eee' : undefined,
                    }}
                  >
                    <Field label="Título">
                      <input
                        className="field__input"
                        placeholder="Título del ítem"
                        value={it.titulo}
                        data-testid={bi === 0 && ii === 0 ? 'plan-item-titulo' : undefined}
                        onChange={(e) => {
                          const next = [...parcialBlocks]
                          next[bi] = {
                            ...next[bi],
                            items: next[bi].items.map((x, j) =>
                              j === ii ? { ...x, titulo: e.target.value } : x,
                            ),
                          }
                          setParcialBlocks(next)
                        }}
                      />
                    </Field>
                    <Field label="Descripción">
                      <textarea
                        className="field__input"
                        rows={2}
                        placeholder="Descripción"
                        value={it.descripcion}
                        onChange={(e) => {
                          const next = [...parcialBlocks]
                          next[bi].items[ii] = { ...next[bi].items[ii], descripcion: e.target.value }
                          setParcialBlocks([...next])
                        }}
                      />
                    </Field>
                    <Field label="Tipo">
                      <select
                        className="field__input"
                        value={it.tipo_item}
                        data-testid={bi === 0 && ii === 0 ? 'plan-item-tipo' : undefined}
                        onChange={(e) => {
                          const next = [...parcialBlocks]
                          next[bi].items[ii] = { ...next[bi].items[ii], tipo_item: e.target.value }
                          setParcialBlocks([...next])
                        }}
                      >
                        {TIPO_ITEM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Puntos">
                      <input
                        className="field__input"
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="Puntos"
                        value={it.puntos}
                        onChange={(e) => {
                          const next = [...parcialBlocks]
                          next[bi].items[ii] = { ...next[bi].items[ii], puntos: Number(e.target.value) }
                          setParcialBlocks([...next])
                        }}
                      />
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <Field label="Fecha inicio (aprox.)">
                        <input
                          className="field__input"
                          type="date"
                          value={it.fecha_inicio}
                          onChange={(e) => {
                            const next = [...parcialBlocks]
                            next[bi].items[ii] = { ...next[bi].items[ii], fecha_inicio: e.target.value }
                            setParcialBlocks([...next])
                          }}
                        />
                      </Field>
                      <Field label="Fecha fin (aprox.)">
                        <input
                          className="field__input"
                          type="date"
                          value={it.fecha_fin}
                          onChange={(e) => {
                            const next = [...parcialBlocks]
                            next[bi].items[ii] = { ...next[bi].items[ii], fecha_fin: e.target.value }
                            setParcialBlocks([...next])
                          }}
                        />
                      </Field>
                    </div>
                    <Field label="Materiales">
                      <input
                        className="field__input"
                        placeholder="Materiales necesarios"
                        value={it.materiales}
                        onChange={(e) => {
                          const next = [...parcialBlocks]
                          next[bi].items[ii] = { ...next[bi].items[ii], materiales: e.target.value }
                          setParcialBlocks([...next])
                        }}
                      />
                    </Field>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ marginTop: '0.5rem' }}
                  data-testid="plan-add-item"
                  onClick={() => {
                    const next = [...parcialBlocks]
                    next[bi] = {
                      ...next[bi],
                      items: [...next[bi].items, { ...emptyItem, parcial_id: block.parcial_id, puntos: 0 }],
                    }
                    setParcialBlocks(next)
                  }}
                >
                  + Ítem
                </button>
              </div>
            )
          })}

          {selected ? (
            <button
              type="button"
              className="btn btn--ghost"
              data-testid="plan-add-parcial"
              style={{ width: '100%', marginTop: '0.25rem' }}
              onClick={() => {
                const p = availableParciales[0]
                if (!p) {
                  toast.message('No hay más parciales en este periodo')
                  return
                }
                setParcialBlocks((blocks) => [
                  ...blocks,
                  { parcial_id: p.id, items: [{ ...emptyItem, parcial_id: p.id, puntos: 100 }] },
                ])
              }}
            >
              + Agregar parcial
            </button>
          ) : null}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirm}
        title="Crear plan"
        message="¿Crear este plan? Cada parcial debe sumar exactamente 100 puntos."
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
          puntos: it.puntos ?? 0,
          materiales: it.materiales || undefined,
          parcial_id: it.parcial_id,
        })),
      ),
    onSuccess: () => {
      toast.success('Plan actualizado')
      onSaved()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const sumaPuntos = items.reduce((acc, it) => acc + (Number(it.puntos) || 0), 0)

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
      <p className="texto-muted" style={{ marginBottom: '0.75rem' }}>
        Σ puntos (todos los ítems): {sumaPuntos} — cada parcial debe sumar 100
      </p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <Field label="Puntos">
              <input
                className="field__input"
                type="number"
                min={0}
                step={0.5}
                value={it.puntos ?? 0}
                onChange={(e) => {
                  const next = [...items]
                  next[idx] = { ...next[idx], puntos: Number(e.target.value) }
                  setItems(next)
                }}
              />
            </Field>
            <Field label="Materiales">
              <input
                className="field__input"
                value={it.materiales ?? ''}
                onChange={(e) => {
                  const next = [...items]
                  next[idx] = { ...next[idx], materiales: e.target.value }
                  setItems(next)
                }}
              />
            </Field>
          </div>
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

  const allItemsPayload = (override?: PlanItem) =>
    (plan.items ?? []).map((it) => {
      const src = override && override.id === it.id ? override : it
      return {
        id: src.id,
        titulo: src.titulo,
        descripcion: src.descripcion,
        tipo_item: src.tipo_item,
        fecha_inicio: src.fecha_inicio.slice(0, 10),
        fecha_fin: src.fecha_fin.slice(0, 10),
        orden: src.orden,
        estado_cumplimiento: src.estado_cumplimiento,
        porcentaje_avance: src.porcentaje_avance,
        puntos: src.puntos ?? 0,
        materiales: src.materiales || undefined,
        parcial_id: src.parcial_id,
      }
    })

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
          puntos: draft.puntos ?? 0,
          materiales: draft.materiales || undefined,
          parcial_id: draft.parcial_id,
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
      await updatePlan(plan.id, allItemsPayload(draft))
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
              <Field label="Puntos">
                <input
                  className="field__input"
                  type="number"
                  min={0}
                  step={0.5}
                  value={draft.puntos ?? 0}
                  onChange={(e) => setDraft({ ...draft, puntos: Number(e.target.value) })}
                />
              </Field>
              <Field label="Materiales">
                <input
                  className="field__input"
                  value={draft.materiales ?? ''}
                  onChange={(e) => setDraft({ ...draft, materiales: e.target.value })}
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
