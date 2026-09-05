import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { userMessageFromError } from '#/lib/api'
import { listModalidades, listPeriodos } from '#/services/catalogos'
import {
  confirmHorario,
  previewHorarioPeriodo,
  type HorarioPreview,
  type HorarioSlot,
} from '#/services/horarios'

export const Route = createFileRoute('/_app/horarios')({ component: HorariosPage })

const col = createColumnHelper<HorarioSlot>()
const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function HorariosPage() {
  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })
  const { data: modalidades = [] } = useQuery({ queryKey: ['modalidades'], queryFn: listModalidades })

  const [periodoId, setPeriodoId] = useState('')
  const [modalidadId, setModalidadId] = useState('')
  const [slotMinutes, setSlotMinutes] = useState(45)
  const [numeroVersion, setNumeroVersion] = useState(1)
  const [preview, setPreview] = useState<HorarioPreview | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [activar, setActivar] = useState(true)

  const previewMut = useMutation({
    mutationFn: () => previewHorarioPeriodo(periodoId, modalidadId),
    onSuccess: (data) => {
      setPreview(data)
      toast.success('Vista previa generada')
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const confirmMut = useMutation({
    mutationFn: () => {
      if (!preview || !periodoId) throw new Error('Genera una vista previa primero')
      return confirmHorario({
        periodo_academico_id: periodoId,
        codigo_semilla: preview.codigo_semilla,
        numero_version: preview.numero_version,
        slots: preview.slots,
        activar,
      })
    },
    onSuccess: () => {
      toast.success('Horario confirmado y guardado')
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('dia_semana', { header: 'Día', cell: (i) => DIAS[i.getValue()] ?? i.getValue() }),
      col.accessor('hora_inicio', { header: 'Inicio' }),
      col.accessor('hora_fin', { header: 'Fin' }),
      col.accessor('curso_id', { header: 'Curso', cell: (i) => i.getValue().slice(0, 8) }),
      col.accessor('seccion_id', { header: 'Sección', cell: (i) => i.getValue().slice(0, 8) }),
      col.accessor('es_fijo', { header: 'Fijo', cell: (i) => (i.getValue() ? 'Sí' : 'No') }),
    ],
    [],
  )

  return (
    <RequirePermission permission="horarios:get">
      <h1 className="page-title">Generación de horarios</h1>

      <div
        style={{
          background: 'var(--sasha-bg-raised)',
          border: '1px solid var(--sasha-border-suave)',
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '1.25rem',
          maxWidth: 720,
        }}
      >
        <h3 className="texto-muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
          Asistente
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Periodo académico">
            <select
              className="field__select"
              data-testid="horario-periodo-select"
              value={periodoId}
              onChange={(e) => setPeriodoId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modalidad">
            <select
              className="field__select"
              data-testid="horario-modalidad-select"
              value={modalidadId}
              onChange={(e) => setModalidadId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {modalidades.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Duración slot (min)">
            <input
              type="number"
              className="field__input"
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(Number(e.target.value))}
            />
          </Field>
          <Field label="Número versión">
            <input
              type="number"
              className="field__input"
              value={numeroVersion}
              onChange={(e) => setNumeroVersion(Number(e.target.value))}
            />
          </Field>
        </div>
        <Can permission="horarios:post">
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="horario-preview-button"
              disabled={!periodoId || !modalidadId || previewMut.isPending}
              onClick={() => previewMut.mutate()}
            >
              {previewMut.isPending ? 'Generando…' : 'Vista previa'}
            </button>
            {preview ? (
              <button
                type="button"
                className="btn btn--ghost"
                data-testid="horario-confirm-button"
                disabled={confirmMut.isPending}
                onClick={() => setConfirmSave(true)}
              >
                Confirmar y guardar
              </button>
            ) : null}
          </div>
        </Can>
        <label style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={activar} onChange={(e) => setActivar(e.target.checked)} /> Activar versión al
          confirmar
        </label>
      </div>

      {preview ? (
        <>
          {preview.avisos.length > 0 ? (
            <div style={{ marginBottom: '1rem' }}>
              {preview.avisos.map((a) => (
                <p key={a.codigo} className="badge badge--warn" style={{ marginRight: '0.5rem' }}>
                  {a.mensaje}
                </p>
              ))}
            </div>
          ) : null}
          <p className="texto-muted" style={{ fontSize: '0.85rem' }}>
            Semilla: <code>{preview.codigo_semilla}</code> · Slots: {preview.slots.length} · Horas colocadas:{' '}
            {preview.resumen_capacidad.horas_colocadas}/{preview.resumen_capacidad.horas_pedidas}
          </p>
          <DataTable data={preview.slots} columns={columns} searchPlaceholder="Filtrar slots…" />
        </>
      ) : (
        <div className="empty-state">Selecciona periodo y modalidad, luego genera la vista previa.</div>
      )}

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar horario"
        message="¿Guardar esta versión del horario?"
        onConfirm={() => confirmMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
