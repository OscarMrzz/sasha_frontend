import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { userMessageFromError } from '#/lib/api'
import { postAsistenciaBatch, type AsistenciaItem } from '#/services/asistencia'

export const Route = createFileRoute('/_app/asistencia')({ component: AsistenciaPage })

const emptyRow: AsistenciaItem = {
  alumno_id: '',
  asignacion_docente_id: '',
  fecha: new Date().toISOString().slice(0, 10),
  tipo_codigo: 'presente',
}

function AsistenciaPage() {
  const [rows, setRows] = useState<AsistenciaItem[]>([{ ...emptyRow }])
  const [confirmSave, setConfirmSave] = useState(false)

  const saveMut = useMutation({
    mutationFn: () => postAsistenciaBatch(rows),
    onSuccess: (data) => {
      toast.success(`${data.length} registro(s) de asistencia guardados`)
      setConfirmSave(false)
      setRows([{ ...emptyRow }])
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const updateRow = (idx: number, patch: Partial<AsistenciaItem>) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const addRow = () => setRows((r) => [...r, { ...emptyRow }])
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx))

  return (
    <RequirePermission permission="asistencia:get">
      <h1 className="page-title">Registro de asistencia</h1>
      <div
        style={{
          background: 'var(--sasha-bg-raised)',
          border: '1px solid var(--sasha-border-suave)',
          borderRadius: '8px',
          padding: '1.25rem',
          maxWidth: 900,
        }}
      >
        <p className="texto-muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
          Registro por lote: alumno, asignación docente, fecha y tipo.
        </p>

        {rows.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 140px 120px auto',
              gap: '0.5rem',
              marginBottom: '0.75rem',
              alignItems: 'end',
            }}
          >
            <Field label={idx === 0 ? 'Alumno ID' : ''}>
              <input
                className="field__input"
                data-testid={idx === 0 ? 'asistencia-alumno-input' : undefined}
                value={row.alumno_id}
                onChange={(e) => updateRow(idx, { alumno_id: e.target.value })}
              />
            </Field>
            <Field label={idx === 0 ? 'Asignación docente ID' : ''}>
              <input
                className="field__input"
                value={row.asignacion_docente_id}
                onChange={(e) => updateRow(idx, { asignacion_docente_id: e.target.value })}
              />
            </Field>
            <Field label={idx === 0 ? 'Fecha' : ''}>
              <input
                type="date"
                className="field__input"
                value={row.fecha}
                onChange={(e) => updateRow(idx, { fecha: e.target.value })}
              />
            </Field>
            <Field label={idx === 0 ? 'Tipo' : ''}>
              <select
                className="field__select"
                data-testid={idx === 0 ? 'asistencia-tipo-select' : undefined}
                value={row.tipo_codigo ?? 'presente'}
                onChange={(e) => updateRow(idx, { tipo_codigo: e.target.value })}
              >
                <option value="presente">Presente</option>
                <option value="ausente">Ausente</option>
                <option value="tarde">Tarde</option>
                <option value="justificado">Justificado</option>
              </select>
            </Field>
            {rows.length > 1 ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeRow(idx)}>
                Quitar
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={addRow}>
            + Fila
          </button>
          <Can permission="asistencia:post">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="asistencia-save-button"
              disabled={saveMut.isPending}
              onClick={() => setConfirmSave(true)}
            >
              Guardar lote
            </button>
          </Can>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSave}
        title="Registrar asistencia"
        message={`¿Guardar ${rows.length} registro(s) de asistencia?`}
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
