import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Can } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { periodoSelectOptions } from '#/helpers/periodos'
import type { Grado, Modalidad, Periodo, Seccion } from '#/services/catalogos'
import { updateMatricula } from '#/services/matricula'
import type { Matricula } from '#/services/matricula'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Activa' },
  { value: 'INACTIVE', label: 'Inactiva' },
]

export function MatriculaEditModal({
  matricula,
  periodos,
  grados,
  modalidades,
  secciones,
  onClose,
  onSaved,
}: {
  matricula: Matricula
  periodos: Periodo[]
  grados: Grado[]
  modalidades: Modalidad[]
  secciones: Seccion[]
  onClose: () => void
  onSaved: () => void
}) {
  const seccionActual = secciones.find((s) => s.id === matricula.seccion_id)

  const { open, dismiss } = useDismiss(onClose)

  const [gradoId, setGradoId] = useState(seccionActual?.grado_id ?? '')
  const [seccionId, setSeccionId] = useState(matricula.seccion_id)
  const [periodoId, setPeriodoId] = useState(matricula.periodo_academico_id)
  const [esReingreso, setEsReingreso] = useState(matricula.es_reingreso)
  const [status, setStatus] = useState(matricula.status)
  const [confirmSave, setConfirmSave] = useState(false)

  const seccionesFiltradas = useMemo(
    () => secciones.filter((s) => !gradoId || s.grado_id === gradoId),
    [secciones, gradoId],
  )

  const saveMut = useMutation({
    mutationFn: () =>
      updateMatricula(matricula.id, {
        seccion_id: seccionId,
        periodo_academico_id: periodoId,
        es_reingreso: esReingreso,
        status,
      }),
    onSuccess: () => {
      toast.success('Matrícula actualizada')
      onSaved()
      setConfirmSave(false)
      dismiss()
    },
    onError: (e) => {
      toast.error(userMessageFromError(e))
      setConfirmSave(false)
    },
  })

  const guardar = () => {
    if (!seccionId) {
      toast.error('Elige una sección')
      return
    }
    setConfirmSave(true)
  }

  return (
    <Modal
      open={open}
      title="Editar matrícula"
      wide
      onClose={dismiss}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Cancelar
          </button>
          <Can permission="matricula:put">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="matricula-edit-save"
              disabled={saveMut.isPending}
              onClick={guardar}
            >
              Guardar
            </button>
          </Can>
        </>
      }
    >
      <p className="texto-muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
        Alumno: <strong>{matricula.alumno_code ?? matricula.alumno_id}</strong>
      </p>

      <Field label="Grado">
        <Combobox
          value={gradoId}
          onChange={(v) => {
            setGradoId(v)
            const actual = secciones.find((s) => s.id === seccionId)
            if (actual && actual.grado_id !== v) setSeccionId('')
          }}
          options={grados.map((g) => ({
            value: g.id,
            label: g.nombre,
            keywords: g.codigo,
          }))}
          placeholder="Buscar grado…"
          data-testid="matricula-edit-grado"
        />
      </Field>

      <Field label="Sección">
        <Combobox
          value={seccionId}
          onChange={setSeccionId}
          options={seccionesFiltradas.map((s) => {
            const g = grados.find((x) => x.id === s.grado_id)
            const m = modalidades.find((x) => x.id === s.modalidad_id)
            return {
              value: s.id,
              label: [g?.nombre, m?.nombre, s.nombre].filter(Boolean).join(' · '),
              keywords: s.codigo,
            }
          })}
          placeholder="Buscar sección…"
          data-testid="matricula-edit-seccion"
        />
      </Field>

      <Field label="Periodo académico">
        <Combobox
          value={periodoId}
          onChange={setPeriodoId}
          options={periodoSelectOptions(periodos)}
          placeholder="Buscar periodo…"
          data-testid="matricula-edit-periodo"
        />
      </Field>

      <Field label="Estado">
        <Combobox
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          placeholder="Buscar estado…"
          data-testid="matricula-edit-status"
        />
      </Field>

      <label style={{ fontSize: '0.85rem', display: 'block', margin: '0.25rem 0 1rem' }}>
        <input
          type="checkbox"
          checked={esReingreso}
          onChange={(e) => setEsReingreso(e.target.checked)}
          data-testid="matricula-edit-reingreso"
        />{' '}
        El alumno es un reingreso
      </label>

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar cambios"
        message="¿Guardar los cambios de la matrícula?"
        confirmDisabled={saveMut.isPending}
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </Modal>
  )
}
