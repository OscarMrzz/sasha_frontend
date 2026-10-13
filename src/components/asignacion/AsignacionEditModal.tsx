import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Can } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { periodoSelectOptions } from '#/helpers/periodos'
import { updateAsignacion } from '#/services/asignacion'
import type { Asignacion, AsignacionUpdate } from '#/services/asignacion'
import { listCursos, listGrados, listPeriodos, listSecciones } from '#/services/catalogos'
import { listMaestros } from '#/services/personas'

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

const emptyForm: AsignacionUpdate = {
  maestro_id: '',
  curso_id: '',
  seccion_id: '',
  periodo_academico_id: '',
  status: 'ACTIVE',
}

type Props = {
  open: boolean
  asignacion: Asignacion | null
  onClose: () => void
}

export function AsignacionEditModal({ open, asignacion, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<AsignacionUpdate>(emptyForm)
  const [gradoId, setGradoId] = useState('')
  const [confirmSave, setConfirmSave] = useState(false)

  const { data: maestros = [] } = useQuery({ queryKey: ['maestros'], queryFn: listMaestros, enabled: open })
  const { data: cursos = [] } = useQuery({ queryKey: ['cursos'], queryFn: listCursos, enabled: open })
  const { data: grados = [] } = useQuery({ queryKey: ['grados'], queryFn: listGrados, enabled: open })
  const { data: secciones = [] } = useQuery({ queryKey: ['secciones'], queryFn: listSecciones, enabled: open })
  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos, enabled: open })

  useEffect(() => {
    if (!open) {
      setGradoId('')
      return
    }
    if (!asignacion) return
    setForm({
      maestro_id: asignacion.maestro_id,
      curso_id: asignacion.curso_id,
      seccion_id: asignacion.seccion_id,
      periodo_academico_id: asignacion.periodo_academico_id,
      status: asignacion.status || 'ACTIVE',
    })
    setConfirmSave(false)
  }, [open, asignacion])

  // Deriva el grado de la sección actual cuando el catálogo ya cargó.
  useEffect(() => {
    if (!open || !asignacion || gradoId) return
    const sec = secciones.find((s) => s.id === asignacion.seccion_id)
    if (sec) setGradoId(sec.grado_id)
  }, [open, asignacion, secciones, gradoId])

  const periodoOptions = useMemo(() => periodoSelectOptions(periodos), [periodos])
  const cursoOptions = useMemo(
    () => cursos.filter((c) => c.status === 'ACTIVE').map((c) => ({ value: c.id, label: c.nombre })),
    [cursos],
  )
  const gradoOptions = useMemo(
    () => [...grados].sort((a, b) => a.orden - b.orden).map((g) => ({ value: g.id, label: g.nombre })),
    [grados],
  )
  const seccionOptions = useMemo(
    () =>
      secciones
        .filter((s) => s.grado_id === gradoId && s.status === 'ACTIVE')
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((s) => ({ value: s.id, label: s.nombre })),
    [secciones, gradoId],
  )
  const maestroOptions = useMemo(
    () =>
      maestros
        .map((m) => ({
          value: m.id,
          label: m.user_code ? `${m.nombre} (${m.user_code})` : m.nombre,
          keywords: m.user_code ?? '',
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [maestros],
  )

  const saveMut = useMutation({
    mutationFn: () => {
      if (!asignacion) throw new Error('Sin asignación')
      return updateAsignacion(asignacion.id, form)
    },
    onSuccess: () => {
      toast.success('Asignación actualizada')
      qc.invalidateQueries({ queryKey: ['asignaciones'] })
      setConfirmSave(false)
      onClose()
    },
    onError: (e) => {
      toast.error(userMessageFromError(e))
      setConfirmSave(false)
    },
  })

  const canSubmit =
    Boolean(form.maestro_id) &&
    Boolean(form.curso_id) &&
    Boolean(form.seccion_id) &&
    Boolean(form.periodo_academico_id)

  return (
    <>
      <Modal
        open={open}
        title="Editar asignación"
        wide
        onClose={onClose}
        testId="asignacion-edit-modal"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <Can permission="asignacion:put">
              <button
                type="button"
                className="btn btn--primary"
                disabled={!canSubmit}
                onClick={() => setConfirmSave(true)}
              >
                Guardar
              </button>
            </Can>
          </>
        }
      >
        <Field label="Periodo académico">
          <Combobox
            value={form.periodo_academico_id}
            onChange={(v) => setForm((f) => ({ ...f, periodo_academico_id: v }))}
            options={periodoOptions}
            placeholder="Buscar…"
            data-testid="asignacion-edit-periodo"
          />
        </Field>

        <Field label="Clase">
          <Combobox
            value={form.curso_id}
            onChange={(v) => setForm((f) => ({ ...f, curso_id: v }))}
            options={cursoOptions}
            placeholder="Buscar…"
            data-testid="asignacion-edit-curso"
          />
        </Field>

        <Field label="Maestro">
          <Combobox
            value={form.maestro_id}
            onChange={(v) => setForm((f) => ({ ...f, maestro_id: v }))}
            options={maestroOptions}
            placeholder="Buscar…"
            data-testid="asignacion-edit-maestro"
          />
        </Field>

        <Field label="Grado">
          <Combobox
            value={gradoId}
            onChange={(v) => {
              setGradoId(v)
              setForm((f) => ({ ...f, seccion_id: '' }))
            }}
            options={gradoOptions}
            placeholder="Buscar…"
            data-testid="asignacion-edit-grado"
          />
        </Field>

        <Field label="Sección">
          <Combobox
            value={form.seccion_id}
            onChange={(v) => setForm((f) => ({ ...f, seccion_id: v }))}
            options={seccionOptions}
            placeholder="Buscar…"
            emptyLabel={gradoId ? 'Sin secciones' : 'Elige un grado primero'}
            data-testid="asignacion-edit-seccion"
          />
        </Field>

        <Field label="Estado">
          <Combobox
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={STATUS_OPTIONS}
            placeholder="Buscar…"
            data-testid="asignacion-edit-status"
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Guardar cambios"
        message="¿Guardar los cambios de esta asignación?"
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </>
  )
}
