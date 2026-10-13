import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Can, useCan } from '#/components/gates/Can'
import { PhotoCapture } from '#/components/matricula/PhotoCapture'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { roleLabel } from '#/helpers/permissions'
import { periodoSelectOptions } from '#/helpers/periodos'
import { useBovedaImage } from '#/hooks/use-boveda-image'
import { userMessageFromError } from '#/lib/api'
import { upload, uploadErrorMessage } from '#/services/boveda'
import {
  listGrados,
  type Grado,
  type Modalidad,
  type Periodo,
  type Seccion,
} from '#/services/catalogos'
import { updateMatricula, type Matricula } from '#/services/matricula'
import {
  getFicha,
  updatePersona,
  type PersonaUpdate,
  type UserFicha,
} from '#/services/personas'
import { listRoles } from '#/services/roles'
import { updateRoles, updateStatus } from '#/services/users'

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

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
]

type GradoRow = { id: string; nombre: string; anio: string }

type FormState = {
  // rol del usuario (uno solo por usuario, DEC-015)
  rol: string
  // estado del usuario (ACTIVE/INACTIVE)
  estado: string
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

/** Primer (único) rol de la ficha; '' si no viene ninguno (un usuario = un rol, DEC-015). */
function rolPrincipal(ficha: UserFicha | undefined): string {
  const roles = ficha?.user.roles
  return roles?.length ? roles[0] : ''
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
    rol: rolPrincipal(ficha),
    estado: ficha.user.statususer || 'ACTIVE',
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
  /** Matrícula a editar en el mismo modal (opcional, para el uso combinado). */
  matricula?: Matricula
  /** Catálogos para la sección de matrícula (solo se usan si `matricula` viene). */
  periodos?: Periodo[]
  grados?: Grado[]
  modalidades?: Modalidad[]
  secciones?: Seccion[]
  /** Si es `false`, no se muestra ni se guarda el rol del usuario (p. ej. en matrícula). */
  permitirRol?: boolean
}

/** Edita la ficha completa de una persona (perfil + datos del rol + foto + rol/estado del usuario). */
export function PersonaEditModal({
  code,
  onClose,
  onSaved,
  matricula,
  periodos,
  grados: gradosProp,
  modalidades,
  secciones,
  permitirRol = true,
}: Props) {
  const { can, roles } = useCan()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['persona-ficha', code],
    queryFn: () => getFicha(code),
    enabled: Boolean(code),
  })
  const { data: gradosQuery = [] } = useQuery({ queryKey: ['grados'], queryFn: listGrados })
  // Reutiliza el catálogo que ya trae la página cuando se pasa como prop.
  const grados = gradosProp && gradosProp.length > 0 ? gradosProp : gradosQuery
  // Solo admin/admin_temporal tienen `users:put`; el resto no debe pedir la lista de roles.
  const puedeEditarRol = can('users:put')
  const { data: rolesData = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: listRoles,
    enabled: permitirRol && puedeEditarRol,
  })

  const [form, setForm] = useState<FormState | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [dirty, setDirty] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)

  const fotoActual = useBovedaImage(data?.perfil?.path_imagen)

  // Estado de la sección «Matrícula» (solo se usa cuando llega el prop `matricula`).
  const seccionesMat = useMemo(() => secciones ?? [], [secciones])
  const [matGradoId, setMatGradoId] = useState(() =>
    matricula ? (seccionesMat.find((s) => s.id === matricula.seccion_id)?.grado_id ?? '') : '',
  )
  const [matSeccionId, setMatSeccionId] = useState(matricula?.seccion_id ?? '')
  const [matPeriodoId, setMatPeriodoId] = useState(matricula?.periodo_academico_id ?? '')
  const [matEsReingreso, setMatEsReingreso] = useState(matricula?.es_reingreso ?? false)
  const [matStatus, setMatStatus] = useState(matricula?.status ?? 'ACTIVE')

  const seccionesFiltradas = useMemo(
    () => (matGradoId ? seccionesMat.filter((s) => s.grado_id === matGradoId) : seccionesMat),
    [seccionesMat, matGradoId],
  )

  useEffect(() => {
    if (!data || form) return
    setForm(buildSeed(data, grados))
    // `grados` puede llegar después; los ids se resuelven por nombre al render/guardar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, form])

  const esAlumno = Boolean(data?.alumno)
  const esResponsable = Boolean(data?.responsable)

  // Rol activo de la sesión (un usuario = un rol; se envía en X-Active-Role).
  const rolActivo = roles[0]
  const objetivoEsAdmin = (data?.user.roles ?? []).includes('admin')
  // Un admin solo puede ser modificado por otro admin (tampoco admin_temporal).
  const soloLectura = Boolean(data && objetivoEsAdmin && rolActivo !== 'admin')

  const rolActual = rolPrincipal(data)
  const rolOptions = useMemo(() => {
    return rolesData
      .filter((r) => r.status === 'ACTIVE' || r.name === rolActual)
      .map((r) => ({ value: r.name, label: roleLabel(r.name), keywords: r.name }))
  }, [rolesData, rolActual])

  const update = (patch: Partial<FormState>) => {
    setForm((f) => (f ? { ...f, ...patch } : f))
    setDirty(true)
  }

  const gradoOptions = useMemo(
    () => grados.map((g) => ({ value: g.id, label: g.nombre, keywords: g.codigo })),
    [grados],
  )

  const valid = Boolean(
    form && form.primer_nombre.trim() && form.primer_apellido.trim() && (!matricula || matSeccionId),
  )

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
      // 1) datos de la persona; 2) rol/estado solo si cambió (un usuario = un rol, DEC-015).
      await updatePersona(code, payload)
      const nuevoRol = form?.rol ?? ''
      const original = rolPrincipal(data)
      if (permitirRol && puedeEditarRol && nuevoRol && nuevoRol !== original) {
        await updateRoles(code, [nuevoRol])
      }
      const nuevoEstado = form?.estado ?? ''
      const estadoOriginal = data?.user.statususer ?? ''
      if (permitirRol && puedeEditarRol && nuevoEstado && nuevoEstado !== estadoOriginal) {
        await updateStatus(code, nuevoEstado)
      }
      // 3) matrícula, solo en el uso combinado.
      if (matricula) {
        await updateMatricula(matricula.id, {
          seccion_id: matSeccionId,
          periodo_academico_id: matPeriodoId,
          es_reingreso: matEsReingreso,
          status: matStatus,
        })
      }
    },
    onSuccess: () => {
      toast.success(matricula ? 'Alumno actualizado' : 'Datos de la persona actualizados')
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
      title={matricula ? 'Editar alumno' : 'Editar datos de la persona'}
      testId="persona-edit-modal"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          {soloLectura ? null : (
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
          )}
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
        <fieldset
          disabled={soloLectura}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          {soloLectura ? (
            <p className="empty-state" role="alert" data-testid="persona-edit-readonly-note">
              El administrador solo puede ser modificado por un administrador
            </p>
          ) : null}

          <p className="wizard-pane__title">Foto de perfil</p>
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

          <p className="wizard-pane__title" style={{ marginTop: '1.25rem' }}>
            Datos personales
          </p>
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

          {permitirRol ? (
            <Can permission="users:put">
              <div className="wizard-grid" style={{ marginTop: '1.25rem', maxWidth: 700 }}>
                <Field label="Rol">
                  <Combobox
                    value={form.rol}
                    onChange={(v) => update({ rol: v })}
                    options={rolOptions}
                    placeholder="Buscar rol…"
                    data-testid="persona-edit-rol"
                  />
                </Field>
                <Field label="Estado">
                  <Combobox
                    value={form.estado}
                    onChange={(v) => update({ estado: v })}
                    options={STATUS_OPTIONS}
                    placeholder="Buscar estado…"
                    data-testid="persona-edit-estado"
                  />
                </Field>
              </div>
            </Can>
          ) : null}

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

          {matricula ? (
            <>
              <p className="wizard-pane__title" style={{ marginTop: '1.25rem' }}>
                Matrícula
              </p>
              <div className="wizard-grid">
                <Field label="Grado">
                  <Combobox
                    value={matGradoId}
                    onChange={(v) => {
                      setMatGradoId(v)
                      const actual = seccionesMat.find((s) => s.id === matSeccionId)
                      if (actual && actual.grado_id !== v) setMatSeccionId('')
                      setDirty(true)
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
                    value={matSeccionId}
                    onChange={(v) => {
                      setMatSeccionId(v)
                      setDirty(true)
                    }}
                    options={seccionesFiltradas.map((s) => {
                      const g = grados.find((x) => x.id === s.grado_id)
                      const m = modalidades?.find((x) => x.id === s.modalidad_id)
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
                    value={matPeriodoId}
                    onChange={(v) => {
                      setMatPeriodoId(v)
                      setDirty(true)
                    }}
                    options={periodoSelectOptions(periodos ?? [])}
                    placeholder="Buscar periodo…"
                    data-testid="matricula-edit-periodo"
                  />
                </Field>
                <Field label="Estado">
                  <Combobox
                    value={matStatus}
                    onChange={(v) => {
                      setMatStatus(v)
                      setDirty(true)
                    }}
                    options={STATUS_OPTIONS}
                    placeholder="Buscar estado…"
                    data-testid="matricula-edit-status"
                  />
                </Field>
              </div>
              <label style={{ fontSize: '0.85rem', display: 'block', margin: '0.25rem 0 1rem' }}>
                <input
                  type="checkbox"
                  checked={matEsReingreso}
                  onChange={(e) => {
                    setMatEsReingreso(e.target.checked)
                    setDirty(true)
                  }}
                  data-testid="matricula-edit-reingreso"
                />{' '}
                El alumno es un reingreso
              </label>
            </>
          ) : null}
        </fieldset>
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
