import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, Camera, CheckCircle, GraduationCap, Upload, X } from 'lucide-react'
import { Field } from '#/components/ui/Field'
import { Combobox } from '#/components/ui/Combobox'
import { PhotoCapture } from '#/components/matricula/PhotoCapture'
import { userMessageFromError } from '#/lib/api'
import { hora12 } from '#/lib/examenes'
import {
  corregirPrematricula,
  editarPrematricula,
  enviarPrematricula,
  enviarReingreso,
  getHijosPrematricula,
  subirReciboPrematricula,
  subirFotoPrematricula,
} from '#/services/prematricula'
import type {
  DatosPrematricula,
  OpcionesPrematricula,
  ResponsablePrematricula,
  SolicitudPrematricula,
} from '#/services/prematricula'
import type { PersonaUpdate } from '#/services/personas'

const personaVacia = (): PersonaUpdate => ({
  primer_nombre: '',
  segundo_nombre: '',
  primer_apellido: '',
  segundo_apellido: '',
  tipo_documento_identidad: 'HND',
  fecha_nacimiento: '',
  sexo: '',
  numero_identidad: '',
  telefono_contacto: '',
})
const responsableVacio = (): ResponsablePrematricula => ({
  ...personaVacia(),
  parentesco: '',
  es_principal: true,
  profesion: '',
  direccion_domicilio: '',
})
const camposPersona = [
  ['primer_nombre', 'Primer nombre', 'text', true],
  ['segundo_nombre', 'Segundo nombre', 'text', false],
  ['primer_apellido', 'Primer apellido', 'text', true],
  ['segundo_apellido', 'Segundo apellido', 'text', false],
  ['numero_identidad', 'Identidad', 'text', false],
  ['fecha_nacimiento', 'Fecha de nacimiento', 'date', true],
  ['telefono_contacto', 'Teléfono', 'tel', false],
] as const

function PersonaCampos({
  value,
  onChange,
}: {
  value: PersonaUpdate
  onChange: (p: PersonaUpdate) => void
}) {
  return (
    <div className="pre-grid">
      {camposPersona.map(([key, label, type, required]) => (
        <Field key={key} label={`${label}${required ? ' *' : ''}`}>
          <input
            className="field__input"
            type={type}
            required={required}
            value={value[key] ?? ''}
            maxLength={
              key === 'numero_identidad'
                ? 13
                : key === 'telefono_contacto'
                  ? 8
                  : 120
            }
            pattern={
              key === 'numero_identidad'
                ? '[0-9]{13}'
                : key === 'telefono_contacto'
                  ? '[0-9]{8}'
                  : undefined
            }
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </Field>
      ))}
      <Field label="Sexo *">
        <select
          className="field__select"
          required
          value={value.sexo ?? ''}
          onChange={(e) => onChange({ ...value, sexo: e.target.value })}
        >
          <option value="">Seleccionar</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
          <option value="Otro">Otro</option>
        </select>
      </Field>
    </div>
  )
}

