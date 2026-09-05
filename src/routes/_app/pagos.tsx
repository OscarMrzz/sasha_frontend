import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { downloadCsv } from '#/helpers/export-csv'
import { userMessageFromError } from '#/lib/api'
import {
  cobro,
  evidencia,
  listMora,
  verificarPago,
  type CobroRequest,
  type EvidenciaRequest,
  type Obligacion,
} from '#/services/pagos'

export const Route = createFileRoute('/_app/pagos')({ component: PagosPage })

const col = createColumnHelper<Obligacion>()

function PagosPage() {
  const qc = useQueryClient()
  const { data: mora = [], isLoading } = useQuery({ queryKey: ['mora'], queryFn: listMora })

  const [tab, setTab] = useState<'cobro' | 'evidencia' | 'mora'>('cobro')
  const [confirmSave, setConfirmSave] = useState(false)
  const [action, setAction] = useState<'cobro' | 'evidencia' | 'verificar'>('cobro')
  const [verificarId, setVerificarId] = useState('')

  const [cobroForm, setCobroForm] = useState<CobroRequest>({
    alumno_code: '',
    monto: 0,
    tipo_pago_codigo: 'mensualidad',
  })

  const [evidenciaForm, setEvidenciaForm] = useState<EvidenciaRequest>({
    pago_id: '',
    object_key: '',
  })

  const cobroMut = useMutation({
    mutationFn: () => cobro(cobroForm),
    onSuccess: (p) => {
      toast.success(`Cobro registrado: ${p.id}`)
      setConfirmSave(false)
      qc.invalidateQueries({ queryKey: ['mora'] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const evidenciaMut = useMutation({
    mutationFn: () => evidencia(evidenciaForm),
    onSuccess: () => {
      toast.success('Evidencia adjuntada')
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const verificarMut = useMutation({
    mutationFn: (id: string) => verificarPago(id),
    onSuccess: () => {
      toast.success('Pago verificado')
      setConfirmSave(false)
      qc.invalidateQueries({ queryKey: ['mora'] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const moraColumns = useMemo(
    () => [
      col.accessor('tipo_pago_codigo', { header: 'Tipo' }),
      col.accessor('monto', { header: 'Monto' }),
      col.accessor('fecha_vencimiento', {
        header: 'Vencimiento',
        cell: (i) => String(i.getValue()).slice(0, 10),
      }),
      col.accessor('estado', { header: 'Estado', cell: (i) => <span className="badge badge--warn">{i.getValue()}</span> }),
      col.accessor('periodo_label', { header: 'Periodo', cell: (i) => i.getValue() ?? '—' }),
    ],
    [],
  )

  return (
    <RequirePermission permission="pagos:get">
      <h1 className="page-title">Pagos</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['cobro', 'evidencia', 'mora'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`btn ${tab === t ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setTab(t)}
          >
            {t === 'cobro' ? 'Cobro' : t === 'evidencia' ? 'Evidencia' : 'Mora'}
          </button>
        ))}
      </div>

      {tab === 'cobro' ? (
        <div
          style={{
            maxWidth: 480,
            background: 'var(--sasha-bg-raised)',
            border: '1px solid var(--sasha-border-suave)',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <Field label="Código alumno" htmlFor="pago-alumno">
            <input
              id="pago-alumno"
              className="field__input"
              data-testid="pago-alumno-code-input"
              value={cobroForm.alumno_code}
              onChange={(e) => setCobroForm((f) => ({ ...f, alumno_code: e.target.value }))}
            />
          </Field>
          <Field label="Tipo pago">
            <input
              className="field__input"
              value={cobroForm.tipo_pago_codigo ?? ''}
              onChange={(e) => setCobroForm((f) => ({ ...f, tipo_pago_codigo: e.target.value }))}
            />
          </Field>
          <Field label="Monto">
            <input
              type="number"
              className="field__input"
              data-testid="pago-monto-input"
              value={cobroForm.monto}
              onChange={(e) => setCobroForm((f) => ({ ...f, monto: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Observaciones">
            <textarea
              className="field__textarea"
              rows={2}
              value={cobroForm.observaciones ?? ''}
              onChange={(e) => setCobroForm((f) => ({ ...f, observaciones: e.target.value }))}
            />
          </Field>
          <Can permission="pagos:post">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="pago-cobro-button"
              onClick={() => {
                setAction('cobro')
                setConfirmSave(true)
              }}
            >
              Registrar cobro
            </button>
          </Can>
        </div>
      ) : null}

      {tab === 'evidencia' ? (
        <div
          style={{
            maxWidth: 480,
            background: 'var(--sasha-bg-raised)',
            border: '1px solid var(--sasha-border-suave)',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <Field label="Pago ID">
            <input
              className="field__input"
              data-testid="pago-evidencia-id-input"
              value={evidenciaForm.pago_id}
              onChange={(e) => setEvidenciaForm((f) => ({ ...f, pago_id: e.target.value }))}
            />
          </Field>
          <Field label="Object key (bóveda)">
            <input
              className="field__input"
              data-testid="pago-evidencia-key-input"
              value={evidenciaForm.object_key}
              onChange={(e) => setEvidenciaForm((f) => ({ ...f, object_key: e.target.value }))}
            />
          </Field>
          <Can permission="pagos:post">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setAction('evidencia')
                setConfirmSave(true)
              }}
            >
              Adjuntar evidencia
            </button>
          </Can>
          <hr style={{ margin: '1.25rem 0', borderColor: 'var(--sasha-border-suave)' }} />
          <Field label="Verificar pago ID">
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="field__input"
                data-testid="pago-verificar-id-input"
                value={verificarId}
                onChange={(e) => setVerificarId(e.target.value)}
              />
              <Can permission="pagos:put">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setAction('verificar')
                    setConfirmSave(true)
                  }}
                >
                  Verificar
                </button>
              </Can>
            </div>
          </Field>
        </div>
      ) : null}

      {tab === 'mora' || tab === 'cobro' ? (
        <>
          <h3 className="texto-muted" style={{ fontSize: '0.9rem' }}>
            Obligaciones en mora
          </h3>
          {isLoading ? (
            <div className="empty-state">Cargando mora…</div>
          ) : (
            <DataTable
              data={mora}
              columns={moraColumns}
              onExport={() =>
                downloadCsv(
                  'mora.csv',
                  mora.map((o) => ({
                    tipo: o.tipo_pago_codigo,
                    monto: o.monto,
                    vencimiento: o.fecha_vencimiento,
                    estado: o.estado,
                  })),
                )
              }
            />
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={confirmSave}
        title={
          action === 'cobro' ? 'Registrar cobro' : action === 'evidencia' ? 'Adjuntar evidencia' : 'Verificar pago'
        }
        message={
          action === 'cobro'
            ? `¿Registrar cobro de L ${cobroForm.monto} para ${cobroForm.alumno_code}?`
            : action === 'evidencia'
              ? '¿Adjuntar evidencia al pago?'
              : `¿Verificar el pago ${verificarId}?`
        }
        onConfirm={() => {
          if (action === 'cobro') cobroMut.mutate()
          else if (action === 'evidencia') evidenciaMut.mutate()
          else verificarMut.mutate(verificarId)
        }}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
