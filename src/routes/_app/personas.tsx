import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  createAlumno,
  createMaestro,
  createResponsable,
  listAlumnos,
  listMaestros,
  listResponsables,
  type Alumno,
  type Maestro,
  type PersonaCreate,
  type Responsable,
} from '#/services/personas'

export const Route = createFileRoute('/_app/personas')({ component: PersonasPage })

type Tab = 'alumnos' | 'maestros' | 'responsables'
type PersonaRow = Alumno | Maestro | Responsable

const col = createColumnHelper<PersonaRow>()

const defaultForm: PersonaCreate = {
  user_id: '',
  primer_nombre: '',
  primer_apellido: '',
  status: 'ACTIVE',
}

function PersonasPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('alumnos')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<PersonaCreate>(defaultForm)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: PersonaRow } | null>(null)

  const { data: alumnos = [], isLoading: la } = useQuery({ queryKey: ['alumnos'], queryFn: listAlumnos })
  const { data: maestros = [], isLoading: lm } = useQuery({ queryKey: ['maestros'], queryFn: listMaestros })
  const { data: responsables = [], isLoading: lr } = useQuery({
    queryKey: ['responsables'],
    queryFn: listResponsables,
  })

  const data: PersonaRow[] = tab === 'alumnos' ? alumnos : tab === 'maestros' ? maestros : responsables
  const isLoading = la || lm || lr

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const createMut = useMutation({
    mutationFn: async () => {
      if (tab === 'alumnos') return createAlumno(form)
      if (tab === 'maestros') return createMaestro(form)
      return createResponsable(form)
    },
    onSuccess: () => {
      toast.success('Persona creada')
      qc.invalidateQueries({ queryKey: [tab] })
      setModalOpen(false)
      setConfirmSave(false)
      setForm(defaultForm)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('user_code', { header: 'Código usuario', cell: (i) => i.getValue() ?? '—' }),
      col.accessor('status', { header: 'Estado', cell: (i) => <span className="badge">{i.getValue()}</span> }),
    ],
    [],
  )

  const tabLabel = { alumnos: 'Alumnos', maestros: 'Maestros', responsables: 'Responsables' }

  return (
    <RequirePermission permission="personas:get">
      <h1 className="page-title">Personas</h1>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['alumnos', 'maestros', 'responsables'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`btn ${tab === t ? 'btn--primary' : 'btn--ghost'}`}
            data-testid={`personas-tab-${t}`}
            onClick={() => setTab(t)}
          >
            {tabLabel[t]}
          </button>
        ))}
        <Can permission="personas:post">
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginLeft: 'auto' }}
            data-testid="add-persona-button"
            onClick={() => {
              setForm(defaultForm)
              setModalOpen(true)
            }}
          >
            Crear {tabLabel[tab].slice(0, -1).toLowerCase()}
          </button>
        </Can>
      </div>

      {isLoading ? (
        <div className="empty-state">Cargando…</div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      )}

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button
            type="button"
            className="ctx-menu__item"
            onClick={() => {
              toast.info(`${ctx.row.nombre} · ${ctx.row.user_code ?? ctx.row.user_id}`)
              closeCtx()
            }}
          >
            Ver
          </button>
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        title={`Nuevo ${tabLabel[tab].slice(0, -1).toLowerCase()}`}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <Can permission="personas:post">
              <button type="button" className="btn btn--primary" onClick={() => setConfirmSave(true)}>
                Guardar
              </button>
            </Can>
          </>
        }
      >
        <Field label="User ID (UUID)" htmlFor="persona-user-id">
          <input
            id="persona-user-id"
            className="field__input"
            data-testid="persona-user-id-input"
            value={form.user_id}
            onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
            placeholder="00000000-0000-0000-0000-000000000000"
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Primer nombre">
            <input
              className="field__input"
              data-testid="persona-primer-nombre-input"
              value={form.primer_nombre}
              onChange={(e) => setForm((f) => ({ ...f, primer_nombre: e.target.value }))}
            />
          </Field>
          <Field label="Segundo nombre">
            <input
              className="field__input"
              value={form.segundo_nombre ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, segundo_nombre: e.target.value }))}
            />
          </Field>
          <Field label="Primer apellido">
            <input
              className="field__input"
              value={form.primer_apellido}
              onChange={(e) => setForm((f) => ({ ...f, primer_apellido: e.target.value }))}
            />
          </Field>
          <Field label="Segundo apellido">
            <input
              className="field__input"
              value={form.segundo_apellido ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, segundo_apellido: e.target.value }))}
            />
          </Field>
        </div>
        <Field label="Estado">
          <select
            className="field__select"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </Field>
        {tab === 'maestros' ? (
          <Field label="Profesión">
            <input
              className="field__input"
              value={form.profesion ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, profesion: e.target.value }))}
            />
          </Field>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Crear persona"
        message="¿Confirmas la creación de esta persona?"
        onConfirm={() => createMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
