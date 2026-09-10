import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { useSession } from '#/hooks/use-session'
import { userMessageFromError } from '#/lib/api'
import { listPeriodos } from '#/services/catalogos'
import {
  getNotas,
  liberarCalificaciones,
  upsertCalificacion,
  type CalificacionUpsert,
  type LiberacionCreate,
} from '#/services/calificaciones'

export const Route = createFileRoute('/_app/calificaciones')({ component: CalificacionesPage })

const col = createColumnHelper<{
  alumno_id: string
  curso_id?: string
  promedio?: number
  indicador_nivel?: string
  liberado: boolean
  bloqueado_mora?: boolean
}>()

function CalificacionesPage() {
  const { session } = useSession()
  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })

  const [tab, setTab] = useState<'upsert' | 'liberacion' | 'notas'>('upsert')
  const [confirmSave, setConfirmSave] = useState(false)
  const [pendingAction, setPendingAction] = useState<'upsert' | 'liberacion'>('upsert')

  const [upsertForm, setUpsertForm] = useState<CalificacionUpsert>({
    alumno_id: '',
    matricula_id: '',
    curso_id: '',
    parcial_id: '',
    puntos: [0, 0, 0],
  })

  const [libForm, setLibForm] = useState<LiberacionCreate>({
    periodo_academico_id: '',
    liberado_por_user_id: '',
    alcance: 'periodo',
  })

  const [notasAlumno, setNotasAlumno] = useState('')
  const [notasPeriodo, setNotasPeriodo] = useState('')
  const [notasSearch, setNotasSearch] = useState({ alumno: '', periodo: '' })

  const { data: notas = [], refetch: refetchNotas } = useQuery({
    queryKey: ['notas', notasSearch.alumno, notasSearch.periodo],
    queryFn: () => getNotas(notasSearch.alumno, notasSearch.periodo),
    enabled: Boolean(notasSearch.alumno && notasSearch.periodo),
  })

  const upsertMut = useMutation({
    mutationFn: () => upsertCalificacion(upsertForm),
    onSuccess: (r) => {
      toast.success(r.mensaje ?? `Promedio: ${r.promedio}`)
      if (r.warning_mora) toast.warning('Advertencia por mora')
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const liberarMut = useMutation({
    mutationFn: () => liberarCalificaciones(libForm),
    onSuccess: () => {
      toast.success('Calificaciones liberadas')
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const notasColumns = useMemo(
    () => [
      col.accessor('curso_id', { header: 'Curso', cell: (i) => i.getValue()?.slice(0, 8) ?? '—' }),
      col.accessor('promedio', { header: 'Promedio', cell: (i) => i.getValue() ?? '—' }),
      col.accessor('indicador_nivel', { header: 'Nivel', cell: (i) => i.getValue() ?? '—' }),
      col.accessor('liberado', { header: 'Liberado', cell: (i) => (i.getValue() ? 'Sí' : 'No') }),
      col.accessor('bloqueado_mora', {
        header: 'Mora',
        cell: (i) => (i.getValue() ? 'Bloqueado' : '—'),
      }),
    ],
    [],
  )

  const notasFilters = useMemo(
    () => [
      {
        id: 'liberado',
        label: 'Liberado',
        getValue: (r: { liberado: boolean }) => (r.liberado ? 'Sí' : 'No'),
      },
    ],
    [],
  )

  return (
    <RequirePermission permission="calificaciones:get">
      <h1 className="page-title">Calificaciones</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['upsert', 'liberacion', 'notas'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`btn ${tab === t ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setTab(t)}
          >
            {t === 'upsert' ? 'Registrar nota' : t === 'liberacion' ? 'Liberación' : 'Consultar notas'}
          </button>
        ))}
      </div>

      {tab === 'upsert' ? (
        <div
          style={{
            maxWidth: 560,
            background: 'var(--sasha-bg-raised)',
            border: '1px solid var(--sasha-border-suave)',
            borderRadius: '8px',
            padding: '1.25rem',
          }}
        >
          <Field label="Alumno ID">
            <input
              className="field__input"
              data-testid="calif-alumno-input"
              value={upsertForm.alumno_id}
              onChange={(e) => setUpsertForm((f) => ({ ...f, alumno_id: e.target.value }))}
            />
          </Field>
          <Field label="Matrícula ID">
            <input
              className="field__input"
              value={upsertForm.matricula_id}
              onChange={(e) => setUpsertForm((f) => ({ ...f, matricula_id: e.target.value }))}
            />
          </Field>
          <Field label="Curso ID">
            <input
              className="field__input"
              value={upsertForm.curso_id}
              onChange={(e) => setUpsertForm((f) => ({ ...f, curso_id: e.target.value }))}
            />
          </Field>
          <Field label="Parcial ID">
            <input
              className="field__input"
              value={upsertForm.parcial_id}
              onChange={(e) => setUpsertForm((f) => ({ ...f, parcial_id: e.target.value }))}
            />
          </Field>
          <Field label="Puntos (separados por coma)">
            <input
              className="field__input"
              placeholder="80, 85, 90"
              onChange={(e) =>
                setUpsertForm((f) => ({
                  ...f,
                  puntos: e.target.value.split(',').map((n) => Number(n.trim()) || 0),
                }))
              }
            />
          </Field>
          <Can permission="calificaciones:post">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="calif-upsert-button"
              onClick={() => {
                setPendingAction('upsert')
                setConfirmSave(true)
              }}
            >
              Guardar calificación
            </button>
          </Can>
        </div>
      ) : null}

      {tab === 'liberacion' ? (
        <div
          style={{
            maxWidth: 560,
            background: 'var(--sasha-bg-raised)',
            border: '1px solid var(--sasha-border-suave)',
            borderRadius: '8px',
            padding: '1.25rem',
          }}
        >
          <Field label="Periodo académico">
            <Combobox
              value={libForm.periodo_academico_id}
              onChange={(v) => setLibForm((f) => ({ ...f, periodo_academico_id: v }))}
              options={periodos.map((p) => ({ value: p.id, label: p.nombre }))}
              placeholder="Buscar periodo…"
            />
          </Field>
          <Field label="Alcance">
            <Combobox
              value={libForm.alcance ?? 'periodo'}
              onChange={(v) => setLibForm((f) => ({ ...f, alcance: v }))}
              options={[
                { value: 'periodo', label: 'Periodo completo' },
                { value: 'grado', label: 'Por grado' },
                { value: 'seccion', label: 'Por sección' },
              ]}
              placeholder="Buscar alcance…"
            />
          </Field>
          <Field label="Liberado por (user ID)">
            <input
              className="field__input"
              value={libForm.liberado_por_user_id}
              onChange={(e) => setLibForm((f) => ({ ...f, liberado_por_user_id: e.target.value }))}
              placeholder={session?.code ?? 'UUID'}
            />
          </Field>
          <Can permission="calificaciones:put">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="calif-liberar-button"
              onClick={() => {
                setPendingAction('liberacion')
                setConfirmSave(true)
              }}
            >
              Liberar calificaciones
            </button>
          </Can>
        </div>
      ) : null}

      {tab === 'notas' ? (
        <>
          <div className="panel-toolbar" style={{ maxWidth: 720 }}>
            <Field label="Alumno ID">
              <input
                className="field__input"
                value={notasAlumno}
                onChange={(e) => setNotasAlumno(e.target.value)}
              />
            </Field>
            <Field label="Periodo académico">
              <Combobox
                value={notasPeriodo}
                onChange={setNotasPeriodo}
                options={periodos.map((p) => ({ value: p.id, label: p.nombre }))}
                placeholder="Buscar periodo…"
              />
            </Field>
            <button
              type="button"
              className="btn btn--ghost"
              data-testid="calif-notas-search"
              onClick={() => {
                setNotasSearch({ alumno: notasAlumno, periodo: notasPeriodo })
                refetchNotas()
              }}
            >
              Consultar
            </button>
          </div>
          {notasSearch.alumno && notasSearch.periodo ? (
            <DataTable data={notas} columns={notasColumns} filters={notasFilters} />
          ) : (
            <div className="empty-state">Indica alumno y periodo para consultar notas.</div>
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={confirmSave}
        title={pendingAction === 'upsert' ? 'Guardar calificación' : 'Liberar calificaciones'}
        message={
          pendingAction === 'upsert'
            ? '¿Confirmas el registro de esta calificación?'
            : '¿Liberar calificaciones con los filtros indicados?'
        }
        onConfirm={() => (pendingAction === 'upsert' ? upsertMut.mutate() : liberarMut.mutate())}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
