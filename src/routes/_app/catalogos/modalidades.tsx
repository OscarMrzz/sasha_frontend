import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { WizardSteps } from '#/components/ui/WizardSteps'
import { userMessageFromError } from '#/lib/api'
import {
  createModalidad,
  deleteModalidad,
  listModalidades,
  updateModalidad,
  type Modalidad,
  type ModalidadCreate,
} from '#/services/catalogos'

export const Route = createFileRoute('/_app/catalogos/modalidades')({ component: ModalidadesPage })

const col = createColumnHelper<Modalidad>()

const STEPS = [
  { id: 'datos', label: 'Datos' },
  { id: 'horario', label: 'Horario' },
  { id: 'dias', label: 'Días' },
  { id: 'periodo', label: 'Periodo' },
  { id: 'parciales', label: 'Parciales' },
  { id: 'hora', label: 'Hora' },
  { id: 'recreo', label: 'Recreo' },
  { id: 'estado', label: 'Estado' },
] as const

const DIAS = [
  { n: 1, label: 'Lunes' },
  { n: 2, label: 'Martes' },
  { n: 3, label: 'Miércoles' },
  { n: 4, label: 'Jueves' },
  { n: 5, label: 'Viernes' },
  { n: 6, label: 'Sábado' },
  { n: 7, label: 'Domingo' },
]

