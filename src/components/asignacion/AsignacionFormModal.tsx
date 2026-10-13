import { createAsignacion, listAsignaciones } from '#/services/asignacion'
import type { AsignacionCreate } from '#/services/asignacion'
import { listCursos, listGrados, listPeriodos, listSecciones } from '#/services/catalogos'
import { listMaestros } from '#/services/personas'
import { gradosConCupos, seccionIdsCubiertas, seccionesConCupo } from '#/helpers/asignacionCupos'
import { periodoActivoId, periodoSelectOptions } from '#/helpers/periodos'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Can } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import type { ComboboxOption } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'

const emptyForm: AsignacionCreate = {
  maestro_id: '',
  curso_id: '',
  seccion_id: '',
  periodo_academico_id: '',
  status: 'ACTIVE',
}

type Props = {
  open: boolean
  onClose: () => void
  cursoId?: string
  cursoNombre?: string
}

export function AsignacionFormModal({ open, onClose, cursoId, cursoNombre }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<AsignacionCreate>(emptyForm)
  const [gradoId, setGradoId] = useState('')
  const [confirmSave, setConfirmSave] = useState(false)
  /** Evita que el auto-periodo pise una elección manual (p. ej. inactivo del próximo año). */
  const userPickedPeriod = useRef(false)

  const { data: maestros = [] } = useQuery({
    queryKey: ['maestros'],
    queryFn: listMaestros,
    enabled: open,
  })
  const { data: cursos = [] } = useQuery({
    queryKey: ['cursos'],
    queryFn: listCursos,
    enabled: open && !cursoId,
  })
  const { data: grados = [] } = useQuery({
    queryKey: ['grados'],
    queryFn: listGrados,
    enabled: open,
  })
  const { data: secciones = [] } = useQuery({
    queryKey: ['secciones'],
    queryFn: listSecciones,
    enabled: open,
  })
  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos'],
    queryFn: listPeriodos,
    enabled: open,
  })
  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: listAsignaciones,
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      userPickedPeriod.current = false
      return
    }
    userPickedPeriod.current = false
    setForm({ ...emptyForm, curso_id: cursoId ?? '' })
    setGradoId('')
    setConfirmSave(false)
  }, [open, cursoId])

  /** Preferir siempre el ACTIVE mientras el usuario no elija otro a mano (corrige caché stale). */
  useEffect(() => {
    if (!open || userPickedPeriod.current) return
    const active = periodoActivoId(periodos)
    if (!active) return
    setForm((f) => {
      if (f.periodo_academico_id === active) return f
      return { ...f, periodo_academico_id: active, seccion_id: '' }
    })
    setGradoId('')
  }, [open, periodos])

  const periodoOptions = useMemo(() => periodoSelectOptions(periodos), [periodos])
  const effectiveCursoId = cursoId || form.curso_id
  const periodoId = form.periodo_academico_id
  const readyForDetalle = Boolean(periodoId && effectiveCursoId)

  const periodoSeleccionado = periodos.find((p) => p.id === periodoId)

  const seccionesCubiertas = useMemo(
    () => seccionIdsCubiertas(asignaciones, effectiveCursoId, periodoId),
    [asignaciones, effectiveCursoId, periodoId],
  )

  const cursoOptions = useMemo<ComboboxOption[]>(
    () =>
      cursos
        .filter((c) => c.status === 'ACTIVE')
        .map((c) => ({ value: c.id, label: c.nombre, keywords: c.codigo }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [cursos],
  )

  const maestroOptions = useMemo<ComboboxOption[]>(
    () =>
      maestros
        .map((m) => ({
          value: m.id,
          label: m.user_code ? `${m.user_code} · ${m.nombre}` : m.nombre,
          keywords: m.user_code ?? '',
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [maestros],
  )

  const gradoOptions = useMemo<ComboboxOption[]>(() => {
    if (!readyForDetalle) return []
    return gradosConCupos(grados, secciones, seccionesCubiertas).map(({ grado, libres }) => {
      const lleno = libres === 0
      return {
        value: grado.id,
        label: `${grado.nombre} (${lleno ? 'lleno' : 'libre'})`,
        muted: lleno,
        disabled: lleno,
      }
    })
  }, [grados, secciones, seccionesCubiertas, readyForDetalle])

  const seccionOptions = useMemo<ComboboxOption[]>(() => {
    if (!gradoId) return []
    return seccionesConCupo(secciones, gradoId, seccionesCubiertas).map(({ seccion, libre }) => ({
      value: seccion.id,
      label: `${seccion.nombre} (${libre ? 'libre' : 'asignado'})`,
      muted: !libre,
      disabled: !libre,
    }))
  }, [secciones, gradoId, seccionesCubiertas])

  const createMut = useMutation({
    mutationFn: () =>
      createAsignacion({
        ...form,
        curso_id: effectiveCursoId,
        periodo_academico_id: periodoId,
      }),
    onSuccess: () => {
      toast.success('Asignación creada')
      qc.invalidateQueries({ queryKey: ['asignaciones'] })
      setConfirmSave(false)
      onClose()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const canSubmit =
    Boolean(form.maestro_id) &&
    Boolean(effectiveCursoId) &&
    Boolean(form.seccion_id) &&
    Boolean(periodoId)

  const gradoEmptyMsg = readyForDetalle
    ? periodoSeleccionado
      ? `Todas las secciones de esta clase ya están asignadas en «${periodoSeleccionado.nombre}».`
      : 'Todas las secciones de esta clase ya están asignadas en el periodo.'
    : 'Elige el periodo y la clase.'

  return (
    <>
      <Modal
        open={open}
        title={cursoNombre ? `Asignar maestro · ${cursoNombre}` : 'Nueva asignación'}
        wide
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <Can permission="asignacion:post">
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
            data-testid="asignacion-periodo-select"
            value={periodoId}
            onChange={(v) => {
              userPickedPeriod.current = true
              setForm((f) => ({ ...f, periodo_academico_id: v, seccion_id: '' }))
              setGradoId('')
            }}
            options={periodoOptions}
            placeholder="Buscar…"
            emptyLabel="No hay periodos."
          />
        </Field>

        {cursoId ? (
          <Field label="Clase">
            <input
              className="field__input"
              data-testid="asignacion-curso-fijo"
              disabled
              value={cursoNombre || cursoId}
            />
          </Field>
        ) : (
          <Field label="Clase">
            <Combobox
              data-testid="asignacion-curso-select"
              value={form.curso_id}
              onChange={(v) => {
                setForm((f) => ({ ...f, curso_id: v, seccion_id: '' }))
                setGradoId('')
              }}
              options={periodoId ? cursoOptions : []}
              placeholder="Buscar…"
              emptyLabel={periodoId ? 'No hay clases activas.' : 'Elige un periodo primero.'}
            />
          </Field>
        )}

        <Field label="Maestro">
          <Combobox
            data-testid="asignacion-maestro-select"
            value={form.maestro_id}
            onChange={(v) => setForm((f) => ({ ...f, maestro_id: v }))}
            options={readyForDetalle ? maestroOptions : []}
            placeholder="Buscar por nombre o código…"
            disabled={!readyForDetalle}
            emptyLabel={readyForDetalle ? 'No hay maestros.' : 'Elige el periodo y la clase.'}
          />
        </Field>

        <Field label="Grado">
          <Combobox
            data-testid="asignacion-grado-select"
            value={gradoId}
            onChange={(v) => {
              setGradoId(v)
              setForm((f) => ({ ...f, seccion_id: '' }))
            }}
            options={gradoOptions}
            placeholder="Buscar…"
            disabled={!readyForDetalle}
            emptyLabel={gradoEmptyMsg}
          />
        </Field>

        <Field label="Sección">
          <Combobox
            data-testid="asignacion-seccion-select"
            value={form.seccion_id}
            onChange={(v) => setForm((f) => ({ ...f, seccion_id: v }))}
            options={seccionOptions}
            placeholder="Buscar…"
            disabled={!gradoId}
            emptyLabel={gradoId ? 'Sin secciones.' : 'Elige un grado primero.'}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Crear asignación"
        message="¿Registrar esta asignación docente?"
        onConfirm={() => createMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </>
  )
}
