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
import { listPeriodos, listSecciones } from '#/services/catalogos'
import {
  createMatricula,
  getSugerencia,
  listMatriculas,
  reingreso,
  type Matricula,
  type MatriculaCreate,
  type SugerenciaResponse,
} from '#/services/matricula'

export const Route = createFileRoute('/_app/matricula')({ component: MatriculaPage })

const col = createColumnHelper<Matricula>()

function MatriculaPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['matriculas'], queryFn: listMatriculas })
  const { data: secciones = [] } = useQuery({ queryKey: ['secciones'], queryFn: listSecciones })
  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })

  const [createOpen, setCreateOpen] = useState(false)
  const [reingresoOpen, setReingresoOpen] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [mode, setMode] = useState<'create' | 'reingreso'>('create')
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Matricula } | null>(null)

  const [createForm, setCreateForm] = useState<MatriculaCreate>({
    alumno_id: '',
    periodo_academico_id: '',
    seccion_id: '',
    generar_mensualidad: true,
  })

  const [reingresoCode, setReingresoCode] = useState('')
  const [sugerencia, setSugerencia] = useState<SugerenciaResponse | null>(null)
  const [reingresoPeriodo, setReingresoPeriodo] = useState('')
  const [reingresoSeccion, setReingresoSeccion] = useState('')

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const createMut = useMutation({
    mutationFn: () => createMatricula(createForm),
    onSuccess: () => {
      toast.success('Matrícula creada')
      qc.invalidateQueries({ queryKey: ['matriculas'] })
      setCreateOpen(false)
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const reingresoMut = useMutation({
    mutationFn: () =>
      reingreso({
        user_code: reingresoCode,
        periodo_academico_id: reingresoPeriodo,
        seccion_id: reingresoSeccion,
        generar_mensualidad: true,
      }),
    onSuccess: () => {
      toast.success('Reingreso registrado')
      qc.invalidateQueries({ queryKey: ['matriculas'] })
      setReingresoOpen(false)
      setConfirmSave(false)
      setSugerencia(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const buscarSugerencia = async () => {
    if (!reingresoCode.trim()) return
    try {
      const s = await getSugerencia(reingresoCode)
      setSugerencia(s)
      if (s.grado_sugerido) toast.info(s.mensaje ?? 'Sugerencia cargada')
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const columns = useMemo(
    () => [
      col.accessor('alumno_code', {
        header: 'Alumno',
        cell: (i) => i.getValue() ?? i.row.original.alumno_id,
      }),
      col.accessor('grado_nombre', { header: 'Grado', cell: (i) => i.getValue() ?? '—' }),
      col.accessor('seccion_id', {
        header: 'Sección',
        cell: (i) => secciones.find((s) => s.id === i.getValue())?.nombre ?? i.getValue(),
      }),
      col.accessor('es_reingreso', {
        header: 'Reingreso',
        cell: (i) => (i.getValue() ? 'Sí' : 'No'),
      }),
      col.accessor('status', { header: 'Estado', cell: (i) => <span className="badge">{i.getValue()}</span> }),
    ],
    [secciones],
  )

  if (isLoading) return <div className="empty-state">Cargando matrículas…</div>

  return (
    <RequirePermission permission="matricula:get">
      <h1 className="page-title">Matrícula</h1>
      <DataTable
        data={data}
        columns={columns}
        addLabel="Nueva matrícula"
        canAdd={can('matricula:post')}
        onAdd={() => {
          setMode('create')
          setCreateOpen(true)
        }}
        toolbarExtra={
          <Can permission="matricula:post">
            <button
              type="button"
              className="btn btn--ghost"
              data-testid="reingreso-button"
              onClick={() => {
                setReingresoOpen(true)
                setSugerencia(null)
              }}
            >
              Reingreso
            </button>
          </Can>
        }
        onExport={() =>
          downloadCsv(
            'matriculas.csv',
            data.map((m) => ({
              alumno: m.alumno_code ?? m.alumno_id,
              grado: m.grado_nombre,
              reingreso: m.es_reingreso,
              status: m.status,
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
              toast.info(`Matrícula ${ctx.row.id}`)
              closeCtx()
            }}
          >
            Ver
          </button>
        </div>
      ) : null}

      <Modal
        open={createOpen}
        title="Nueva matrícula"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </button>
            <Can permission="matricula:post">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setMode('create')
                  setConfirmSave(true)
                }}
              >
                Guardar
              </button>
            </Can>
          </>
        }
      >
        <Field label="Alumno ID" htmlFor="mat-alumno">
          <input
            id="mat-alumno"
            className="field__input"
            data-testid="matricula-alumno-input"
            value={createForm.alumno_id}
            onChange={(e) => setCreateForm((f) => ({ ...f, alumno_id: e.target.value }))}
          />
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
        <Field label="Sección">
          <select
            className="field__select"
            value={createForm.seccion_id}
            onChange={(e) => setCreateForm((f) => ({ ...f, seccion_id: e.target.value }))}
          >
            <option value="">Seleccionar…</option>
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </Field>
        <label style={{ fontSize: '0.85rem' }}>
          <input
            type="checkbox"
            checked={createForm.generar_mensualidad ?? false}
            onChange={(e) => setCreateForm((f) => ({ ...f, generar_mensualidad: e.target.checked }))}
          />{' '}
          Generar mensualidad
        </label>
      </Modal>

      <Modal
        open={reingresoOpen}
        title="Reingreso"
        wide
        onClose={() => setReingresoOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setReingresoOpen(false)}>
              Cancelar
            </button>
            <Can permission="matricula:post">
              <button
                type="button"
                className="btn btn--primary"
                data-testid="reingreso-confirm-button"
                onClick={() => {
                  setMode('reingreso')
                  setConfirmSave(true)
                }}
              >
                Confirmar reingreso
              </button>
            </Can>
          </>
        }
      >
        <Field label="Código de alumno">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="field__input"
              data-testid="reingreso-code-input"
              value={reingresoCode}
              onChange={(e) => setReingresoCode(e.target.value)}
            />
            <button type="button" className="btn btn--ghost" onClick={buscarSugerencia}>
              Sugerencia
            </button>
          </div>
        </Field>
        {sugerencia ? (
          <div
            style={{
              padding: '0.75rem',
              background: 'var(--sasha-bg-muted)',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
            data-testid="reingreso-sugerencia"
          >
            <p style={{ margin: '0 0 0.35rem' }}>
              <strong>Grado actual:</strong> {sugerencia.grado_actual?.nombre ?? '—'}
            </p>
            <p style={{ margin: '0 0 0.35rem' }}>
              <strong>Grado sugerido:</strong> {sugerencia.grado_sugerido?.nombre ?? '—'}
            </p>
            {sugerencia.mensaje ? <p className="texto-muted" style={{ margin: 0 }}>{sugerencia.mensaje}</p> : null}
          </div>
        ) : null}
        <Field label="Periodo académico">
          <select
            className="field__select"
            value={reingresoPeriodo}
            onChange={(e) => setReingresoPeriodo(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sección">
          <select
            className="field__select"
            value={reingresoSeccion}
            onChange={(e) => setReingresoSeccion(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title={mode === 'create' ? 'Crear matrícula' : 'Confirmar reingreso'}
        message={
          mode === 'create'
            ? '¿Registrar esta matrícula?'
            : `¿Confirmar reingreso del alumno ${reingresoCode}?`
        }
        onConfirm={() => (mode === 'create' ? createMut.mutate() : reingresoMut.mutate())}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
