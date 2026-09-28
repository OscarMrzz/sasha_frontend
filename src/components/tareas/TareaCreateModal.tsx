import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  createTarea,
  listParcialesTarea,
  listTiposTarea,
  type TareaCreate,
  type TareaCriterioModo,
} from '#/services/tareas'

type ParcialOpt = { id: string; nombre: string }

const PARCIALES_VACIOS: ParcialOpt[] = []

export function TareaCreateModal({
  asignacionDocenteId,
  periodoAcademicoId,
  claseLabel,
  claseSelect,
  onClose,
}: {
  asignacionDocenteId: string
  periodoAcademicoId: string
  claseLabel: string
  /** Selector opcional de clase (página /tareas). */
  claseSelect?: ReactNode
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const qc = useQueryClient()
  const [confirmSave, setConfirmSave] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    fecha_entrega: '',
    puntos: '10',
    criterio: 'simple' as TareaCriterioModo,
    tipo_tarea_id: '',
    parcial_id: '',
  })

  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos-tarea'],
    queryFn: () => listTiposTarea(false),
  })

  const { data: parcialesData, isError: parcialesError } = useQuery({
    queryKey: ['tareas-parciales', periodoAcademicoId],
    queryFn: () => listParcialesTarea(periodoAcademicoId),
    enabled: Boolean(periodoAcademicoId),
  })
  const parciales = parcialesData ?? PARCIALES_VACIOS

  useEffect(() => {
    const firstId = parciales[0]?.id ?? ''
    setForm((f) => {
      if (f.parcial_id && parciales.some((p) => p.id === f.parcial_id)) return f
      if (f.parcial_id === firstId) return f
      return { ...f, parcial_id: firstId }
    })
  }, [parciales, periodoAcademicoId])

  const createMut = useMutation({
    mutationFn: (body: TareaCreate) => createTarea(body),
    onSuccess: () => {
      toast.success('Tarea creada')
      void qc.invalidateQueries({ queryKey: ['tareas'] })
      void qc.invalidateQueries({ queryKey: ['maestro-dashboard'] })
      setConfirmSave(false)
      dismiss()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const buildBody = (): TareaCreate | null => {
    if (!asignacionDocenteId) {
      toast.error('Selecciona la clase')
      return null
    }
    if (!form.titulo.trim()) {
      toast.error('El título es obligatorio')
      return null
    }
    if (!form.fecha_entrega) {
      toast.error('La fecha de entrega es obligatoria')
      return null
    }
    if (!form.parcial_id) {
      toast.error('Elige el parcial')
      return null
    }
    if (!form.tipo_tarea_id) {
      toast.error('Elige el tipo de tarea')
      return null
    }
    const puntos = Number(form.puntos)
    if (!Number.isFinite(puntos) || puntos < 0) {
      toast.error('Los puntos deben ser un número ≥ 0')
      return null
    }
    return {
      asignacion_docente_id: asignacionDocenteId,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || undefined,
      fecha_entrega: form.fecha_entrega,
      tipo: form.criterio,
      tipo_tarea_id: form.tipo_tarea_id,
      parcial_id: form.parcial_id,
      puntos,
    }
  }

  return (
    <>
      <Modal
        open={open}
        title="Nueva tarea"
        onClose={dismiss}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cancelar
            </button>
            <Can permission="tareas:post">
              <button
                type="button"
                className="btn btn--primary"
                data-testid="tarea-guardar"
                disabled={!asignacionDocenteId || !periodoAcademicoId}
                onClick={() => {
                  if (!buildBody()) return
                  setConfirmSave(true)
                }}
              >
                Guardar
              </button>
            </Can>
          </>
        }
      >
        <div data-testid="tarea-create-modal">
          {claseSelect}
          <p
            className="texto-muted"
            style={{ marginTop: claseSelect ? '0.35rem' : 0, fontSize: '0.85rem' }}
            data-testid="tarea-clase-label"
          >
            {claseLabel}
          </p>

          <Field label="Título" htmlFor="tarea-titulo">
            <input
              id="tarea-titulo"
              className="field__input"
              data-testid="tarea-titulo-input"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
          </Field>
          <Field label="Descripción">
            <textarea
              className="field__textarea"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Fecha entrega">
              <input
                type="date"
                className="field__input"
                data-testid="tarea-fecha-entrega"
                value={form.fecha_entrega}
                onChange={(e) => setForm((f) => ({ ...f, fecha_entrega: e.target.value }))}
              />
            </Field>
            <Field label="Puntos">
              <input
                type="number"
                min={0}
                step="0.5"
                className="field__input"
                data-testid="tarea-puntos"
                value={form.puntos}
                onChange={(e) => setForm((f) => ({ ...f, puntos: e.target.value }))}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <Field label="Parcial">
              <select
                className="field__select"
                data-testid="tarea-parcial-select"
                value={form.parcial_id}
                onChange={(e) => setForm((f) => ({ ...f, parcial_id: e.target.value }))}
                disabled={!periodoAcademicoId || parciales.length === 0}
              >
                {!periodoAcademicoId ? (
                  <option value="">Sin periodo de clase</option>
                ) : parcialesError ? (
                  <option value="">Error al cargar parciales</option>
                ) : parciales.length === 0 ? (
                  <option value="">Sin parciales</option>
                ) : (
                  parciales.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))
                )}
              </select>
            </Field>
            <Field label="Criterio">
              <select
                className="field__select"
                data-testid="tarea-criterio-select"
                value={form.criterio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, criterio: e.target.value as TareaCriterioModo }))
                }
              >
                <option value="simple">Simple</option>
                <option value="manual">Manual</option>
                <option value="criterio">Con criterio</option>
              </select>
            </Field>
            <Field label="Tipo">
              <select
                className="field__select"
                data-testid="tarea-tipo-select"
                value={form.tipo_tarea_id}
                onChange={(e) => setForm((f) => ({ ...f, tipo_tarea_id: e.target.value }))}
              >
                <option value="">Seleccionar…</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {form.criterio === 'criterio' ? (
            <p className="texto-muted" style={{ fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
              Al revisar, cada criterio aplica su % sobre estos puntos (redondeo hacia arriba).
            </p>
          ) : null}
          {form.criterio === 'manual' ? (
            <p className="texto-muted" style={{ fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
              Al revisar escribirás a mano los puntos de cada alumno (entre 0 y este máximo).
            </p>
          ) : null}
          {form.criterio === 'simple' ? (
            <p className="texto-muted" style={{ fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
              Al revisar un clic marca entregado con el máximo de puntos.
            </p>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Crear tarea"
        message="¿Registrar esta tarea?"
        onConfirm={() => {
          const body = buildBody()
          if (body) createMut.mutate(body)
        }}
        onCancel={() => setConfirmSave(false)}
      />
    </>
  )
}
