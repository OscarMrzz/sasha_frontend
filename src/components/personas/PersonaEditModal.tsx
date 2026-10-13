import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Can } from '#/components/gates/Can'
import { PhotoCapture } from '#/components/matricula/PhotoCapture'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { useBovedaImage } from '#/hooks/use-boveda-image'
import { userMessageFromError } from '#/lib/api'
import { upload, uploadErrorMessage } from '#/services/boveda'
import { listGrados, type Grado } from '#/services/catalogos'
import {
  getFicha,
  updatePersona,
  type PersonaUpdate,
  type UserFicha,
} from '#/services/personas'

const SEXO_OPTIONS = [
  { value: 'M', label: 'Masculino', keywords: 'M masculino hombre' },
  { value: 'F', label: 'Femenino', keywords: 'F femenino mujer' },
  { value: 'Otro', label: 'Otro', keywords: 'otro' },
]

const TIPO_DOC_OPTIONS = [
  { value: 'HND', label: 'HND', keywords: 'honduras documento identidad' },
  { value: 'RTN', label: 'RTN', keywords: 'registro tributario' },
  { value: 'PAS', label: 'Pasaporte', keywords: 'pasaporte' },
]

type GradoRow = { id: string; nombre: string; anio: string }

type FormState = {
  primer_nombre: string
  segundo_nombre: string
  primer_apellido: string
  segundo_apellido: string
  tipo_documento_identidad: string
  numero_identidad: string
  fecha_nacimiento: string
  sexo: string
  telefono_contacto: string
  // alumno
  procede_otra_institucion: boolean
  nombre_institucion_origen: string
  presenta_condicion_aprendizaje: boolean
  ha_repetido_grado: boolean
  alergias: string[]
  condiciones_aprendizaje: string[]
  grados_repetidos: GradoRow[]
  // responsable
  profesion: string
  direccion_domicilio: string
}

function joinName(p?: UserFicha['perfil']) {
  if (!p) return ''
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
    .filter(Boolean)
    .join(' ')
}

function idPorNombre(grados: Grado[], nombre: string): string {
  const n = nombre.trim().toLowerCase()
  if (!n) return ''
  return grados.find((g) => g.nombre.trim().toLowerCase() === n)?.id ?? ''
}

function nombreDeId(grados: Grado[], id: string): string {
  return grados.find((g) => g.id === id)?.nombre ?? ''
}

function buildSeed(ficha: UserFicha, grados: Grado[]): FormState {
  const p = ficha.perfil
  const alumno = ficha.alumno
  const responsable = ficha.responsable
  return {
    primer_nombre: p?.primer_nombre ?? '',
    segundo_nombre: p?.segundo_nombre ?? '',
    primer_apellido: p?.primer_apellido ?? '',
    segundo_apellido: p?.segundo_apellido ?? '',
    tipo_documento_identidad: p?.tipo_documento_identidad ?? '',
    numero_identidad: p?.numero_identidad ?? '',
    fecha_nacimiento: p?.fecha_nacimiento?.slice(0, 10) ?? '',
    sexo: p?.sexo ?? '',
    telefono_contacto: p?.telefono_contacto ?? '',
    procede_otra_institucion: alumno?.procede_otra_institucion ?? false,
    nombre_institucion_origen: alumno?.nombre_institucion_origen ?? '',
    presenta_condicion_aprendizaje: alumno?.presenta_condicion_aprendizaje ?? false,
    ha_repetido_grado: alumno?.ha_repetido_grado ?? false,
    alergias: alumno?.alergias?.length ? [...alumno.alergias] : [],
    condiciones_aprendizaje: alumno?.condiciones_aprendizaje?.length
      ? [...alumno.condiciones_aprendizaje]
      : [],
    grados_repetidos: (alumno?.grados_repetidos ?? []).map((g) => ({
      id: idPorNombre(grados, g.grado_nombre),
      nombre: g.grado_nombre,
      anio: g.anio != null ? String(g.anio) : '',
    })),
    profesion: responsable?.profesion ?? '',
    direccion_domicilio: responsable?.direccion_domicilio ?? '',
  }
}

type Props = {
  code: string
  onClose: () => void
  onSaved?: () => void
}

