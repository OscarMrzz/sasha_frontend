import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AsignacionFormModal } from '#/components/asignacion/AsignacionFormModal'
import { CursoVerModal } from '#/components/catalogos/CursoVerModal'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  createCurso,
  deleteCurso,
  getCurso,
  listCursos,
  updateCurso,
  type Curso,
  type CursoCreate,
  type CursoTextoItem,
} from '#/services/catalogos'

export const Route = createFileRoute('/_app/catalogos/cursos')({ component: CursosPage })

const col = createColumnHelper<Curso>()
const defaultForm: CursoCreate = {
  nombre: '',
  horas_semana_minimas: 2,
  status: 'ACTIVE',
  prerrequisitos: [],
  objetivos_especificos: [],
  competencias: [],
  estrategias: [],
  actividades_evaluacion: [],
  recursos: [],
  bibliografia: [],
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

function TextListEditor({
  label,
  items,
  onChange,
}: {
  label: string
  items: CursoTextoItem[]
  onChange: (items: CursoTextoItem[]) => void
}) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div className="page-title-row" style={{ marginBottom: '0.35rem' }}>
        <strong>{label}</strong>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => onChange([...(items ?? []), { texto: '', orden: (items?.length ?? 0) + 1 }])}
        >
          +
        </button>
      </div>
      {(items ?? []).map((it, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.35rem' }}>
          <input
            className="field__input"
            value={it.texto}
            onChange={(e) => {
              const next = [...items]
              next[idx] = { ...next[idx], texto: e.target.value, orden: idx + 1 }
              onChange(next)
            }}
          />
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

function CursosPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['cursos'], queryFn: listCursos })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Curso | null>(null)
  const [form, setForm] = useState<CursoCreate>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<Curso | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Curso } | null>(null)
  const [verCurso, setVerCurso] = useState<Curso | null>(null)
  const [asignarCurso, setAsignarCurso] = useState<Curso | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const openCreate = () => {
    setEditing(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = async (row: Curso) => {
    closeCtx()
    try {
      const full = await getCurso(row.id)
      setEditing(full)
      setForm({
        nombre: full.nombre,
        horas_semana_minimas: full.horas_semana_minimas,
        status: full.status,
        codigo_sace: full.codigo_sace,
        detalles: full.detalles,
        carrera: full.carrera,
        unidades_academicas: full.unidades_academicas,
        horas_teoricas_semana: full.horas_teoricas_semana,
        horas_practicas_semana: full.horas_practicas_semana,
        horas_totales_periodo: full.horas_totales_periodo,
        objetivo_general: full.objetivo_general,
        prerrequisitos: full.prerrequisitos ?? [],
        objetivos_especificos: full.objetivos_especificos ?? [],
        competencias: full.competencias ?? [],
        estrategias: full.estrategias ?? [],
        actividades_evaluacion: full.actividades_evaluacion ?? [],
        recursos: full.recursos ?? [],
        bibliografia: full.bibliografia ?? [],
      })
      setModalOpen(true)
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const openVer = (row: Curso) => {
    setVerCurso(row)
    closeCtx()
  }

  const openAsignar = (row: Curso) => {
    setAsignarCurso(row)
    closeCtx()
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) return updateCurso(editing.id, form)
      return createCurso(form)
    },
    onSuccess: () => {
      toast.success(editing ? 'Curso actualizado' : 'Curso creado')
      qc.invalidateQueries({ queryKey: ['cursos'] })
      setModalOpen(false)
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCurso(id),
    onSuccess: () => {
      toast.success('Curso eliminado')
      qc.invalidateQueries({ queryKey: ['cursos'] })
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Código' }),
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('horas_semana_minimas', { header: 'Horas/semana' }),
      col.accessor('status', { header: 'Estado', cell: (i) => <span className="badge">{i.getValue()}</span> }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'nombre', label: 'Nombre', getValue: (r: Curso) => r.nombre },
      { id: 'status', label: 'Estado', getValue: (r: Curso) => r.status },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando cursos…</div>

  return (
    <RequirePermission permission="catalogos:get">
      <DataTable
        title="Cursos"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Agregar curso"
        canAdd={can('catalogos:post')}
        onAdd={openCreate}
        exportFilename="cursos"
        exportRows={data.map((c) => ({
          codigo: c.codigo,
          nombre: c.nombre,
          horas: c.horas_semana_minimas,
          status: c.status,
        }))}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button type="button" className="ctx-menu__item" onClick={() => openVer(ctx.row)}>
            Ver
          </button>
          <Can permission="asignacion:post">
            <button type="button" className="ctx-menu__item" onClick={() => openAsignar(ctx.row)}>
              Asignar maestro
            </button>
          </Can>
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
        title={editing ? 'Editar curso' : 'Nuevo curso'}
        xl
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <Can permission={editing ? 'catalogos:put' : 'catalogos:post'}>
              <button type="button" className="btn btn--primary" onClick={() => setConfirmSave(true)}>
                Guardar
              </button>
            </Can>
          </>
        }
      >
        <Field label="Nombre" htmlFor="curso-nombre">
          <input
            id="curso-nombre"
            className="field__input"
            data-testid="curso-nombre-input"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Field>
        <Field label="Carrera">
          <input
            className="field__input"
            value={form.carrera ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, carrera: e.target.value }))}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <Field label="Horas semana mínimas">
            <input
              type="number"
              className="field__input"
              value={form.horas_semana_minimas}
              onChange={(e) => setForm((f) => ({ ...f, horas_semana_minimas: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Unidades académicas">
            <input
              type="number"
              className="field__input"
              value={form.unidades_academicas ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  unidades_academicas: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="Horas teóricas/semana">
            <input
              type="number"
              className="field__input"
              value={form.horas_teoricas_semana ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  horas_teoricas_semana: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="Horas prácticas/semana">
            <input
              type="number"
              className="field__input"
              value={form.horas_practicas_semana ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  horas_practicas_semana: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
            />
          </Field>
        </div>
        <Field label="Estado">
          <Combobox
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={STATUS_OPTIONS}
            placeholder="Buscar estado…"
          />
        </Field>
        <Field label="Código SACE">
          <input
            className="field__input"
            value={form.codigo_sace ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, codigo_sace: e.target.value }))}
          />
        </Field>
        <Field label="Objetivo general">
          <textarea
            className="field__input"
            rows={3}
            value={form.objetivo_general ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, objetivo_general: e.target.value }))}
          />
        </Field>
        <TextListEditor
          label="Prerrequisitos"
          items={form.prerrequisitos ?? []}
          onChange={(prerrequisitos) => setForm((f) => ({ ...f, prerrequisitos }))}
        />
        <TextListEditor
          label="Objetivos específicos"
          items={form.objetivos_especificos ?? []}
          onChange={(objetivos_especificos) => setForm((f) => ({ ...f, objetivos_especificos }))}
        />
        <TextListEditor
          label="Competencias"
          items={form.competencias ?? []}
          onChange={(competencias) => setForm((f) => ({ ...f, competencias }))}
        />
        <TextListEditor
          label="Estrategias de enseñanza"
          items={form.estrategias ?? []}
          onChange={(estrategias) => setForm((f) => ({ ...f, estrategias }))}
        />
        <TextListEditor
          label="Actividades de evaluación"
          items={form.actividades_evaluacion ?? []}
          onChange={(actividades_evaluacion) => setForm((f) => ({ ...f, actividades_evaluacion }))}
        />
        <div style={{ marginBottom: '0.75rem' }}>
          <div className="page-title-row" style={{ marginBottom: '0.35rem' }}>
            <strong>Recursos</strong>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  recursos: [...(f.recursos ?? []), { tipo: 'didactico', texto: '', orden: (f.recursos?.length ?? 0) + 1 }],
                }))
              }
            >
              +
            </button>
          </div>
          {(form.recursos ?? []).map((r, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.35rem', marginBottom: '0.35rem' }}>
              <select
                className="field__input"
                value={r.tipo}
                onChange={(e) => {
                  const recursos = [...(form.recursos ?? [])]
                  recursos[idx] = { ...recursos[idx], tipo: e.target.value }
                  setForm((f) => ({ ...f, recursos }))
                }}
              >
                <option value="didactico">Didáctico</option>
                <option value="computacional">Computacional</option>
                <option value="bibliohemerografico">Bibliohemerográfico</option>
                <option value="espacio_fisico">Espacio físico</option>
              </select>
              <input
                className="field__input"
                value={r.texto}
                onChange={(e) => {
                  const recursos = [...(form.recursos ?? [])]
                  recursos[idx] = { ...recursos[idx], texto: e.target.value }
                  setForm((f) => ({ ...f, recursos }))
                }}
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() =>
                  setForm((f) => ({ ...f, recursos: (f.recursos ?? []).filter((_, i) => i !== idx) }))
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <div className="page-title-row" style={{ marginBottom: '0.35rem' }}>
            <strong>Bibliografía</strong>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  bibliografia: [
                    ...(f.bibliografia ?? []),
                    { tipo: 'principal', titulo: '', orden: (f.bibliografia?.length ?? 0) + 1 },
                  ],
                }))
              }
            >
              +
            </button>
          </div>
          {(form.bibliografia ?? []).map((b, idx) => (
            <div key={idx} style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
              <select
                className="field__input"
                value={b.tipo}
                onChange={(e) => {
                  const bibliografia = [...(form.bibliografia ?? [])]
                  bibliografia[idx] = { ...bibliografia[idx], tipo: e.target.value }
                  setForm((f) => ({ ...f, bibliografia }))
                }}
              >
                <option value="principal">Principal</option>
                <option value="complementaria">Complementaria</option>
              </select>
              <input
                className="field__input"
                placeholder="Título"
                value={b.titulo}
                onChange={(e) => {
                  const bibliografia = [...(form.bibliografia ?? [])]
                  bibliografia[idx] = { ...bibliografia[idx], titulo: e.target.value }
                  setForm((f) => ({ ...f, bibliografia }))
                }}
              />
              <input
                className="field__input"
                placeholder="Autor"
                value={b.autor ?? ''}
                onChange={(e) => {
                  const bibliografia = [...(form.bibliografia ?? [])]
                  bibliografia[idx] = { ...bibliografia[idx], autor: e.target.value }
                  setForm((f) => ({ ...f, bibliografia }))
                }}
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    bibliografia: (f.bibliografia ?? []).filter((_, i) => i !== idx),
                  }))
                }
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </Modal>

      <CursoVerModal
        open={Boolean(verCurso)}
        curso={verCurso}
        onClose={() => setVerCurso(null)}
        onAsignar={
          verCurso
            ? () => {
                setAsignarCurso(verCurso)
                setVerCurso(null)
              }
            : undefined
        }
      />

      <AsignacionFormModal
        open={Boolean(asignarCurso)}
        cursoId={asignarCurso?.id}
        cursoNombre={asignarCurso?.nombre}
        onClose={() => setAsignarCurso(null)}
      />

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar guardado"
        message="¿Guardar los datos del curso?"
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar curso"
        message={`¿Eliminar "${confirmDelete?.nombre}"?`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </RequirePermission>
  )
}
