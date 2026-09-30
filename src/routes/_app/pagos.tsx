import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { userMessageFromError } from '#/lib/api'
import { cobrarMeses, cobro, generarMensualidades, getMensualidadesAlumno, listMora } from '#/services/pagos'
import type { CobroRequest, MensualidadesAlumno, Obligacion } from '#/services/pagos'

export const Route = createFileRoute('/_app/pagos')({ component: PagosPage })

const col = createColumnHelper<Obligacion>()

function PagosPage() {
  const qc = useQueryClient()
  const { data: mora = [], isLoading } = useQuery({ queryKey: ['mora'], queryFn: listMora })

  const [tab, setTab] = useState<'cobro' | 'mora'>('cobro')
  const [confirmSave, setConfirmSave] = useState(false)
  const [action, setAction] = useState<'cobro' | 'meses' | 'generar'>('cobro')
  const [mesesCode, setMesesCode] = useState('')
  const [mesesAlumno, setMesesAlumno] = useState<MensualidadesAlumno | null>(null)
  const [mesesSel, setMesesSel] = useState<string[]>([])

  const pendientes = mesesAlumno?.meses.filter((m) => m.estado !== 'pagado') ?? []
  const totalSel = pendientes.filter((m) => mesesSel.includes(m.obligacion_id)).reduce((s, m) => s + m.monto, 0)
  const etiquetasSel = pendientes.filter((m) => mesesSel.includes(m.obligacion_id)).map((m) => m.etiqueta)

  const cargarMesesMut = useMutation({
    mutationFn: (code: string) => getMensualidadesAlumno(code),
    onSuccess: (r) => {
      setMesesAlumno(r)
      setMesesSel([])
    },
    onError: (e) => {
      setMesesAlumno(null)
      toast.error(userMessageFromError(e))
    },
  })

  const cobrarMesesMut = useMutation({
    mutationFn: () => cobrarMeses(mesesAlumno?.codigo ?? mesesCode.trim(), mesesSel),
    onSuccess: (r) => {
      toast.success(`Se registraron ${r.pagos.length} mensualidad(es) por L ${r.total.toFixed(2)}`)
      setConfirmSave(false)
      qc.invalidateQueries({ queryKey: ['mora'] })
      qc.invalidateQueries({ queryKey: ['liberacion-bloqueados'] })
      if (mesesAlumno) cargarMesesMut.mutate(mesesAlumno.codigo)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const generarMut = useMutation({
    mutationFn: () => generarMensualidades(),
    onSuccess: (r) => {
      toast.success(r.creadas ? `Se generaron ${r.creadas} mensualidad(es)` : 'Las mensualidades ya estaban generadas')
      setConfirmSave(false)
      qc.invalidateQueries({ queryKey: ['mora'] })
      if (mesesAlumno) cargarMesesMut.mutate(mesesAlumno.codigo)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const toggleMes = (id: string) =>
    setMesesSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const [cobroForm, setCobroForm] = useState<CobroRequest>({
    alumno_code: '',
    monto: 0,
    tipo_pago_codigo: 'mensualidad',
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

  const moraFilters = useMemo(
    () => [
      { id: 'tipo_pago', label: 'Tipo', getValue: (r: Obligacion) => r.tipo_pago_codigo ?? '' },
      { id: 'estado', label: 'Estado', getValue: (r: Obligacion) => r.estado },
      { id: 'periodo', label: 'Periodo', getValue: (r: Obligacion) => r.periodo_label ?? '' },
    ],
    [],
  )

  return (
    <RequirePermission permission="pagos:get">
      <h1 className="page-title">Pagos</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['cobro', 'mora'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`btn ${tab === t ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setTab(t)}
          >
            {t === 'cobro' ? 'Cobro' : 'Mora'}
          </button>
        ))}
        <Can permission="pagos:put">
          <Link to="/recibos" className="btn btn--ghost" data-testid="pagos-ir-recibos">
            Recibos de padres
          </Link>
        </Can>
      </div>

      {tab === 'cobro' ? (
        <div className="pagos-cobro-grid">
        <div className="pagos-card" data-testid="pago-meses-card">
          <h2 className="mdash__tile-title">Mensualidades por mes</h2>
          <form
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}
            onSubmit={(e) => {
              e.preventDefault()
              if (mesesCode.trim()) cargarMesesMut.mutate(mesesCode.trim())
            }}
          >
            <Field label="Código alumno" htmlFor="pago-meses-code">
              <input
                id="pago-meses-code"
                className="field__input"
                data-testid="pago-meses-code-input"
                value={mesesCode}
                onChange={(e) => setMesesCode(e.target.value)}
              />
            </Field>
            <button
              type="submit"
              className="btn btn--ghost"
              data-testid="pago-meses-buscar"
              disabled={!mesesCode.trim() || cargarMesesMut.isPending}
              style={{ marginBottom: '0.75rem' }}
            >
              Buscar
            </button>
          </form>

          {mesesAlumno ? (
            <>
              <p style={{ margin: 0 }}>
                <strong>{mesesAlumno.nombre}</strong> · {mesesAlumno.codigo}
              </p>
              {mesesAlumno.meses.length === 0 ? (
                <p className="texto-muted">Este alumno no tiene mensualidades generadas en el periodo activo.</p>
              ) : (
                <div className="cobro-meses">
                  {mesesAlumno.meses.map((m) => {
                    const pagado = m.estado === 'pagado'
                    return (
                      <label
                        key={m.obligacion_id}
                        className={`cobro-meses__item${pagado ? ' cobro-meses__item--pagado' : ''}`}
                        data-testid={`pago-mes-${m.anio}-${m.mes}`}
                      >
                        <input
                          type="checkbox"
                          disabled={pagado}
                          checked={pagado || mesesSel.includes(m.obligacion_id)}
                          onChange={() => toggleMes(m.obligacion_id)}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{m.etiqueta}</span>
                        {pagado ? <span className="badge badge--ok">Pagado</span> : null}
                        <span className="cobro-meses__monto">L {m.monto.toFixed(2)}</span>
                      </label>
                    )
                  })}
                </div>
              )}
              <Can permission="pagos:post">
                <button
                  type="button"
                  className="btn btn--primary"
                  data-testid="pago-meses-cobrar"
                  disabled={!mesesSel.length}
                  onClick={() => {
                    setAction('meses')
                    setConfirmSave(true)
                  }}
                >
                  Cobrar {mesesSel.length ? `${mesesSel.length} mes(es) · L ${totalSel.toFixed(2)}` : 'meses'}
                </button>
              </Can>
            </>
          ) : null}

          <Can permission="pagos:post">
            <hr style={{ margin: '1.25rem 0', borderColor: 'var(--sasha-border-suave)' }} />
            <p className="texto-muted" style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
              Crea las mensualidades que falten para todos los matriculados del periodo activo (una por mes).
            </p>
            <button
              type="button"
              className="btn btn--ghost"
              data-testid="pago-generar-mensualidades"
              onClick={() => {
                setAction('generar')
                setConfirmSave(true)
              }}
            >
              Generar mensualidades del periodo
            </button>
          </Can>
        </div>
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
        </div>
      ) : null}

      {isLoading ? (
        <div className="empty-state">Cargando mora…</div>
      ) : (
        <DataTable
          title="Obligaciones en mora"
          data={mora}
          columns={moraColumns}
          filters={moraFilters}
          exportFilename="mora"
          exportRows={mora.map((o) => ({
            tipo: o.tipo_pago_codigo,
            monto: o.monto,
            vencimiento: o.fecha_vencimiento,
            estado: o.estado,
          }))}
        />
      )}

      <ConfirmDialog
        open={confirmSave}
        title={
          action === 'cobro'
            ? 'Registrar cobro'
            : action === 'meses'
              ? 'Cobrar mensualidades'
              : 'Generar mensualidades'
        }
        message={
          action === 'cobro'
            ? `¿Registrar cobro de L ${cobroForm.monto} para ${cobroForm.alumno_code}?`
            : action === 'meses'
              ? `¿Registrar el pago de ${etiquetasSel.join(', ')} (L ${totalSel.toFixed(2)}) para ${mesesAlumno?.nombre ?? ''}? Las calificaciones de los parciales de esos meses se habilitarán automáticamente.`
              : '¿Generar las mensualidades que falten para todos los matriculados del periodo activo?'
        }
        onConfirm={() => {
          if (action === 'cobro') cobroMut.mutate()
          else if (action === 'meses') cobrarMesesMut.mutate()
          else generarMut.mutate()
        }}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