export function PrematriculaForm({
  opciones,
  tipo = 'nuevo',
  inicial,
  codigo,
  revision = false,
  onSuccess,
  onCancel,
}: {
  opciones: OpcionesPrematricula
  tipo?: 'nuevo' | 'reingreso'
  inicial?: SolicitudPrematricula
  codigo?: string
  revision?: boolean
  onSuccess: (s: SolicitudPrematricula) => void
  onCancel: () => void
}) {
  const reingreso = (inicial?.tipo ?? tipo) === 'reingreso'
  const [paso, setPaso] = useState(0)
  const [datos, setDatos] = useState<DatosPrematricula>(
    () =>
      inicial?.datos ?? {
        alumno: personaVacia(),
        responsables: [responsableVacio()],
      },
  )
  const [alumnoId, setAlumnoId] = useState(inicial?.alumno_id ?? '')
  const [observaciones, setObservaciones] = useState(
    inicial?.observaciones ?? '',
  )
  const [recibo, setRecibo] = useState<File | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const hijos = useQuery({
    queryKey: ['prematricula-hijos'],
    queryFn: getHijosPrematricula,
    enabled: reingreso && !inicial,
  })
  const elegido = hijos.data?.find((h) => h.alumno_id === alumnoId)
  const resultadoReingreso = elegido?.sugerencia.resultado
  const gradoReingreso = resultadoReingreso
    ? resultadoReingreso.aprueba
      ? elegido?.sugerencia.grado_sugerido
      : elegido?.sugerencia.grado_actual
    : elegido?.sugerencia.grado_sugerido
  const alumno = datos.alumno ?? personaVacia()
  const modalidadElegida = opciones.modalidades.find((m) => m.id === datos.modalidad_id)
  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const diasModalidad = (modalidadElegida?.dias ?? []).map((dia) => nombresDias[dia - 1]).filter(Boolean)
  const gradoMatricula = reingreso
    ? gradoReingreso?.id ?? inicial?.datos.grado_id
    : datos.grado_id
  const montoMatricula = gradoMatricula ? opciones.costos_matricula[gradoMatricula] : undefined
  const steps = reingreso
    ? [
        { id: 'alumno', label: 'Alumno y resultado' },
        { id: 'recibo', label: 'Recibo' },
        { id: 'observaciones', label: 'Observaciones' },
        { id: 'resumen', label: 'Resumen' },
      ]
    : [
        { id: 'alumno', label: 'Alumno' },
        { id: 'historial', label: 'Historial' },
        { id: 'academico', label: 'Académico' },
        { id: 'responsables', label: 'Responsables' },
        { id: 'foto', label: 'Foto' },
        { id: 'recibo', label: 'Recibo' },
        { id: 'observaciones', label: 'Observaciones' },
        { id: 'resumen', label: 'Resumen' },
      ]
  const final = paso === steps.length - 1
  const reciboStep = steps.findIndex((step) => step.id === 'recibo')
  const observacionesStep = steps.findIndex((step) => step.id === 'observaciones')
  const resumenStep = steps.findIndex((step) => step.id === 'resumen')
  const fullName = [alumno.primer_nombre, alumno.segundo_nombre, alumno.primer_apellido, alumno.segundo_apellido].filter(Boolean).join(' ')
  useEffect(() => {
    const modalBody = formRef.current?.closest('.modal__body')
    modalBody?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [paso])
  const save = useMutation({
    mutationFn: async () => {
      const finalDatos =
        foto && datos.alumno
          ? {
              ...datos,
              alumno: {
                ...datos.alumno,
                path_imagen: (await subirFotoPrematricula(foto)).object_key,
              },
            }
          : datos
      const recibo_key = recibo
        ? (await subirReciboPrematricula(recibo)).object_key
        : (inicial?.recibo_key ?? '')
      if (!recibo_key)
        throw new Error('Adjunta el recibo del pago de matrícula.')
      if (revision && inicial)
        return editarPrematricula(inicial.id, {
          datos: finalDatos,
          observaciones,
        })
      if (codigo)
        return corregirPrematricula({
          codigo,
          datos: finalDatos,
          observaciones,
          recibo_key,
        })
      if (reingreso)
        return enviarReingreso({
          alumno_id: alumnoId,
          datos: finalDatos,
          observaciones,
          recibo_key,
        })
      return enviarPrematricula({
        tipo: 'nuevo',
        datos: finalDatos,
        observaciones,
        recibo_key,
      })
    },
    onSuccess,
    onError: (e) => setError(userMessageFromError(e)),
  })
  const updateAlumno = (p: PersonaUpdate) =>
    setDatos((d) => ({ ...d, alumno: p }))
  const responsables = datos.responsables ?? []
  const updateResp = (index: number, p: ResponsablePrematricula) =>
    setDatos((d) => ({
      ...d,
      responsables: responsables.map((r, i) => (i === index ? p : r)),
    }))
  const avanzar = () => {
    if (reingreso && !inicial && (!elegido || !elegido.sugerencia.resultado)) {
      setError('Selecciona un alumno que tenga resultado académico confirmado.')
      return
    }
    if (!reingreso && paso === 3 && (datos.responsables ?? []).some((r) => !r.parentesco.trim() || !r.profesion?.trim() || !r.direccion_domicilio?.trim())) {
      setError('Completa el parentesco, la profesión y la dirección de cada responsable.')
      return
    }
    setError('')
    setPaso((p) => p + 1)
  }
  return (
    <form
      ref={formRef}
      className="pre-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (final) {
          save.mutate()
          return
        }
        if (paso === reciboStep && !revision && !recibo && !inicial?.recibo_key) {
          setError('Adjunta el recibo del pago de matrícula para continuar.')
          return
        }
        avanzar()
      }}
    >
      <div className="pre-step-caption" aria-live="polite">
        <strong>{steps[paso]?.label}</strong>
        <span>{paso + 1}/{steps.length}</span>
      </div>
      {error && (
        <p className="pre-alert" role="alert">
          {error}
        </p>
      )}
      {reingreso && paso === 0 && (
        <section>
          <h2>Reingreso</h2>
          {hijos.isPending && !inicial && (
            <p role="status">Cargando alumnos…</p>
          )}
          {hijos.isError && (
            <p role="alert">{userMessageFromError(hijos.error)}</p>
          )}
          {!inicial && (
            <Field label="Alumno *">
              <select
                className="field__select"
                required
                value={alumnoId}
                onChange={(e) => {
                  setAlumnoId(e.target.value)
                  setDatos({})
                }}
              >
                <option value="">Seleccionar alumno</option>
                {hijos.data?.map((h) => (
                  <option key={h.alumno_id} value={h.alumno_id}>
                    {h.nombre} · {h.user_code}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {inicial && <h3>{inicial.alumno_nombre ?? 'Datos de reingreso'}</h3>}
          {elegido && (
            <>
              <div className="pre-promotion">
                <GraduationCap size={42} />
                <div>
                  <small>Grado anterior</small>
                  <strong>{elegido.sugerencia.grado_actual?.nombre}</strong>
                </div>
                <ArrowRight size={36} />
                <div>
                  <small>
                    {elegido.sugerencia.resultado?.aprueba ? 'Siguiente' : 'Repite'}
                  </small>
                  <strong>
                    {gradoReingreso?.nombre ?? 'Pendiente'}
                  </strong>
                </div>
              </div>
              {elegido.sugerencia.resultado?.aprueba === false && elegido.sugerencia.resultado.reprobadas > 0 && (
                <p className="pre-alert">
                  Repite por {elegido.sugerencia.resultado.reprobadas}{' '}
                  {elegido.sugerencia.resultado.reprobadas === 1 ? 'clase reprobada' : 'clases reprobadas'}.
                </p>
              )}
              {elegido.promedio != null && (
                <p className="pre-average">
                  Promedio final <strong>{elegido.promedio.toFixed(1)}%</strong>
                </p>
              )}
              {elegido.sugerencia.retrasadas.length > 0 && (
                <p>
                  Clases retrasadas:
                  <ul>
                    {elegido.sugerencia.retrasadas.map((r) => (
                      <li key={r.curso_id}>{r.curso}: {r.final}%</li>
                    ))}
                  </ul>
                </p>
              )}
              {elegido.ficha?.perfil && (
                <dl className="pre-grid">
                  {Object.entries(elegido.ficha.perfil)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k.replaceAll('_', ' ')}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                </dl>
              )}
              {elegido.ficha?.alumno && (
                <section>
                  <h3>Datos registrados</h3>
                  <p>
                    Alergias:{' '}
                    {elegido.ficha.alumno.alergias.join(', ') ||
                      'No registradas'}
                  </p>
                  <p>
                    Condiciones de aprendizaje:{' '}
                    {elegido.ficha.alumno.condiciones_aprendizaje.join(', ') ||
                      'No registradas'}
                  </p>
                  <h4>Responsables</h4>
                  {elegido.ficha.alumno.responsables.map((r, i) => (
                    <p key={i}>
                      {r.nombre} · {r.parentesco} · {r.telefono ?? ''}
                    </p>
                  ))}
                </section>
              )}
            </>
          )}
        </section>
      )}
      {!reingreso && paso === 0 && (
        <section>
          <h2>Datos del alumno</h2>
          <PersonaCampos value={alumno} onChange={updateAlumno} />
        </section>
      )}
      {!reingreso && paso === 1 && (
        <section>
          <h2>Historial del alumno</h2>
          <div className="pre-grid">
            <Field label="Institución de procedencia (opcional)">
              <input
                className="field__input"
                value={alumno.nombre_institucion_origen ?? ''}
                onChange={(e) =>
                  updateAlumno({
                    ...alumno,
                    nombre_institucion_origen: e.target.value,
                    procede_otra_institucion: Boolean(e.target.value.trim()),
                  })
                }
              />
            </Field>
            <section className="pre-repeatable-fields">
              <label className="pre-choice-check">
                <input
                  type="checkbox"
                  checked={(alumno.alergias ?? []).length > 0}
                  onChange={(e) => updateAlumno({
                    ...alumno,
                    alergias: e.target.checked ? [''] : [],
                  })}
                />
                <span><strong>¿Tiene alergias?</strong><small>Marca esta opción para agregarlas.</small></span>
              </label>
              {(alumno.alergias ?? []).length > 0 && (
                <div className="pre-repeatable-fields__list">
                  {(alumno.alergias ?? []).map((alergia, index) => (
                    <div className="pre-repeatable-row" key={`alergia-${index}`}>
                      <Field label={`Alergia ${index + 1}`}>
                        <input className="field__input" value={alergia} onChange={(e) => updateAlumno({ ...alumno, alergias: (alumno.alergias ?? []).map((item, i) => i === index ? e.target.value : item) })} />
                      </Field>
                      <button type="button" className="pre-repeatable-row__remove" aria-label={`Quitar alergia ${index + 1}`} title="Quitar" onClick={() => updateAlumno({ ...alumno, alergias: (alumno.alergias ?? []).filter((_, i) => i !== index) })}><X size={17} /></button>
                    </div>
                  ))}
                  <button type="button" className="btn btn--secondary pre-add-full" onClick={() => updateAlumno({ ...alumno, alergias: [...(alumno.alergias ?? []), ''] })}>Más</button>
                </div>
              )}
            </section>
            <section className="pre-repeatable-fields">
              <label className="pre-choice-check">
                <input
                  type="checkbox"
                  checked={(alumno.condiciones_aprendizaje ?? []).length > 0}
                  onChange={(e) => updateAlumno({
                    ...alumno,
                    condiciones_aprendizaje: e.target.checked ? [''] : [],
                    presenta_condicion_aprendizaje: e.target.checked,
                  })}
                />
                <span><strong>¿Tiene condiciones especiales?</strong><small>Marca esta opción para describirlas.</small></span>
              </label>
              {(alumno.condiciones_aprendizaje ?? []).length > 0 && (
                <div className="pre-repeatable-fields__list">
                  {(alumno.condiciones_aprendizaje ?? []).map((condicion, index) => (
                    <div className="pre-repeatable-row" key={`condicion-${index}`}>
                      <Field label={`Condición especial ${index + 1}`}>
                        <input className="field__input" value={condicion} onChange={(e) => updateAlumno({ ...alumno, condiciones_aprendizaje: (alumno.condiciones_aprendizaje ?? []).map((item, i) => i === index ? e.target.value : item), presenta_condicion_aprendizaje: true })} />
                      </Field>
                      <button type="button" className="pre-repeatable-row__remove" aria-label={`Quitar condición especial ${index + 1}`} title="Quitar" onClick={() => { const next = (alumno.condiciones_aprendizaje ?? []).filter((_, i) => i !== index); updateAlumno({ ...alumno, condiciones_aprendizaje: next, presenta_condicion_aprendizaje: next.length > 0 }) }}><X size={17} /></button>
                    </div>
                  ))}
                  <button type="button" className="btn btn--secondary pre-add-full" onClick={() => updateAlumno({ ...alumno, condiciones_aprendizaje: [...(alumno.condiciones_aprendizaje ?? []), ''], presenta_condicion_aprendizaje: true })}>Más</button>
                </div>
              )}
            </section>
            <label>
              <input
                type="checkbox"
                checked={alumno.ha_repetido_grado ?? false}
                onChange={(e) =>
                  updateAlumno({
                    ...alumno,
                    ha_repetido_grado: e.target.checked,
                  })
                }
              />{' '}
              Ha repetido algún grado
            </label>
          </div>
          {alumno.ha_repetido_grado && (
            <>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() =>
                  updateAlumno({
                    ...alumno,
                    grados_repetidos: [
                      ...(alumno.grados_repetidos ?? []),
                      { grado_id: '' },
                    ],
                  })
                }
              >
                Agregar grado repetido
              </button>
              {alumno.grados_repetidos?.map((g, i) => (
                <div key={i} className="pre-grid">
                  <Field label="Grado repetido *">
                    <select
                      required
                      className="field__select"
                      value={g.grado_id}
                      onChange={(e) =>
                        updateAlumno({
                          ...alumno,
                          grados_repetidos: alumno.grados_repetidos?.map(
                            (v, n) =>
                              n === i ? { ...v, grado_id: e.target.value } : v,
                          ),
                        })
                      }
                    >
                      <option value="">Seleccionar</option>
                      {opciones.grados.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Año">
                    <input
                      className="field__input"
                      type="number"
                      min="1900"
                      max="2200"
                      value={g.anio ?? ''}
                      onChange={(e) =>
                        updateAlumno({
                          ...alumno,
                          grados_repetidos: alumno.grados_repetidos?.map(
                            (v, n) =>
                              n === i
                                ? {
                                    ...v,
                                    anio: Number(e.target.value) || undefined,
                                  }
                                : v,
                          ),
                        })
                      }
                    />
                  </Field>
                </div>
              ))}
            </>
          )}
        </section>
      )}
      {!reingreso && paso === 2 && (
        <section>
          <h2>Datos académicos</h2>
          <div className="pre-grid">
            <Field label="Grado solicitado *">
              <select
                className="field__select"
                required
                value={datos.grado_id ?? ''}
                onChange={(e) =>
                  setDatos({
                    ...datos,
                    grado_id: e.target.value,
                    seccion_id: '',
                  })
                }
              >
                <option value="">Seleccionar</option>
                {opciones.grados.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Modalidad *">
              <select
                className="field__select"
                required
                value={datos.modalidad_id ?? ''}
                onChange={(e) =>
                  setDatos({
                    ...datos,
                    modalidad_id: e.target.value,
                    seccion_id: '',
                  })
                }
              >
                <option value="">Seleccionar</option>
                {opciones.modalidades.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {modalidadElegida && (
            <aside className="pre-modalidad-resumen" aria-live="polite">
              <div className="pre-modalidad-resumen__top"><GraduationCap aria-hidden="true" /><div><span>Horario de la modalidad</span><strong>{modalidadElegida.nombre}</strong></div></div>
              <div className="pre-modalidad-resumen__details">
                <div><small>Inicia</small><strong>{hora12(modalidadElegida.hora_inicio)}</strong></div>
                <div><small>Finaliza</small><strong>{hora12(modalidadElegida.hora_fin)}</strong></div>
                <div className="pre-modalidad-resumen__days"><small>Días de clase</small><strong>{diasModalidad.length ? diasModalidad.join(' · ') : 'Días no especificados'}</strong></div>
              </div>
            </aside>
          )}
        </section>
      )}
      {!reingreso && paso === 3 && (
        <section>
          <h2>Responsables</h2>
          {responsables.map((r, i) => (
            <fieldset className="pre-persona" key={i}>
              <legend>Responsable {i + 1}</legend>
              <PersonaCampos
                value={r}
                onChange={(p) => updateResp(i, { ...r, ...p })}
              />
              <div className="pre-grid">
                {(
                  ['parentesco', 'profesion', 'direccion_domicilio'] as const
                ).map((k) => (
                  <Field
                    key={k}
                    label={
                      {
                        parentesco: 'Parentesco *',
                        profesion: 'Profesión *',
                        direccion_domicilio: 'Dirección del domicilio *',
                      }[k]
                    }
                  >
                    {k === 'parentesco' || k === 'profesion' ? (
                      <Combobox
                        value={r[k] ?? ''}
                        onChange={(value) => updateResp(i, { ...r, [k]: value })}
                        options={(k === 'parentesco' ? opciones.parentescos : opciones.profesiones).map((item) => ({ value: item.nombre, label: item.nombre }))}
                        placeholder="Elegir o escribir…"
                        allowCustom
                        emptyLabel={`Escribe para agregar ${k === 'parentesco' ? 'un parentesco' : 'una profesión'}`}
                      />
                    ) : (
                      <input
                        className="field__input"
                        required
                        value={r[k] ?? ''}
                        onChange={(e) => updateResp(i, { ...r, [k]: e.target.value })}
                      />
                    )}
                  </Field>
                ))}
              </div>
              <div className="pre-grid pre-persona__trabajo">
                <Field label="Dirección o lugar de trabajo (opcional)">
                  <input
                    className="field__input"
                    value={r.direcciones_trabajo?.[0]?.direccion ?? ''}
                    onChange={(e) => {
                      const direcciones = [...(r.direcciones_trabajo ?? [])]
                      direcciones[0] = { ...(direcciones[0] ?? { direccion: '' }), direccion: e.target.value }
                      updateResp(i, { ...r, direcciones_trabajo: direcciones })
                    }}
                  />
                </Field>
                <Field label="Teléfono del trabajo (opcional)">
                  <input
                    className="field__input"
                    inputMode="numeric"
                    maxLength={8}
                    pattern="[0-9]{8}"
                    placeholder="88721992"
                    value={r.direcciones_trabajo?.[0]?.telefono_trabajo ?? ''}
                    onChange={(e) => {
                      const direcciones = [...(r.direcciones_trabajo ?? [])]
                      direcciones[0] = { ...(direcciones[0] ?? { direccion: '' }), telefono_trabajo: e.target.value.replace(/\D/g, '').slice(0, 8) }
                      updateResp(i, { ...r, direcciones_trabajo: direcciones })
                    }}
                  />
                </Field>
              </div>
              <label>
                <input
                  type="radio"
                  name="principal"
                  checked={r.es_principal}
                  onChange={() =>
                    setDatos({
                      ...datos,
                      responsables: responsables.map((v, n) => ({
                        ...v,
                        es_principal: i === n,
                      })),
                    })
                  }
                />{' '}
                Responsable principal
              </label>
              {responsables.length > 1 && (
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => {
                    const next = responsables.filter((_, n) => n !== i)
                    if (!next.some((v) => v.es_principal))
                      next[0].es_principal = true
                    setDatos({ ...datos, responsables: next })
                  }}
                >
                  Quitar responsable
                </button>
              )}
            </fieldset>
          ))}
          <button
            className="btn btn--secondary"
            type="button"
            onClick={() =>
              setDatos({
                ...datos,
                responsables: [
                  ...responsables,
                  { ...responsableVacio(), es_principal: false },
                ],
              })
            }
          >
            Agregar responsable
          </button>
        </section>
      )}
      {!reingreso && paso === 4 && (
        <section>
          <h2>Fotografía del alumno</h2>
          <p className="wizard-pane__hint">Este paso es opcional. Puedes cargar una imagen o tomar una foto ahora.</p>
          {alumno.path_imagen && <p>Ya hay una foto adjunta. Puedes sustituirla.</p>}
          <PhotoCapture file={foto} onChange={setFoto} />
        </section>
      )}
      {paso === reciboStep && (
        <section>
          <h2>Recibo del pago de matrícula</h2>
          <aside className="pre-fee-summary" aria-live="polite">
            <span>Monto de matrícula</span>
            {montoMatricula == null ? (
              <strong>Selecciona primero el grado para consultar el monto.</strong>
            ) : (
              <strong>L {montoMatricula.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            )}
            <small>Correspondiente al período de destino configurado.</small>
          </aside>
          <p>El recibo es necesario para enviar la solicitud.</p>
          {!revision && (
            <div className="pre-receipt-picker">
              <label className="pre-receipt-picker__camera btn btn--primary" htmlFor="prematricula-recibo-foto">
                <Camera aria-hidden="true" size={19} />
                Tomar foto
              </label>
              <input id="prematricula-recibo-foto" className="pre-file-hidden" type="file" accept="image/*" capture="environment" onChange={(e) => setRecibo(e.target.files?.[0] ?? null)} />
              <label className="pre-receipt-picker__upload btn btn--secondary" htmlFor="prematricula-recibo-archivo">
                <Upload aria-hidden="true" size={18} />
                Cargar archivo
              </label>
              <input
                id="prematricula-recibo-archivo"
                className="pre-file-hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setRecibo(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
          {recibo && <p className="pre-receipt-picked" role="status">Archivo seleccionado: <strong>{recibo.name}</strong></p>}
          {inicial?.recibo_key && (
            <p>{recibo ? 'El recibo anterior será sustituido.' : 'La solicitud ya tiene un recibo adjunto.'}</p>
          )}
        </section>
      )}
      {paso === observacionesStep && (
        <section>
          <h2>Observaciones</h2>
          <p>Agrega cualquier información adicional que ayude a revisar la solicitud. Este campo es opcional.</p>
          <Field label="Observaciones (opcional)">
            <textarea
              className="field__textarea"
              rows={4}
              maxLength={5000}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Field>
        </section>
      )}
      {paso === resumenStep && (
        <section className="pre-submission-summary">
          <h2>Resumen de la prematrícula</h2>
          <p>Revisa la información antes de enviar la solicitud.</p>
          <dl className="pre-submission-summary__grid">
            <div><dt>Tipo de solicitud</dt><dd>{reingreso ? 'Reingreso' : 'Nuevo ingreso'}</dd></div>
            <div><dt>Alumno</dt><dd>{reingreso ? elegido?.nombre ?? inicial?.alumno_nombre ?? 'Alumno seleccionado' : fullName || 'Datos del alumno'}</dd></div>
            {!reingreso && <div><dt>Grado solicitado</dt><dd>{opciones.grados.find((g) => g.id === datos.grado_id)?.nombre ?? '—'}</dd></div>}
            {!reingreso && <div><dt>Modalidad</dt><dd>{modalidadElegida?.nombre ?? '—'}</dd></div>}
            <div><dt>Monto de matrícula</dt><dd>{montoMatricula == null ? 'No disponible' : `L ${montoMatricula.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</dd></div>
            {!reingreso && <div><dt>Responsables registrados</dt><dd>{responsables.length}</dd></div>}
            <div><dt>Recibo</dt><dd>{recibo?.name ?? (inicial?.recibo_key ? 'Recibo adjunto' : '—')}</dd></div>
            <div className="pre-submission-summary__full"><dt>Observaciones</dt><dd>{observaciones.trim() || 'Sin observaciones'}</dd></div>
          </dl>
          <p className="pre-submission-summary__notice"><CheckCircle size={18} /> Los datos serán revisados antes de registrar la matrícula.</p>
        </section>
      )}
      <div className="pre-actions">
        <button
          className="btn btn--ghost"
          type="button"
          disabled={save.isPending}
          onClick={onCancel}
        >
          Cancelar
        </button>
        {paso > 0 && (
          <button
            className="btn btn--secondary"
            type="button"
            disabled={save.isPending}
            onClick={() => setPaso((p) => p - 1)}
          >
            Anterior
          </button>
        )}
        <button
          className="btn btn--primary"
          type="submit"
          disabled={save.isPending}
        >
          {save.isPending
            ? 'Enviando…'
            : final
              ? revision
                ? 'Guardar cambios'
                : codigo
                  ? 'Corregir y reenviar'
                  : 'Enviar prematrícula'
              : 'Siguiente'}
        </button>
      </div>
    </form>
  )
}