/** Edita la ficha completa de una persona (perfil + datos del rol + foto), sin contraseña ni roles. */
export function PersonaEditModal({ code, onClose, onSaved }: Props) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['persona-ficha', code],
    queryFn: () => getFicha(code),
    enabled: Boolean(code),
  })
  const { data: grados = [] } = useQuery({ queryKey: ['grados'], queryFn: listGrados })

  const [form, setForm] = useState<FormState | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [dirty, setDirty] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)

  const fotoActual = useBovedaImage(data?.perfil?.path_imagen)

  useEffect(() => {
    if (!data || form) return
    setForm(buildSeed(data, grados))
    // `grados` puede llegar después; los ids se resuelven por nombre al render/guardar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, form])

  const esAlumno = Boolean(data?.alumno)
  const esResponsable = Boolean(data?.responsable)

  const update = (patch: Partial<FormState>) => {
    setForm((f) => (f ? { ...f, ...patch } : f))
    setDirty(true)
  }

  const gradoOptions = useMemo(
    () => grados.map((g) => ({ value: g.id, label: g.nombre, keywords: g.codigo })),
    [grados],
  )

  const valid = Boolean(form && form.primer_nombre.trim() && form.primer_apellido.trim())

  const buildPayload = (): PersonaUpdate | null => {
    if (!form) return null
    const payload: PersonaUpdate = {
      primer_nombre: form.primer_nombre.trim(),
      primer_apellido: form.primer_apellido.trim(),
      segundo_nombre: form.segundo_nombre.trim(),
      segundo_apellido: form.segundo_apellido.trim(),
      numero_identidad: form.numero_identidad.trim(),
      tipo_documento_identidad: form.tipo_documento_identidad.trim(),
      fecha_nacimiento: form.fecha_nacimiento || undefined,
      sexo: form.sexo || undefined,
      telefono_contacto: form.telefono_contacto.trim(),
    }
    if (esAlumno) {
      payload.procede_otra_institucion = form.procede_otra_institucion
      payload.nombre_institucion_origen = form.procede_otra_institucion
        ? form.nombre_institucion_origen.trim()
        : ''
      payload.presenta_condicion_aprendizaje = form.presenta_condicion_aprendizaje
      payload.ha_repetido_grado = form.ha_repetido_grado
      payload.alergias = form.alergias.map((a) => a.trim()).filter(Boolean)
      payload.condiciones_aprendizaje = form.presenta_condicion_aprendizaje
        ? form.condiciones_aprendizaje.map((c) => c.trim()).filter(Boolean)
        : []
      payload.grados_repetidos = form.ha_repetido_grado
        ? form.grados_repetidos
            .map((r) => {
              const grado_id = r.id || idPorNombre(grados, r.nombre)
              const anio = r.anio.trim() ? Number(r.anio) : undefined
              return { grado_id, ...(anio != null ? { anio } : {}) }
            })
            .filter((r) => r.grado_id)
        : []
    }
    if (esResponsable) {
      payload.profesion = form.profesion.trim()
      payload.direccion_domicilio = form.direccion_domicilio.trim()
      // El backend reemplaza las direcciones de trabajo: se conservan las cargadas.
      payload.direcciones_trabajo = (data?.responsable?.direcciones_trabajo ?? []).map((d) => ({
        direccion: d.direccion,
        telefono_trabajo: d.telefono_trabajo,
      }))
    }
    return payload
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = buildPayload()
      if (!payload) return
      if (foto) {
        try {
          const up = await upload(foto, 'perfil_foto')
          payload.path_imagen = up.object_key
        } catch (e) {
          throw new Error(uploadErrorMessage(e, 'perfil_foto'))
        }
      }
      return updatePersona(code, payload)
    },
    onSuccess: () => {
      toast.success('Datos de la persona actualizados')
      setConfirmSave(false)
      onSaved?.()
      onClose()
    },
    onError: (e) => {
      toast.error(userMessageFromError(e))
      setConfirmSave(false)
    },
  })

  const nombre = form ? joinName({ primer_nombre: form.primer_nombre, primer_apellido: form.primer_apellido } as UserFicha['perfil']) : ''

  return (
    <Modal
      open
      wide
      title="Editar datos de la persona"
      testId="persona-edit-modal"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <Can permission="personas:put">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="persona-edit-save"
              disabled={!dirty || !valid || saveMut.isPending}
              onClick={() => setConfirmSave(true)}
            >
              {saveMut.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </Can>
        </>
      }
    >
      {isLoading ? <div className="empty-state">Cargando datos…</div> : null}
      {isError ? (
        <div className="empty-state" role="alert">
          No se pudieron cargar los datos: {userMessageFromError(error)}
        </div>
      ) : null}

      {form ? (
        <>
          <div className="wizard-grid">
            <Field label="Primer nombre" htmlFor="pe-pn">
              <input
                id="pe-pn"
                className="field__input"
                value={form.primer_nombre}
                onChange={(e) => update({ primer_nombre: e.target.value })}
              />
            </Field>
            <Field label="Segundo nombre">
              <input
                className="field__input"
                value={form.segundo_nombre}
                onChange={(e) => update({ segundo_nombre: e.target.value })}
              />
            </Field>
            <Field label="Primer apellido" htmlFor="pe-pa">
              <input
                id="pe-pa"
                className="field__input"
                value={form.primer_apellido}
                onChange={(e) => update({ primer_apellido: e.target.value })}
              />
            </Field>
            <Field label="Segundo apellido">
              <input
                className="field__input"
                value={form.segundo_apellido}
                onChange={(e) => update({ segundo_apellido: e.target.value })}
              />
            </Field>
            <Field label="Tipo de documento">
              <Combobox
                allowCustom
                value={form.tipo_documento_identidad}
                onChange={(v) => update({ tipo_documento_identidad: v })}
                options={TIPO_DOC_OPTIONS}
                placeholder="Elegir o escribir…"
              />
            </Field>
            <Field label="Número de identidad">
              <input
                className="field__input"
                value={form.numero_identidad}
                onChange={(e) => update({ numero_identidad: e.target.value })}
              />
            </Field>
            <Field label="Fecha de nacimiento">
              <input
                type="date"
                className="field__input"
                value={form.fecha_nacimiento}
                onChange={(e) => update({ fecha_nacimiento: e.target.value })}
              />
            </Field>
            <Field label="Sexo">
              <Combobox
                value={form.sexo}
                onChange={(v) => update({ sexo: v })}
                options={SEXO_OPTIONS}
                placeholder="Seleccionar…"
              />
            </Field>
            <Field label="Teléfono de contacto">
              <input
                className="field__input"
                value={form.telefono_contacto}
                onChange={(e) => update({ telefono_contacto: e.target.value })}
              />
            </Field>
          </div>

          <p className="wizard-pane__title" style={{ marginTop: '1.25rem' }}>
            Foto de perfil
          </p>
          {fotoActual ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <img
                src={fotoActual}
                alt="Foto actual"
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }}
              />
              <span className="texto-muted" style={{ fontSize: '0.8rem' }}>
                Foto actual
              </span>
            </div>
          ) : (
            <p className="texto-muted" style={{ fontSize: '0.8rem', marginTop: 0 }}>
              Sin foto actual.
            </p>
          )}
          <PhotoCapture
            file={foto}
            onChange={(f) => {
              setFoto(f)
              setDirty(true)
            }}
          />

          {esAlumno ? (
            <>
              <p className="wizard-pane__title" style={{ marginTop: '1.25rem' }}>
                Datos del alumno
              </p>
              <label style={{ fontSize: '0.85rem', display: 'block', margin: '0 0 0.65rem' }}>
                <input
                  type="checkbox"
                  checked={form.procede_otra_institucion}
                  onChange={(e) =>
                    update({
                      procede_otra_institucion: e.target.checked,
                      nombre_institucion_origen: e.target.checked ? form.nombre_institucion_origen : '',
                    })
                  }
                />{' '}
                Procede de otra institución
              </label>
              {form.procede_otra_institucion ? (
                <Field label="Institución de origen">
                  <input
                    className="field__input"
                    value={form.nombre_institucion_origen}
                    onChange={(e) => update({ nombre_institucion_origen: e.target.value })}
                  />
                </Field>
              ) : null}

              <p style={{ margin: '0.75rem 0 0.5rem', fontWeight: 600 }}>Alergias</p>
              {form.alergias.map((a, i) => (
                <Field key={`al-${i}`} label={i === 0 ? 'Alergia' : `Alergia ${i + 1}`}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="field__input"
                      value={a}
                      onChange={(e) =>
                        update({ alergias: form.alergias.map((x, j) => (j === i ? e.target.value : x)) })
                      }
                    />
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => update({ alergias: form.alergias.filter((_, j) => j !== i) })}
                    >
                      Quitar
                    </button>
                  </div>
                </Field>
              ))}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => update({ alergias: [...form.alergias, ''] })}
              >
                Añadir alergia
              </button>

              <label style={{ fontSize: '0.85rem', display: 'block', margin: '1.25rem 0 0.65rem' }}>
                <input
                  type="checkbox"
                  checked={form.presenta_condicion_aprendizaje}
                  onChange={(e) =>
                    update({
                      presenta_condicion_aprendizaje: e.target.checked,
                      condiciones_aprendizaje: e.target.checked
                        ? form.condiciones_aprendizaje.length
                          ? form.condiciones_aprendizaje
                          : ['']
                        : [],
                    })
                  }
                />{' '}
                Presenta condición de aprendizaje
              </label>
              {form.presenta_condicion_aprendizaje ? (
                <>
                  {form.condiciones_aprendizaje.map((c, i) => (
                    <Field key={`co-${i}`} label={i === 0 ? 'Condición' : `Condición ${i + 1}`}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          className="field__input"
                          value={c}
                          onChange={(e) =>
                            update({
                              condiciones_aprendizaje: form.condiciones_aprendizaje.map((x, j) =>
                                j === i ? e.target.value : x,
                              ),
                            })
                          }
                        />
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() =>
                            update({
                              condiciones_aprendizaje: form.condiciones_aprendizaje.filter(
                                (_, j) => j !== i,
                              ),
                            })
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    </Field>
                  ))}
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() =>
                      update({ condiciones_aprendizaje: [...form.condiciones_aprendizaje, ''] })
                    }
                  >
                    Añadir condición
                  </button>
                </>
              ) : null}

              <label style={{ fontSize: '0.85rem', display: 'block', margin: '1.25rem 0 0.65rem' }}>
                <input
                  type="checkbox"
                  checked={form.ha_repetido_grado}
                  onChange={(e) =>
                    update({
                      ha_repetido_grado: e.target.checked,
                      grados_repetidos: e.target.checked
                        ? form.grados_repetidos.length
                          ? form.grados_repetidos
                          : [{ id: '', nombre: '', anio: '' }]
                        : [],
                    })
                  }
                />{' '}
                Ha repetido grado
              </label>
              {form.ha_repetido_grado ? (
                <>
                  {form.grados_repetidos.map((g, i) => {
                    const valor = g.id || idPorNombre(grados, g.nombre)
                    return (
                      <div className="wizard-grid" key={`gr-${i}`} style={{ marginBottom: '0.5rem' }}>
                        <Field label="Grado">
                          <Combobox
                            value={valor}
                            onChange={(v) =>
                              update({
                                grados_repetidos: form.grados_repetidos.map((x, j) =>
                                  j === i ? { ...x, id: v, nombre: nombreDeId(grados, v) } : x,
                                ),
                              })
                            }
                            options={gradoOptions}
                            placeholder="Buscar grado…"
                          />
                        </Field>
                        <Field label="Año (opcional)">
                          <input
                            className="field__input"
                            type="number"
                            min={1990}
                            max={2100}
                            value={g.anio}
                            onChange={(e) =>
                              update({
                                grados_repetidos: form.grados_repetidos.map((x, j) =>
                                  j === i ? { ...x, anio: e.target.value } : x,
                                ),
                              })
                            }
                          />
                        </Field>
                        <div className="wizard-grid--full">
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() =>
                              update({
                                grados_repetidos: form.grados_repetidos.filter((_, j) => j !== i),
                              })
                            }
                          >
                            Quitar grado
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() =>
                      update({
                        grados_repetidos: [...form.grados_repetidos, { id: '', nombre: '', anio: '' }],
                      })
                    }
                  >
                    Añadir grado repetido
                  </button>
                </>
              ) : null}
            </>
          ) : null}

          {esResponsable ? (
            <>
              <p className="wizard-pane__title" style={{ marginTop: '1.25rem' }}>
                Datos del responsable
              </p>
              <Field label="Profesión">
                <input
                  className="field__input"
                  value={form.profesion}
                  onChange={(e) => update({ profesion: e.target.value })}
                />
              </Field>
              <Field label="Dirección de domicilio">
                <input
                  className="field__input"
                  value={form.direccion_domicilio}
                  onChange={(e) => update({ direccion_domicilio: e.target.value })}
                />
              </Field>
            </>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={confirmSave}
        title="Guardar cambios"
        message={
          nombre
            ? `¿Guardar los cambios de ${nombre}?`
            : '¿Guardar los cambios de esta persona?'
        }
        confirmDisabled={saveMut.isPending}
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </Modal>
  )
}
