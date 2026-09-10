import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MatriculaWizard } from '#/components/matricula/MatriculaWizard'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { downloadCsv } from '#/helpers/export-csv'
import { userMessageFromError } from '#/lib/api'
import {
  listCursos,
  listGrados,
  listModalidades,
  listPeriodos,
  listSecciones,
} from '#/services/catalogos'
import {
  getSugerencia,
  listMatriculas,
  reingreso,
  type Matricula,
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
  const { data: grados = [] } = useQuery({ queryKey: ['grados'], queryFn: listGrados })
  const { data: modalidades = [] } = useQuery({ queryKey: ['modalidades'], queryFn: listModalidades })
  const { data: cursos = [] } = useQuery({ queryKey: ['cursos'], queryFn: listCursos })

  const [createOpen, setCreateOpen] = useState(false)
  const [reingresoOpen, setReingresoOpen] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Matricula } | null>(null)

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

  const tableFilters = useMemo(
    () => [
      { id: 'grado_nombre', label: 'Grado', getValue: (r: Matricula) => r.grado_nombre ?? '' },
      { id: 'status', label: 'Estado', getValue: (r: Matricula) => r.status },
      {
        id: 'es_reingreso',
        label: 'Reingreso',
        getValue: (r: Matricula) => (r.es_reingreso ? 'Sí' : 'No'),
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando matrículas…</div>

  return (
    <RequirePermission permission="matricula:get">
      <DataTable
        title="Matrícula"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Nueva matrícula"
        canAdd={can('matricula:post')}
        onAdd={() => setCreateOpen(true)}
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

      <MatriculaWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ['matriculas'] })
          qc.invalidateQueries({ queryKey: ['alumnos'] })
          qc.invalidateQueries({ queryKey: ['responsables'] })
          qc.invalidateQueries({ queryKey: ['users'] })
        }}
        periodos={periodos}
        secciones={secciones}
        grados={grados}
        modalidades={modalidades}
        cursos={cursos}
      />

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
                onClick={() => setConfirmSave(true)}
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
        <Field label="Periodo académico" htmlFor="reingreso-periodo">
          <Combobox
            id="reingreso-periodo"
            value={reingresoPeriodo}
            onChange={setReingresoPeriodo}
            options={periodos.map((p) => ({
              value: p.id,
              label: p.nombre,
              keywords: String(p.anio_lectivo),
            }))}
            placeholder="Buscar periodo…"
          />
        </Field>
        <Field label="Sección" htmlFor="reingreso-seccion">
          <Combobox
            id="reingreso-seccion"
            value={reingresoSeccion}
            onChange={setReingresoSeccion}
            options={secciones.map((s) => {
              const g = grados.find((x) => x.id === s.grado_id)
              const m = modalidades.find((x) => x.id === s.modalidad_id)
              return {
                value: s.id,
                label: [g?.nombre, m?.nombre, s.nombre].filter(Boolean).join(' · '),
                keywords: s.codigo,
              }
            })}
            placeholder="Buscar sección…"
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar reingreso"
        message={`¿Confirmar reingreso del alumno ${reingresoCode}?`}
        onConfirm={() => reingresoMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
