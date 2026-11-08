import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Combobox } from '#/components/ui/Combobox'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { fechaCorta } from '#/lib/examenes'
import { actualizarExamenReporte, crearExamenReporte } from '#/services/examenes'
import type { ExamenReporte } from '#/services/examenes'
import { listAlumnos } from '#/services/personas'

/** Examen que se puede elegir al crear un reporte. */
export type ExamenReporteOpcion = {
  examen_asignacion_id: string
  etiqueta: string
}

type ReporteModalProps = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  /** Exámenes disponibles para crear. En edición no se usa. */
  examenes?: ExamenReporteOpcion[]
  /** Examen preseleccionado (por ejemplo, desde el panel Ahora). */
  defaultExamenId?: string
  /** Código de alumno preseleccionado (por ejemplo, desde una card de moroso). */
  defaultCodigo?: string
  /** Si viene, el modal edita el detalle de ese reporte. */
  reporte?: ExamenReporte | null
}

/**
 * Modal para crear un reporte de examen o corregir el detalle de uno propio.
 * El backend recibe `alumno_id`; aquí se resuelve a partir del código visible.
 */
export function ReporteModal({
  open,
  onClose,
  onSaved,
  examenes = [],
  defaultExamenId,
  defaultCodigo,
  reporte,
}: ReporteModalProps) {
  const editando = Boolean(reporte)
  const [examenId, setExamenId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setSaving(false)
    setDetalle(reporte?.detalle ?? '')
    setCodigo(defaultCodigo ?? '')
    setExamenId(defaultExamenId ?? examenes.at(0)?.examen_asignacion_id ?? '')
  }, [open, defaultExamenId, defaultCodigo, reporte?.id, reporte?.detalle, examenes])

  const { data: alumnos = [] } = useQuery({
    queryKey: ['personas', 'alumnos'],
    queryFn: listAlumnos,
    enabled: open && !editando,
  })

  const alumnoOptions = useMemo(
    () =>
      alumnos.flatMap((alumno) => {
        const code = alumno.user_code?.trim()
        if (!code) return []
        return [{ value: code, label: `${code} — ${alumno.nombre}`, keywords: alumno.nombre }]
      }),
    [alumnos],
  )

  const examenOptions = useMemo(
    () => examenes.map((e) => ({ value: e.examen_asignacion_id, label: e.etiqueta })),
    [examenes],
  )

  async function guardar() {
    setError('')

    if (editando && reporte) {
      setSaving(true)
      try {
        await actualizarExamenReporte(reporte.id, {
          detalle: detalle.trim() || undefined,
        })
        toast.success('Reporte actualizado')
        onSaved()
        onClose()
      } catch (err) {
        toast.error(userMessageFromError(err))
      } finally {
        setSaving(false)
      }
      return
    }

    if (!examenId) {
      setError('Elige un examen.')
      return
    }
    const code = codigo.trim()
    if (!code) {
      setError('Escribe el código del alumno.')
      return
    }
    const alumno = alumnos.find(
      (a) => (a.user_code ?? '').trim().toLowerCase() === code.toLowerCase(),
    )
    if (!alumno) {
      setError('No se encontró un alumno con ese código.')
      return
    }

    setSaving(true)
    try {
      await crearExamenReporte({
        examen_asignacion_id: examenId,
        alumno_id: alumno.id,
        detalle: detalle.trim() || undefined,
      })
      toast.success('Reporte creado')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(userMessageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={editando ? 'Editar reporte' : 'Reportar alumno'}
      onClose={onClose}
      testId="reporte-examen-modal"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void guardar()}
            disabled={saving}
            data-testid="reporte-examen-guardar"
          >
            {saving ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear reporte'}
          </button>
        </>
      }
    >
      <div className="reporte-modal">
        {editando && reporte ? (
          <div className="reporte-modal__resumen">
            <p>
              <strong>{reporte.nombre}</strong> · Código {reporte.codigo}
            </p>
            <p className="texto-muted">
              {reporte.curso_nombre} · {reporte.grado} {reporte.seccion} ·{' '}
              {fechaCorta(reporte.fecha)}
            </p>
            <p className="texto-muted">Supervisor: {reporte.supervisor || '—'}</p>
          </div>
        ) : (
          <>
            <Field label="Examen">
              <Combobox
                value={examenId}
                onChange={setExamenId}
                options={examenOptions}
                placeholder="Elige un examen…"
                emptyLabel="No hay exámenes disponibles"
                data-testid="reporte-examen-select"
              />
            </Field>

            <Field label="Código del alumno">
              <Combobox
                value={codigo}
                onChange={(value) => {
                  setCodigo(value)
                  setError('')
                }}
                options={alumnoOptions}
                placeholder="Código del alumno…"
                allowCustom
                data-testid="reporte-examen-alumno"
              />
            </Field>
          </>
        )}

        {error ? <p className="field__error">{error}</p> : null}

        <Field label="Detalle (opcional)">
          <textarea
            className="field__textarea"
            rows={4}
            value={detalle}
            onChange={(event) => setDetalle(event.target.value)}
            placeholder="Describe lo ocurrido durante el examen…"
            data-testid="reporte-examen-detalle"
          />
        </Field>
      </div>
    </Modal>
  )
}
