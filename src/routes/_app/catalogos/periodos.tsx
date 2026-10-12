import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { ParcialesPeriodoForm } from '#/components/catalogos/ParcialesPeriodoForm'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  createPeriodo,
  deletePeriodo,
  listPeriodos,
  updatePeriodo,
} from '#/services/catalogos'
import type { ParcialForm, Periodo, PeriodoCreate } from '#/services/catalogos'
import { listContratos } from '#/services/contratos'
import { periodoEstadoPalabra } from '#/helpers/periodos'
import { derivarFechasPeriodo, validarParciales } from '#/helpers/parciales'
import { useAccionPalette } from '#/hooks/use-accion-palette'

export const Route = createFileRoute('/_app/catalogos/periodos')({ component: PeriodosPage })

const col = createColumnHelper<Periodo>()

const parcialVacio = (numero: number): ParcialForm => ({
  numero,
  fecha_inicio: '',
  fecha_fin: '',
  nota_maxima: 100,
})

const defaultForm: PeriodoCreate = {
  nombre: '',
  anio_lectivo: new Date().getFullYear(),
  status: 'INACTIVE',
  nota_minima: 70,
  honor_merito: 90,
  excelencia: 95,
  max_clases_reprobadas: 1,
  recuperaciones_periodo: 2,
  tope_recuperacion_parcial: 100,
  tope_recuperacion_periodo: 100,
  contrato_matricula_id: undefined,
  parciales: [parcialVacio(1)],
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'FINALIZED', label: 'Finalizado' },
]

const REGLAS: { key: keyof PeriodoCreate; label: string; testid: string; min: number; max: number }[] = [
  { key: 'nota_minima', label: 'Mínima aprobación', testid: 'periodo-nota-minima', min: 0, max: 100 },
  { key: 'honor_merito', label: 'Honor al mérito', testid: 'periodo-umbral-honor', min: 0, max: 100 },
  { key: 'excelencia', label: 'Excelencia', testid: 'periodo-umbral-excelencia', min: 0, max: 100 },
  { key: 'max_clases_reprobadas', label: 'Máximo de clases reprobadas para pasar', testid: 'periodo-max-reprobadas', min: 0, max: 50 },
  { key: 'recuperaciones_periodo', label: 'Recuperaciones de periodo', testid: 'periodo-recuperaciones', min: 0, max: 10 },
  { key: 'tope_recuperacion_parcial', label: 'Tope de nota en recuperación de parcial', testid: 'periodo-tope-parcial', min: 0, max: 100 },
  { key: 'tope_recuperacion_periodo', label: 'Tope de nota en recuperación de periodo', testid: 'periodo-tope-periodo', min: 0, max: 100 },
]

const snapshot = (form: PeriodoCreate) => JSON.stringify(form)

function PeriodosPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })
  const puedeVerContratos = can('contratos:get')
  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos', 'matricula'],
    queryFn: () => listContratos({ tipo: 'matricula' }),
    enabled: puedeVerContratos,
  })
  const contratoOptions = useMemo(
    () => [
      { value: '', label: 'Sin contrato' },
      ...contratos.map((c) => ({
        value: c.id,
        label: c.titulo,
        keywords: c.titulo,
      })),
    ],
    [contratos],
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [viewOnly, setViewOnly] = useState(false)
  const [editing, setEditing] = useState<Periodo | null>(null)
  const [form, setForm] = useState<PeriodoCreate>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Periodo | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Periodo } | null>(null)
  const [baseline, setBaseline] = useState('')

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const abrirForm = (next: PeriodoCreate) => {
    setForm(next)
    setBaseline(snapshot(next))
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setViewOnly(false)
    abrirForm({ ...defaultForm, parciales: [parcialVacio(1)] })
  }

  useAccionPalette('nuevo-periodo', openCreate)

  const openEdit = (row: Periodo, view = false) => {
    setEditing(row)
    setViewOnly(view)
    const parciales: ParcialForm[] =
      row.parciales.length > 0
        ? row.parciales
            .slice()
            .sort((a, b) => a.numero - b.numero)
            .map((p) => ({
              numero: p.numero,
              fecha_inicio: p.fecha_inicio.slice(0, 10),
              fecha_fin: p.fecha_fin.slice(0, 10),
              nota_maxima: p.nota_maxima,
            }))
        : [parcialVacio(1)]
    abrirForm({
      nombre: row.nombre,
      anio_lectivo: row.anio_lectivo,
      status: row.status,
      nota_minima: row.nota_minima,
      honor_merito: row.honor_merito,
      excelencia: row.excelencia,
      max_clases_reprobadas: row.max_clases_reprobadas,
      recuperaciones_periodo: row.recuperaciones_periodo,
      tope_recuperacion_parcial: row.tope_recuperacion_parcial,
      tope_recuperacion_periodo: row.tope_recuperacion_periodo,
      contrato_matricula_id: row.contrato_matricula_id ?? '',
      parciales,
    })
    closeCtx()
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: PeriodoCreate = {
        ...form,
        contrato_matricula_id: form.contrato_matricula_id
          ? form.contrato_matricula_id
          : undefined,
      }
      if (editing) return updatePeriodo(editing.id, payload)
      return createPeriodo(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Periodo actualizado' : 'Periodo creado')
      qc.invalidateQueries({ queryKey: ['periodos'] })
      setModalOpen(false)
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePeriodo(id),
    onSuccess: () => {
      toast.success('Periodo eliminado')
      qc.invalidateQueries({ queryKey: ['periodos'] })
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const nombreError = form.nombre.trim() ? '' : 'Escribe el nombre del periodo.'
  const error = nombreError || validarParciales(form.parciales)
  const fechas = derivarFechasPeriodo(form.parciales)
  const dirty = snapshot(form) !== baseline

  const columns = useMemo(
    () => [
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('anio_lectivo', { header: 'Año lectivo' }),
      col.accessor('fecha_inicio', {
        header: 'Inicio',
        cell: (i) => String(i.getValue()).slice(0, 10),
      }),
      col.accessor('fecha_fin', {
        header: 'Fin',
        cell: (i) => String(i.getValue()).slice(0, 10),
      }),
      col.accessor('status', {
        header: 'Estado',
        cell: (i) => {
          const v = String(i.getValue())
          const cls = v === 'ACTIVE' ? '' : v === 'FINALIZED' ? ' badge--warn' : ' badge--muted'
          return (
            <span className={`badge${cls}`}>
              {periodoEstadoPalabra(String(i.getValue()))}
            </span>
          )
        },
      }),
      col.accessor('contrato_matricula_titulo', {
        header: 'Contrato',
        cell: (i) => i.getValue() ?? '—',
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'nombre', label: 'Nombre', getValue: (r: Periodo) => r.nombre },
      { id: 'anio_lectivo', label: 'Año lectivo', getValue: (r: Periodo) => String(r.anio_lectivo) },
      {
        id: 'status',
        label: 'Estado',
        getValue: (r: Periodo) => r.status,
        getLabel: (r: Periodo) => periodoEstadoPalabra(r.status),
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando periodos…</div>

  return (
    <RequirePermission permission="catalogos:get">
      <DataTable
        title="Periodos académicos"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Agregar periodo"
        canAdd={can('catalogos:post')}
        onAdd={openCreate}
        exportFilename="periodos"
        exportRows={data.map((p) => ({
          nombre: p.nombre,
          anio: p.anio_lectivo,
          inicio: p.fecha_inicio,
          fin: p.fecha_fin,
          status: p.status,
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
        title={viewOnly ? 'Ver periodo' : editing ? 'Editar periodo' : 'Nuevo periodo'}
        onClose={() => setModalOpen(false)}
        footer={
          viewOnly ? (
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              Cerrar
            </button>
          ) : (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <Can permission={editing ? 'catalogos:put' : 'catalogos:post'}>
                <button
                  type="button"
                  className="btn btn--primary"
                  data-testid="periodo-save-button"
                  disabled={Boolean(error) || !dirty || saveMut.isPending}
                  onClick={() => setConfirmSave(true)}
                >
                  Guardar
                </button>
              </Can>
            </>
          )
        }
      >
        <section className="expediente__seccion">
          <h3 className="expediente__titulo">Datos generales</h3>
          <Field label="Nombre" htmlFor="periodo-nombre">
          <input
            id="periodo-nombre"
            className="field__input"
            data-testid="periodo-nombre-input"
            disabled={viewOnly}
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Field>
        <Field label="Año lectivo">
          <input
            type="number"
            className="field__input"
            disabled={viewOnly}
            value={form.anio_lectivo}
            onChange={(e) => setForm((f) => ({ ...f, anio_lectivo: Number(e.target.value) }))}
          />
        </Field>
        <div className="periodo-fechas-derivadas" data-testid="periodo-fechas-derivadas">
          <div className="periodo-fechas-derivadas__item">
            <span className="field__label">Inicio del primer parcial</span>
            <p className="periodo-fechas-derivadas__valor">{fechas.fecha_inicio || '—'}</p>
          </div>
          <div className="periodo-fechas-derivadas__item">
            <span className="field__label">Fin del último parcial</span>
            <p className="periodo-fechas-derivadas__valor">{fechas.fecha_fin || '—'}</p>
          </div>
        </div>
        <Field label="Estado">
          <Combobox
            disabled={viewOnly}
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={STATUS_OPTIONS}
            placeholder="Buscar estado…"
          />
        </Field>
        <Can permission="contratos:get">
          <Field label="Contrato de matrícula" htmlFor="periodo-contrato-matricula">
            <Combobox
              id="periodo-contrato-matricula"
              data-testid="periodo-contrato-matricula"
              disabled={viewOnly}
              value={form.contrato_matricula_id ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, contrato_matricula_id: v }))}
              options={contratoOptions}
              placeholder="Seleccionar contrato…"
              emptyLabel="No hay contratos de matrícula"
            />
          </Field>
        </Can>
        </section>
        <fieldset className="periodo-reglas" data-testid="periodo-reglas">
          <legend className="periodo-reglas__titulo">Promoción y recuperaciones</legend>
          <div className="periodo-reglas__grid">
            {REGLAS.map((r) => (
              <Field key={r.key} label={r.label}>
                <input
                  type="number"
                  className="field__input"
                  data-testid={r.testid}
                  min={r.min}
                  max={r.max}
                  disabled={viewOnly}
                  value={(form[r.key] as number | undefined) ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [r.key]: e.target.value === '' ? undefined : Number(e.target.value) }))
                  }
                />
              </Field>
            ))}
          </div>
        </fieldset>
        <ParcialesPeriodoForm
          value={form.parciales}
          onChange={(parciales) => setForm((f) => ({ ...f, parciales }))}
          disabled={viewOnly}
        />
        {error ? (
          <p className="field__error" data-testid="periodo-form-error">
            {error}
          </p>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar guardado"
        message={
          form.status === 'FINALIZED' && editing?.status !== 'FINALIZED'
            ? '¿Finalizar el periodo? Se calculará el resultado final y nadie podrá cambiar recuperaciones hasta que se vuelva a activar.'
            : form.status === 'ACTIVE'
              ? '¿Guardar el periodo como activo? Si había otro activo, pasará a inactivo.'
              : '¿Guardar los datos del periodo?'
        }
        confirmDisabled={saveMut.isPending}
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar periodo"
        message={`¿Eliminar "${confirmDelete?.nombre}"?`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </RequirePermission>
  )
}
