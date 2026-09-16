import { createAsignacion, listAsignaciones, type AsignacionCreate } from '#/services/asignacion'
import { listCursos, listGrados, listPeriodos, listSecciones } from '#/services/catalogos'
import { listMaestros } from '#/services/personas'
import { gradosConSeccionesLibres, seccionIdsCubiertas } from '#/helpers/asignacionCupos'
import { periodoActivoId, periodoSelectOptions } from '#/helpers/periodos'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Can } from '#/components/gates/Can'
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

type PickOption = {
  value: string
  label: string
  disabled?: boolean
  muted?: boolean
  hint?: string
}

function OptionPick({
  options,
  value,
  onChange,
  testId,
  empty,
}: {
  options: PickOption[]
  value: string
  onChange: (v: string) => void
  testId?: string
  empty?: ReactNode
}) {
  if (options.length === 0) {
    return (
      <div data-testid={testId}>
        <p className="texto-muted pick-grid__empty">{empty ?? 'Sin opciones.'}</p>
      </div>
    )
  }
  return (
    <div className="pick-grid" data-testid={testId} role="listbox" aria-orientation="horizontal">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={selected}
            aria-disabled={opt.disabled || undefined}
            disabled={opt.disabled}
            title={opt.hint}
            className={`pick-option${selected ? ' pick-option--selected' : ''}${
              opt.disabled ? ' pick-option--disabled' : ''
            }${opt.muted && !opt.disabled ? ' pick-option--muted' : ''}`}
            onClick={() => {
              if (!opt.disabled) onChange(opt.value)
            }}
          >
            <span className="pick-option__label">{opt.label}</span>
            {opt.hint ? <span className="pick-option__hint">{opt.hint}</span> : null}
          </button>
        )
      })}
    </div>
  )
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
      return { ...f, periodo_academico_id: active, maestro_id: '', seccion_id: '' }
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

  const gradosDisponibles = useMemo(() => {
    if (!readyForDetalle) return []
    return gradosConSeccionesLibres(grados, secciones, seccionesCubiertas)
  }, [grados, secciones, seccionesCubiertas, readyForDetalle])

  const seccionesDelGrado = useMemo(() => {
    if (!gradoId) return []
    return secciones
      .filter((s) => s.grado_id === gradoId && s.status === 'ACTIVE')
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((s) => {
        const cubierta = seccionesCubiertas.has(s.id)
        return {
          value: s.id,
          label: s.nombre,
          disabled: cubierta,
          hint: cubierta ? 'Ya asignada en este periodo' : undefined,
        }
      })
  }, [secciones, gradoId, seccionesCubiertas])

  const maestrosOptions = useMemo(() => {
    if (!readyForDetalle) return []
    return maestros
      .map((m) => {
        const yaEnSeccion =
          Boolean(form.seccion_id) &&
          asignaciones.some(
            (a) =>
              a.status === 'ACTIVE' &&
              a.maestro_id === m.id &&
              a.curso_id === effectiveCursoId &&
              a.seccion_id === form.seccion_id &&
              a.periodo_academico_id === periodoId,
          )
        return {
          value: m.id,
          label: m.nombre,
          disabled: yaEnSeccion,
          hint: yaEnSeccion ? 'Ya asignado aquí' : undefined,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [maestros, asignaciones, readyForDetalle, form.seccion_id, effectiveCursoId, periodoId])

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

  const gradoEmptyMsg = periodoSeleccionado
    ? `Todas las secciones de este curso ya están asignadas en «${periodoSeleccionado.nombre}».`
    : 'Todas las secciones de este curso ya están asignadas en el periodo.'

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
          <OptionPick
            testId="asignacion-periodo-select"
            value={periodoId}
            onChange={(v) => {
              userPickedPeriod.current = true
              setForm((f) => ({
                ...f,
                periodo_academico_id: v,
                maestro_id: '',
                seccion_id: '',
                curso_id: cursoId ?? f.curso_id,
              }))
              setGradoId('')
            }}
            options={periodoOptions}
            empty="No hay periodos."
          />
        </Field>

        {cursoId ? (
          <Field label="Curso">
            <input
              className="field__input"
              data-testid="asignacion-curso-fijo"
              disabled
              value={cursoNombre || cursoId}
            />
          </Field>
        ) : (
          <Field label="Curso">
            <OptionPick
              testId="asignacion-curso-select"
              value={form.curso_id}
              onChange={(v) => {
                setForm((f) => ({ ...f, curso_id: v, maestro_id: '', seccion_id: '' }))
                setGradoId('')
              }}
              options={
                periodoId
                  ? cursos
                      .filter((c) => c.status === 'ACTIVE')
                      .map((c) => ({ value: c.id, label: c.nombre }))
                  : []
              }
              empty={periodoId ? 'No hay cursos activos.' : 'Elige un periodo primero.'}
            />
          </Field>
        )}

        {readyForDetalle ? (
          <>
            <Field label="Maestro">
              <OptionPick
                testId="asignacion-maestro-select"
                value={form.maestro_id}
                onChange={(v) => setForm((f) => ({ ...f, maestro_id: v }))}
                options={maestrosOptions}
                empty="No hay maestros."
              />
            </Field>

            <Field label="Grado">
              <OptionPick
                testId="asignacion-grado-select"
                value={gradoId}
                onChange={(v) => {
                  setGradoId(v)
                  setForm((f) => ({ ...f, seccion_id: '' }))
                }}
                options={gradosDisponibles.map(({ grado, libres, total }) => ({
                  value: grado.id,
                  label: grado.nombre,
                  hint: libres < total ? `${libres} libres` : undefined,
                }))}
                empty={gradoEmptyMsg}
              />
            </Field>

            <Field label="Sección">
              <OptionPick
                testId="asignacion-seccion-select"
                value={form.seccion_id}
                onChange={(v) => setForm((f) => ({ ...f, seccion_id: v }))}
                options={gradoId ? seccionesDelGrado : []}
                empty={gradoId ? 'Sin secciones.' : 'Elige un grado primero.'}
              />
            </Field>
          </>
        ) : (
          <p className="texto-muted">
            {periodoId
              ? 'Elige un curso para ver maestros, grados y secciones.'
              : 'Elige el periodo académico para continuar.'}
          </p>
        )}
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
