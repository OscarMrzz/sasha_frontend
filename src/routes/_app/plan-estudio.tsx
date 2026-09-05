import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { userMessageFromError } from '#/lib/api'
import { listPeriodos } from '#/services/catalogos'
import { listAsignaciones } from '#/services/asignacion'
import {
  createPlan,
  getPlan,
  updatePlanItem,
  type Plan,
  type PlanCreate,
  type PlanItem,
} from '#/services/planestudio'

export const Route = createFileRoute('/_app/plan-estudio')({ component: PlanEstudioPage })

const emptyItem = {
  parcial_id: '',
  titulo: '',
  fecha_inicio: '',
  fecha_fin: '',
  orden: 1,
}

function PlanEstudioPage() {
  const qc = useQueryClient()
  const { data: asignaciones = [] } = useQuery({ queryKey: ['asignaciones'], queryFn: listAsignaciones })
  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })

  const [planId, setPlanId] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [createForm, setCreateForm] = useState<PlanCreate>({
    asignacion_docente_id: '',
    periodo_academico_id: '',
    items: [{ ...emptyItem }],
  })
  const [confirmCreate, setConfirmCreate] = useState(false)
  const [editItem, setEditItem] = useState<PlanItem | null>(null)
  const [cumplimiento, setCumplimiento] = useState({ estado_cumplimiento: 'pendiente', porcentaje_avance: 0 })
  const [confirmUpdate, setConfirmUpdate] = useState(false)

  const createMut = useMutation({
    mutationFn: () => createPlan(createForm),
    onSuccess: (p) => {
      toast.success('Plan creado')
      setPlanId(p.id)
      setPlan(p)
      setConfirmCreate(false)
      qc.invalidateQueries({ queryKey: ['plan', p.id] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const fetchPlan = async () => {
    if (!planId.trim()) {
      toast.error('Ingresa un ID de plan')
      return
    }
    try {
      const p = await getPlan(planId)
      setPlan(p)
      toast.success('Plan cargado')
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editItem) throw new Error('Sin ítem')
      return updatePlanItem(editItem.id, cumplimiento)
    },
    onSuccess: () => {
      toast.success('Cumplimiento actualizado')
      setConfirmUpdate(false)
      setEditItem(null)
      if (planId) fetchPlan()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const addItemRow = () => {
    setCreateForm((f) => ({
      ...f,
      items: [...f.items, { ...emptyItem, orden: f.items.length + 1 }],
    }))
  }

  return (
    <RequirePermission permission="planestudio:get">
      <h1 className="page-title">Plan de estudio</h1>

      <Can permission="planestudio:post">
        <section
          style={{
            background: 'var(--sasha-bg-raised)',
            border: '1px solid var(--sasha-border-suave)',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            maxWidth: 800,
          }}
        >
          <h3 className="texto-muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
            Crear plan
          </h3>
          <Field label="Asignación docente">
            <select
              className="field__select"
              data-testid="plan-asignacion-select"
              value={createForm.asignacion_docente_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, asignacion_docente_id: e.target.value }))}
            >
              <option value="">Seleccionar…</option>
              {asignaciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id.slice(0, 8)}…
                </option>
              ))}
            </select>
          </Field>
          <Field label="Periodo académico">
            <select
              className="field__select"
              value={createForm.periodo_academico_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, periodo_academico_id: e.target.value }))}
            >
              <option value="">Seleccionar…</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Field>
          <h4 className="texto-muted" style={{ fontSize: '0.85rem' }}>
            Ítems
          </h4>
          {createForm.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <input
                className="field__input"
                placeholder="Título"
                value={item.titulo}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    items: f.items.map((it, i) => (i === idx ? { ...it, titulo: e.target.value } : it)),
                  }))
                }
              />
              <input
                type="date"
                className="field__input"
                value={item.fecha_inicio}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    items: f.items.map((it, i) => (i === idx ? { ...it, fecha_inicio: e.target.value } : it)),
                  }))
                }
              />
              <input
                type="date"
                className="field__input"
                value={item.fecha_fin}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    items: f.items.map((it, i) => (i === idx ? { ...it, fecha_fin: e.target.value } : it)),
                  }))
                }
              />
            </div>
          ))}
          <button type="button" className="btn btn--ghost btn--sm" onClick={addItemRow}>
            + Ítem
          </button>
          <div style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="plan-create-button"
              onClick={() => setConfirmCreate(true)}
            >
              Crear plan
            </button>
          </div>
        </section>
      </Can>

      <section
        style={{
          background: 'var(--sasha-bg-raised)',
          border: '1px solid var(--sasha-border-suave)',
          borderRadius: '8px',
          padding: '1.25rem',
          maxWidth: 800,
        }}
      >
        <h3 className="texto-muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
          Consultar por ID
        </h3>
        <Field label="Plan ID">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="field__input"
              data-testid="plan-id-input"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            />
            <button type="button" className="btn btn--ghost" onClick={fetchPlan}>
              Cargar
            </button>
          </div>
        </Field>

        {plan?.items?.length ? (
          <table className="data-table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Título</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Cumplimiento</th>
                <th>Avance</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plan.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.titulo}</td>
                  <td>{item.fecha_inicio.slice(0, 10)}</td>
                  <td>{item.fecha_fin.slice(0, 10)}</td>
                  <td>
                    <span className="badge">{item.estado_cumplimiento}</span>
                  </td>
                  <td>{item.porcentaje_avance}%</td>
                  <td>
                    <Can permission="planestudio:put">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          setEditItem(item)
                          setCumplimiento({
                            estado_cumplimiento: item.estado_cumplimiento,
                            porcentaje_avance: item.porcentaje_avance,
                          })
                        }}
                      >
                        Editar
                      </button>
                    </Can>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : plan ? (
          <p className="texto-muted">Plan sin ítems.</p>
        ) : null}
      </section>

      {editItem ? (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            border: '1px solid var(--sasha-border-suave)',
            borderRadius: '8px',
            maxWidth: 400,
          }}
        >
          <h4 style={{ marginTop: 0 }}>Actualizar cumplimiento: {editItem.titulo}</h4>
          <Field label="Estado">
            <select
              className="field__select"
              value={cumplimiento.estado_cumplimiento}
              onChange={(e) => setCumplimiento((c) => ({ ...c, estado_cumplimiento: e.target.value }))}
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En progreso</option>
              <option value="completado">Completado</option>
            </select>
          </Field>
          <Field label="Porcentaje avance">
            <input
              type="number"
              min={0}
              max={100}
              className="field__input"
              value={cumplimiento.porcentaje_avance ?? 0}
              onChange={(e) =>
                setCumplimiento((c) => ({ ...c, porcentaje_avance: Number(e.target.value) }))
              }
            />
          </Field>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setConfirmUpdate(true)}>
            Guardar
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditItem(null)}>
            Cancelar
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmCreate}
        title="Crear plan"
        message="¿Crear el plan de estudio con los ítems indicados?"
        onConfirm={() => createMut.mutate()}
        onCancel={() => setConfirmCreate(false)}
      />
      <ConfirmDialog
        open={confirmUpdate}
        title="Actualizar cumplimiento"
        message="¿Guardar el estado de cumplimiento del ítem?"
        onConfirm={() => updateMut.mutate()}
        onCancel={() => setConfirmUpdate(false)}
      />
    </RequirePermission>
  )
}