const defaultForm: ModalidadCreate = {
  nombre: '',
  hora_inicio: '07:00',
  hora_fin: '12:00',
  status: 'ACTIVE',
  dias: [1, 2, 3, 4, 5],
  duracion_hora_clase_minutos: 40,
  duracion_periodo_meses: 12,
  cantidad_parciales_por_periodo: 4,
  duracion_parcial_dias: 30,
  duracion_recreo_minutos: 20,
  cantidad_recreos: 1,
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

function ModalidadesPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['modalidades'], queryFn: listModalidades })

  const [modalOpen, setModalOpen] = useState(false)
  const [viewOnly, setViewOnly] = useState(false)
  const [editing, setEditing] = useState<Modalidad | null>(null)
  const [form, setForm] = useState<ModalidadCreate>(defaultForm)
  const [step, setStep] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState<Modalidad | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Modalidad } | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const closeModal = () => {
    setModalOpen(false)
    setStep(0)
  }

  const openCreate = () => {
    setEditing(null)
    setViewOnly(false)
    setForm(defaultForm)
    setStep(0)
    setModalOpen(true)
  }

  const openEdit = (row: Modalidad, view = false) => {
    setEditing(row)
    setViewOnly(view)
    setStep(0)
    setForm({
      nombre: row.nombre,
      hora_inicio: row.hora_inicio,
      hora_fin: row.hora_fin,
      status: row.status,
      dias: [1, 2, 3, 4, 5],
      detalles: row.detalles,
      duracion_hora_clase_minutos: row.duracion_hora_clase_minutos,
      duracion_periodo_meses: row.duracion_periodo_meses,
      cantidad_parciales_por_periodo: row.cantidad_parciales_por_periodo,
      duracion_parcial_dias: row.duracion_parcial_dias,
      duracion_recreo_minutos: row.duracion_recreo_minutos,
      cantidad_recreos: row.cantidad_recreos,
    })
    setModalOpen(true)
    closeCtx()
  }

  const toggleDia = (n: number) => {
    setForm((f) => ({
      ...f,
      dias: f.dias.includes(n) ? f.dias.filter((d) => d !== n) : [...f.dias, n].sort(),
    }))
  }

  const validateStep = (i: number): string | null => {
    if (i === 0) {
      if (!form.nombre.trim()) return 'El nombre es obligatorio'
    }
    if (i === 1) {
      if (!form.hora_inicio || !form.hora_fin) return 'Indica hora de inicio y fin'
      if (form.hora_inicio >= form.hora_fin) return 'La hora de fin debe ser posterior al inicio'
    }
    if (i === 2 && form.dias.length === 0) {
      return 'Selecciona al menos un día de clase'
    }
    if (i === 3 && form.duracion_periodo_meses <= 0) {
      return 'Indica cuánto dura el periodo (meses)'
    }
    if (i === 4) {
      if (form.cantidad_parciales_por_periodo <= 0) return 'Indica cuántos parciales hay por periodo'
      if (form.duracion_parcial_dias != null && form.duracion_parcial_dias <= 0) {
        return 'Duración de cada parcial inválida'
      }
    }
    if (i === 5 && form.duracion_hora_clase_minutos <= 0) {
      return 'Indica cuánto dura la hora clase (minutos)'
    }
    if (i === 6) {
      if (form.duracion_recreo_minutos < 0) return 'Duración de recreo inválida'
      if (form.cantidad_recreos < 0) return 'Cantidad de recreos inválida'
    }
    if (i === 7 && !form.status) return 'Selecciona el estado'
    return null
  }

  const goNext = () => {
    if (!viewOnly) {
      const err = validateStep(step)
      if (err) {
        toast.error(err)
        return
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) return updateModalidad(editing.id, form)
      return createModalidad(form)
    },
    onSuccess: () => {
      toast.success(editing ? 'Modalidad actualizada' : 'Modalidad creada')
      qc.invalidateQueries({ queryKey: ['modalidades'] })
      closeModal()
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteModalidad(id),
    onSuccess: () => {
      toast.success('Modalidad eliminada')
      qc.invalidateQueries({ queryKey: ['modalidades'] })
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Código' }),
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('hora_inicio', { header: 'Inicio' }),
      col.accessor('hora_fin', { header: 'Fin' }),
      col.accessor('duracion_hora_clase_minutos', { header: 'Hora (min)' }),
      col.accessor('status', { header: 'Estado', cell: (i) => <span className="badge">{i.getValue()}</span> }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'nombre', label: 'Nombre', getValue: (r: Modalidad) => r.nombre },
      { id: 'status', label: 'Estado', getValue: (r: Modalidad) => r.status },
    ],
    [],
  )

  const lastStep = step === STEPS.length - 1
  const diaLabels = DIAS.filter((d) => form.dias.includes(d.n))
    .map((d) => d.label)
    .join(', ')

  if (isLoading) return <div className="empty-state">Cargando modalidades…</div>

  return (
    <RequirePermission permission="catalogos:get">
      <DataTable
        title="Modalidades"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Agregar modalidad"
        canAdd={can('catalogos:post')}
        onAdd={openCreate}
        exportFilename="modalidades"
        exportRows={data.map((m) => ({
          codigo: m.codigo,
          nombre: m.nombre,
          hora_inicio: m.hora_inicio,
          hora_fin: m.hora_fin,
          status: m.status,
        }))}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button type="button" className="ctx-menu__item" onClick={() => openEdit(ctx.row, true)}>
            Ver
          </button>
          <Can permission="catalogos:put">
            <button type="button" className="ctx-menu__item" onClick={() => openEdit(ctx.row)}>
              Editar
            </button>
          </Can>
          <Can permission="catalogos:delete">
            <button
              type="button"
              className="ctx-menu__item ctx-menu__item--danger"
              onClick={() => {
                setConfirmDelete(ctx.row)
                closeCtx()
              }}
            >
              Eliminar
            </button>
          </Can>
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        xl
        title={viewOnly ? 'Ver modalidad' : editing ? 'Editar modalidad' : 'Nueva modalidad'}
        onClose={closeModal}
        footer={
          viewOnly ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={closeModal}>
                Cerrar
              </button>
              {step > 0 ? (
                <button type="button" className="btn btn--ghost" onClick={goBack}>
                  Atrás
                </button>
              ) : null}
              {!lastStep ? (
                <button type="button" className="btn btn--primary" onClick={goNext}>
                  Siguiente
                </button>
              ) : null}
            </>
          ) : (
            <>
              <button type="button" className="btn btn--ghost" onClick={closeModal}>
                Cancelar
              </button>
              {step > 0 ? (
                <button type="button" className="btn btn--ghost" onClick={goBack} disabled={saveMut.isPending}>
                  Atrás
                </button>
              ) : null}
              {!lastStep ? (
                <button type="button" className="btn btn--primary" onClick={goNext}>
                  Siguiente
                </button>
              ) : (
                <Can permission={editing ? 'catalogos:put' : 'catalogos:post'}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={saveMut.isPending}
                    onClick={() => {
                      const err = validateStep(step)
                      if (err) {
                        toast.error(err)
                        return
                      }
                      setConfirmSave(true)
                    }}
                  >
                    {saveMut.isPending ? 'Guardando…' : 'Guardar'}
                  </button>
                </Can>
              )}
            </>
          )
        }
      >
        <WizardSteps steps={[...STEPS]} current={step} />

        {step === 0 ? (
          <div className="wizard-pane" key="datos">
            <p className="wizard-pane__title">Datos del turno</p>
            <p className="wizard-pane__hint">Nombre de la modalidad (ej. Mañana, Tarde).</p>
            <Field label="Nombre" htmlFor="modalidad-nombre">
              <input
                id="modalidad-nombre"
                className="field__input"
                data-testid="modalidad-nombre-input"
                disabled={viewOnly}
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="wizard-pane" key="horario">
            <p className="wizard-pane__title">Horario del día</p>
            <p className="wizard-pane__hint">Franja horaria en que corre este turno.</p>
            <div className="wizard-grid">
              <Field label="Hora inicio">
                <input
                  type="time"
                  className="field__input"
                  disabled={viewOnly}
                  value={form.hora_inicio}
                  onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                />
              </Field>
              <Field label="Hora fin">
                <input
                  type="time"
                  className="field__input"
                  disabled={viewOnly}
                  value={form.hora_fin}
                  onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wizard-pane" key="dias">
            <p className="wizard-pane__title">Días de clase</p>
            <p className="wizard-pane__hint">Marca los días en que aplica este turno.</p>
            <div className="day-toggle" role="group" aria-label="Días de clase">
              {DIAS.map(({ n, label }) => {
                const on = form.dias.includes(n)
                return (
                  <button
                    key={n}
                    type="button"
                    data-testid={`modalidad-dia-${n}`}
                    className={`day-toggle__btn${on ? ' day-toggle__btn--on' : ''}`}
                    aria-pressed={on}
                    disabled={viewOnly}
                    onClick={() => toggleDia(n)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="wizard-pane" key="periodo">
            <p className="wizard-pane__title">Duración del periodo</p>
            <p className="wizard-pane__hint">¿Cuántos meses dura un periodo académico en este turno?</p>
            <Field label="Duración del periodo (meses)" htmlFor="modalidad-periodo-meses">
              <input
                id="modalidad-periodo-meses"
                type="number"
                className="field__input"
                disabled={viewOnly}
                min={1}
                value={form.duracion_periodo_meses}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duracion_periodo_meses: Number(e.target.value) || 0 }))
                }
              />
            </Field>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="wizard-pane" key="parciales">
            <p className="wizard-pane__title">Parciales</p>
            <p className="wizard-pane__hint">Cuántos parciales hay por periodo y cuánto dura cada uno.</p>
            <div className="wizard-grid">
              <Field label="Parciales por periodo">
                <input
                  type="number"
                  className="field__input"
                  disabled={viewOnly}
                  min={1}
                  value={form.cantidad_parciales_por_periodo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cantidad_parciales_por_periodo: Number(e.target.value) || 0,
                    }))
                  }
                />
              </Field>
              <Field label="Duración de cada parcial (días)">
                <input
                  type="number"
                  className="field__input"
                  disabled={viewOnly}
                  min={1}
                  value={form.duracion_parcial_dias ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      duracion_parcial_dias: e.target.value === '' ? undefined : Number(e.target.value),
                    }))
                  }
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="wizard-pane" key="hora">
            <p className="wizard-pane__title">Hora clase</p>
            <p className="wizard-pane__hint">¿Cuántos minutos dura cada hora de clase?</p>
            <Field label="Duración hora clase (min)" htmlFor="modalidad-hora-clase">
              <input
                id="modalidad-hora-clase"
                type="number"
                className="field__input"
                disabled={viewOnly}
                min={1}
                value={form.duracion_hora_clase_minutos}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duracion_hora_clase_minutos: Number(e.target.value) || 0 }))
                }
              />
            </Field>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="wizard-pane" key="recreo">
            <p className="wizard-pane__title">Recreos</p>
            <p className="wizard-pane__hint">Cuánto dura cada recreo y cuántos hay.</p>
            <div className="wizard-grid">
              <Field label="Duración del recreo (min)">
                <input
                  type="number"
                  className="field__input"
                  disabled={viewOnly}
                  min={0}
                  value={form.duracion_recreo_minutos}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duracion_recreo_minutos: Number(e.target.value) || 0 }))
                  }
                />
              </Field>
              <Field label="Cantidad de recreos">
                <input
                  type="number"
                  className="field__input"
                  disabled={viewOnly}
                  min={0}
                  value={form.cantidad_recreos}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cantidad_recreos: Number(e.target.value) || 0 }))
                  }
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="wizard-pane" key="estado">
            <p className="wizard-pane__title">Estado</p>
            <p className="wizard-pane__hint">Define si la modalidad queda activa o inactiva.</p>
            <Field label="Estado">
              <Combobox
                disabled={viewOnly}
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                options={STATUS_OPTIONS}
                placeholder="Buscar estado…"
              />
            </Field>
            <div className="wizard-summary" style={{ marginTop: '1rem' }}>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Nombre</span>
                <span className="wizard-summary__value">{form.nombre || '—'}</span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Horario</span>
                <span className="wizard-summary__value">
                  {form.hora_inicio} – {form.hora_fin}
                </span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Días</span>
                <span className="wizard-summary__value">{diaLabels || '—'}</span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Periodo</span>
                <span className="wizard-summary__value">{form.duracion_periodo_meses} meses</span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Parciales</span>
                <span className="wizard-summary__value">
                  {form.cantidad_parciales_por_periodo}
                  {form.duracion_parcial_dias != null
                    ? ` × ${form.duracion_parcial_dias} días`
                    : ''}
                </span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Hora clase</span>
                <span className="wizard-summary__value">{form.duracion_hora_clase_minutos} min</span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Recreo</span>
                <span className="wizard-summary__value">
                  {form.cantidad_recreos} × {form.duracion_recreo_minutos} min
                </span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Estado</span>
                <span className="wizard-summary__value">{form.status || '—'}</span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar guardado"
        message="¿Guardar los datos de la modalidad?"
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar modalidad"
        message={`¿Eliminar "${confirmDelete?.nombre}"?`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </RequirePermission>
  )
}
