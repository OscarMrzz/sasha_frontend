import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PhotoCapture } from '#/components/matricula/PhotoCapture'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Combobox } from '#/components/ui/Combobox'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { WizardSteps } from '#/components/ui/WizardSteps'
import { userMessageFromError } from '#/lib/api'
import { upload } from '#/services/boveda'
import { periodoSelectOptions } from '#/helpers/periodos'
import type { Curso, Grado, ListaItem, Modalidad, Periodo, Seccion } from '#/services/catalogos'
import {
  listAlergias,
  listCondicionesAprendizaje,
  listParentescos,
  listProfesiones,
} from '#/services/catalogos'
import { createMatricula, linkResponsable } from '#/services/matricula'
import { createAlumno, createResponsable, getResponsableByCode } from '#/services/personas'
import { createUser } from '#/services/users'

const STEPS = [
  { id: 'alumno', label: 'Alumno' },
  { id: 'historial', label: 'Historial' },
  { id: 'academico', label: 'Académico' },
  { id: 'responsables', label: 'Responsables' },
  { id: 'foto', label: 'Foto' },
  { id: 'confirmar', label: 'Confirmar' },
] as const

const SEXO_OPTIONS = [
  { value: 'M', label: 'Masculino', keywords: 'M masculino hombre' },
  { value: 'F', label: 'Femenino', keywords: 'F femenino mujer' },
  { value: 'Otro', label: 'Otro', keywords: 'otro' },
]

type BoolChoice = boolean | null

type AlumnoForm = {
  primer_nombre: string
  segundo_nombre: string
  primer_apellido: string
  segundo_apellido: string
  sexo: string
  fecha_nacimiento: string
  telefono_contacto: string
  numero_identidad: string
}

type HistorialForm = {
  procede_otra_institucion: BoolChoice
  nombre_institucion_origen: string
  alergias: string[]
  presenta_condicion_aprendizaje: boolean
  condiciones_aprendizaje: string[]
  ha_repetido_grado: boolean
  grados_repetidos: { grado_id: string; anio: string }[]
}

type AcademicoForm = {
  periodo_academico_id: string
  grado_id: string
  modalidad_id: string
  seccion_id: string
  asignar_seccion_automatica: boolean
  generar_mensualidad: boolean
  tiene_cursos_retrasados: BoolChoice
  cursos_retrasados: { curso_id: string; anio_previo: string }[]
}

type RespMode = 'existente' | 'nuevo' | null

type ResponsableCard = {
  id: string
  mode: RespMode
  user_code: string
  responsable_id: string
  encontrado_nombre: string
  primer_nombre: string
  segundo_nombre: string
  primer_apellido: string
  segundo_apellido: string
  telefono_contacto: string
  parentesco: string
  profesion: string
  direccion_domicilio: string
  direccion_trabajo: string
  telefono_trabajo: string
  es_principal: boolean
}

const emptyAlumno: AlumnoForm = {
  primer_nombre: '',
  segundo_nombre: '',
  primer_apellido: '',
  segundo_apellido: '',
  sexo: '',
  fecha_nacimiento: '',
  telefono_contacto: '',
  numero_identidad: '',
}

const emptyHistorial: HistorialForm = {
  procede_otra_institucion: null,
  nombre_institucion_origen: '',
  alergias: [''],
  presenta_condicion_aprendizaje: false,
  condiciones_aprendizaje: [''],
  ha_repetido_grado: false,
  grados_repetidos: [{ grado_id: '', anio: '' }],
}

const emptyAcademico: AcademicoForm = {
  periodo_academico_id: '',
  grado_id: '',
  modalidad_id: '',
  seccion_id: '',
  asignar_seccion_automatica: true,
  generar_mensualidad: true,
  tiene_cursos_retrasados: null,
  cursos_retrasados: [{ curso_id: '', anio_previo: '' }],
}

function newResponsable(esPrincipal = false): ResponsableCard {
  return {
    id: `resp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mode: null,
    user_code: '',
    responsable_id: '',
    encontrado_nombre: '',
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    telefono_contacto: '',
    parentesco: '',
    profesion: '',
    direccion_domicilio: '',
    direccion_trabajo: '',
    telefono_trabajo: '',
    es_principal: esPrincipal,
  }
}

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
  periodos: Periodo[]
  secciones: Seccion[]
  grados: Grado[]
  modalidades: Modalidad[]
  cursos: Curso[]
}

function fullName(p: {
  primer_nombre: string
  segundo_nombre?: string
  primer_apellido: string
  segundo_apellido?: string
}) {
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(' ')
}

function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function calcEdad(fecha: string): number | null {
  if (!fecha) return null
  const born = new Date(fecha + 'T00:00:00')
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const m = now.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1
  return age >= 0 ? age : null
}

function onlyDigits(s: string, max: number) {
  return s.replace(/\D/g, '').slice(0, max)
}

function isTelefonoHN(s: string) {
  return /^\d{8}$/.test(s)
}

function isIdentidadHN(s: string) {
  return /^\d{13}$/.test(s)
}

function listaOptions(items: ListaItem[]) {
  return items.map((i) => ({ value: i.nombre, label: i.nombre }))
}

function validateTelefono(label: string, value: string): string | null {
  const t = value.trim()
  if (!t) return null
  if (!isTelefonoHN(t)) return `${label} debe tener 8 dígitos (ej. 88721992)`
  return null
}

function validateResponsable(r: ResponsableCard): string | null {
  if (!r.mode) return 'Indica si el responsable ya está registrado'
  if (!r.parentesco.trim()) return 'Indica el parentesco de cada responsable'
  const tel = validateTelefono('El teléfono de contacto', r.telefono_contacto)
  if (tel) return tel
  const telTrab = validateTelefono('El teléfono de trabajo', r.telefono_trabajo)
  if (telTrab) return telTrab
  if (r.mode === 'existente') {
    if (!r.responsable_id) return 'Busca y confirma cada responsable existente por su código'
  } else if (!r.primer_nombre.trim() || !r.primer_apellido.trim()) {
    return 'Primer nombre y primer apellido son obligatorios en responsables nuevos'
  }
  return null
}

export function MatriculaWizard({
  open,
  onClose,
  onCreated,
  periodos,
  secciones,
  grados,
  modalidades,
  cursos,
}: Props) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [alumno, setAlumno] = useState<AlumnoForm>(emptyAlumno)
  const [historial, setHistorial] = useState<HistorialForm>(emptyHistorial)
  const [academico, setAcademico] = useState<AcademicoForm>(emptyAcademico)
  const [responsables, setResponsables] = useState<ResponsableCard[]>([newResponsable(true)])
  const [foto, setFoto] = useState<File | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [buscandoRespId, setBuscandoRespId] = useState<string | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  const { data: alergiasCat = [] } = useQuery({
    queryKey: ['catalogo-alergias'],
    queryFn: listAlergias,
    enabled: open,
  })
  const { data: condicionesCat = [] } = useQuery({
    queryKey: ['catalogo-condiciones'],
    queryFn: listCondicionesAprendizaje,
    enabled: open,
  })
  const { data: parentescosCat = [] } = useQuery({
    queryKey: ['catalogo-parentescos'],
    queryFn: listParentescos,
    enabled: open,
  })
  const { data: profesionesCat = [] } = useQuery({
    queryKey: ['catalogo-profesiones'],
    queryFn: listProfesiones,
    enabled: open,
  })

  const alergiaOptions = useMemo(() => listaOptions(alergiasCat), [alergiasCat])
  const condicionOptions = useMemo(() => listaOptions(condicionesCat), [condicionesCat])
  const parentescoOptions = useMemo(() => listaOptions(parentescosCat), [parentescosCat])
  const profesionOptions = useMemo(() => listaOptions(profesionesCat), [profesionesCat])

  useEffect(() => {
    if (!foto) {
      setFotoUrl(null)
      return
    }
    const url = URL.createObjectURL(foto)
    setFotoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [foto])

  const periodoOptions = useMemo(() => periodoSelectOptions(periodos), [periodos])
  const gradoOptions = useMemo(
    () =>
      grados.map((g) => ({
        value: g.id,
        label: g.nombre,
        keywords: `${g.codigo} ${g.orden}`,
      })),
    [grados],
  )
  const modalidadOptions = useMemo(
    () =>
      modalidades.map((m) => ({
        value: m.id,
        label: m.nombre,
        keywords: `${m.codigo} ${m.hora_inicio}-${m.hora_fin}`,
      })),
    [modalidades],
  )
  const cursoOptions = useMemo(
    () =>
      cursos.map((c) => ({
        value: c.id,
        label: c.nombre,
        keywords: c.codigo,
      })),
    [cursos],
  )
  const seccionesFiltradas = useMemo(
    () =>
      secciones.filter(
        (s) =>
          (!academico.grado_id || s.grado_id === academico.grado_id) &&
          (!academico.modalidad_id || s.modalidad_id === academico.modalidad_id),
      ),
    [secciones, academico.grado_id, academico.modalidad_id],
  )
  const seccionOptions = useMemo(
    () =>
      seccionesFiltradas.map((s) => ({
        value: s.id,
        label: s.nombre,
        keywords: s.codigo,
      })),
    [seccionesFiltradas],
  )

  const selectedSeccion = secciones.find((s) => s.id === academico.seccion_id)
  const selectedPeriodo = periodos.find((p) => p.id === academico.periodo_academico_id)
  const selectedGrado = grados.find((g) => g.id === academico.grado_id)
  const selectedModalidad = modalidades.find((m) => m.id === academico.modalidad_id)
  const edad = calcEdad(alumno.fecha_nacimiento)

  const updateResp = (id: string, patch: Partial<ResponsableCard>) => {
    setResponsables((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const reset = () => {
    setStep(0)
    setAlumno(emptyAlumno)
    setHistorial(emptyHistorial)
    setAcademico(emptyAcademico)
    setResponsables([newResponsable(true)])
    setFoto(null)
    setConfirmSave(false)
    setConfirmCancel(false)
    setCreatedCode(null)
    setBuscandoRespId(null)
  }

  const requestClose = () => {
    if (createdCode) {
      reset()
      onClose()
      return
    }
    setConfirmCancel(true)
  }

  const validateStep = (i: number): string | null => {
    if (i === 0) {
      if (!alumno.primer_nombre.trim() || !alumno.primer_apellido.trim()) {
        return 'Primer nombre y primer apellido del alumno son obligatorios'
      }
      if (!alumno.sexo) return 'Selecciona el sexo del alumno'
      if (!alumno.fecha_nacimiento) return 'Indica la fecha de nacimiento'
      const telAl = validateTelefono('El teléfono de contacto', alumno.telefono_contacto)
      if (telAl) return telAl
      if (alumno.numero_identidad.trim() && !isIdentidadHN(alumno.numero_identidad.trim())) {
        return 'El número de identidad debe tener 13 dígitos (ej. 1804199704869)'
      }
    }
    if (i === 1) {
      if (historial.procede_otra_institucion === null) {
        return 'Indica si procede de otra institución'
      }
      if (
        historial.procede_otra_institucion &&
        !historial.nombre_institucion_origen.trim()
      ) {
        return 'Indica el nombre de la institución de origen'
      }
      if (historial.ha_repetido_grado) {
        const ok = historial.grados_repetidos.some((g) => g.grado_id)
        if (!ok) return 'Añade al menos un grado repetido'
      }
      if (historial.presenta_condicion_aprendizaje) {
        const ok = historial.condiciones_aprendizaje.some((c) => c.trim())
        if (!ok) return 'Describe al menos una condición especial'
      }
    }
    if (i === 2) {
      if (!academico.periodo_academico_id || !academico.grado_id || !academico.modalidad_id) {
        return 'Selecciona periodo, grado y modalidad'
      }
      if (!academico.asignar_seccion_automatica && !academico.seccion_id) {
        return 'Selecciona una sección o marca asignación automática'
      }
      if (
        !academico.asignar_seccion_automatica &&
        academico.seccion_id &&
        !seccionesFiltradas.some((s) => s.id === academico.seccion_id)
      ) {
        return 'La sección no corresponde al grado y modalidad elegidos'
      }
      if (academico.tiene_cursos_retrasados === null) {
        return 'Indica si lleva cursos retrasados'
      }
      if (academico.tiene_cursos_retrasados) {
        const rows = academico.cursos_retrasados.filter((c) => c.curso_id)
        if (!rows.length) return 'Añade al menos un curso retrasado'
        for (const c of rows) {
          if (!c.anio_previo.trim() || Number.isNaN(Number(c.anio_previo))) {
            return 'Indica el año previo de cada curso retrasado'
          }
        }
      }
    }
    if (i === 3) {
      if (!responsables.length) return 'Debe haber al menos un responsable'
      for (const r of responsables) {
        const err = validateResponsable(r)
        if (err) return err
      }
      if (!responsables.some((r) => r.es_principal)) {
        return 'Marca al menos un responsable como principal'
      }
    }
    return null
  }

  const goNext = () => {
    const err = validateStep(step)
    if (err) {
      toast.error(err)
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const saveMut = useMutation({
    mutationFn: async () => {
      let pathImagen: string | undefined
      if (foto) {
        const up = await upload(foto, 'perfil_foto')
        pathImagen = up.object_key
      }

      const alumnoUser = await createUser({
        roles: ['alumno'],
        statususer: 'ACTIVE',
        primer_nombre: alumno.primer_nombre.trim(),
        segundo_nombre: alumno.segundo_nombre.trim() || undefined,
        primer_apellido: alumno.primer_apellido.trim(),
        segundo_apellido: alumno.segundo_apellido.trim() || undefined,
      })
      if (!alumnoUser.userId) throw new Error('No se recibió el id del usuario alumno')

      const alergias = historial.alergias.map((a) => a.trim()).filter(Boolean)
      const condiciones = historial.presenta_condicion_aprendizaje
        ? historial.condiciones_aprendizaje.map((c) => c.trim()).filter(Boolean)
        : []
      const gradosRep = historial.ha_repetido_grado
        ? historial.grados_repetidos
            .filter((g) => g.grado_id)
            .map((g) => ({
              grado_id: g.grado_id,
              ...(g.anio.trim() && !Number.isNaN(Number(g.anio))
                ? { anio: Number(g.anio) }
                : {}),
            }))
        : []

      const alumnoPerfil = await createAlumno({
        user_id: alumnoUser.userId,
        primer_nombre: alumno.primer_nombre.trim(),
        segundo_nombre: alumno.segundo_nombre.trim() || undefined,
        primer_apellido: alumno.primer_apellido.trim(),
        segundo_apellido: alumno.segundo_apellido.trim() || undefined,
        numero_identidad: alumno.numero_identidad.trim() || undefined,
        tipo_documento_identidad: 'HND',
        fecha_nacimiento: alumno.fecha_nacimiento || undefined,
        sexo: alumno.sexo || undefined,
        telefono_contacto: alumno.telefono_contacto.trim() || undefined,
        path_imagen: pathImagen,
        status: 'ACTIVE',
        procede_otra_institucion: Boolean(historial.procede_otra_institucion),
        nombre_institucion_origen: historial.procede_otra_institucion
          ? historial.nombre_institucion_origen.trim() || undefined
          : undefined,
        presenta_condicion_aprendizaje: historial.presenta_condicion_aprendizaje,
        ha_repetido_grado: historial.ha_repetido_grado,
        alergias: alergias.length ? alergias : undefined,
        condiciones_aprendizaje: condiciones.length ? condiciones : undefined,
        grados_repetidos: gradosRep.length ? gradosRep : undefined,
      })

      const anioActual = selectedPeriodo?.anio_lectivo ?? new Date().getFullYear()
      const cursosRetrasados =
        academico.tiene_cursos_retrasados
          ? academico.cursos_retrasados
              .filter((c) => c.curso_id)
              .map((c) => ({
                curso_id: c.curso_id,
                anio_previo: Number(c.anio_previo),
                anio_actual: anioActual,
              }))
          : []

      const mat = await createMatricula({
        alumno_id: alumnoPerfil.id,
        periodo_academico_id: academico.periodo_academico_id,
        generar_mensualidad: academico.generar_mensualidad,
        tiene_cursos_retrasados: Boolean(academico.tiene_cursos_retrasados),
        ...(cursosRetrasados.length ? { cursos_retrasados: cursosRetrasados } : {}),
        ...(academico.asignar_seccion_automatica
          ? {
              asignar_seccion_automatica: true,
              grado_id: academico.grado_id,
              modalidad_id: academico.modalidad_id,
            }
          : { seccion_id: academico.seccion_id }),
      })

      for (const r of responsables) {
        if (r.mode === 'existente') {
          await linkResponsable(mat.id, {
            responsable_id: r.responsable_id,
            parentesco: r.parentesco.trim(),
            es_principal: r.es_principal,
          })
        } else {
          const respUser = await createUser({
            roles: ['responsable'],
            statususer: 'ACTIVE',
            primer_nombre: r.primer_nombre.trim(),
            segundo_nombre: r.segundo_nombre.trim() || undefined,
            primer_apellido: r.primer_apellido.trim(),
            segundo_apellido: r.segundo_apellido.trim() || undefined,
          })
          if (!respUser.userId) throw new Error('No se recibió el id del usuario responsable')

          const dirsTrabajo = r.direccion_trabajo.trim()
            ? [
                {
                  direccion: r.direccion_trabajo.trim(),
                  ...(r.telefono_trabajo.trim()
                    ? { telefono_trabajo: r.telefono_trabajo.trim() }
                    : {}),
                },
              ]
            : undefined

          const resp = await createResponsable({
            user_id: respUser.userId,
            primer_nombre: r.primer_nombre.trim(),
            segundo_nombre: r.segundo_nombre.trim() || undefined,
            primer_apellido: r.primer_apellido.trim(),
            segundo_apellido: r.segundo_apellido.trim() || undefined,
            telefono_contacto: r.telefono_contacto.trim() || undefined,
            status: 'ACTIVE',
            profesion: r.profesion.trim() || undefined,
            direccion_domicilio: r.direccion_domicilio.trim() || undefined,
            direcciones_trabajo: dirsTrabajo,
          })
          await linkResponsable(mat.id, {
            responsable_id: resp.id,
            parentesco: r.parentesco.trim(),
            es_principal: r.es_principal,
          })
          downloadPdf(respUser.pdfBlob, `responsable-${respUser.code}.pdf`)
        }
      }

      downloadPdf(alumnoUser.pdfBlob, `alumno-${alumnoUser.code}.pdf`)
      return alumnoUser.code
    },
    onSuccess: (code) => {
      setCreatedCode(code)
      setConfirmSave(false)
      qc.invalidateQueries({ queryKey: ['catalogo-alergias'] })
      qc.invalidateQueries({ queryKey: ['catalogo-condiciones'] })
      qc.invalidateQueries({ queryKey: ['catalogo-parentescos'] })
      qc.invalidateQueries({ queryKey: ['catalogo-profesiones'] })
      toast.success(`Matrícula registrada. Código alumno: ${code}`)
      onCreated()
    },
    onError: (e) => {
      setConfirmSave(false)
      toast.error(userMessageFromError(e))
    },
  })

  const done = Boolean(createdCode)

  const buscarResponsable = (card: ResponsableCard) => {
    void (async () => {
      setBuscandoRespId(card.id)
      try {
        const found = await getResponsableByCode(card.user_code.trim())
        updateResp(card.id, {
          responsable_id: found.id,
          encontrado_nombre: found.nombre,
          user_code: found.user_code ?? card.user_code,
        })
        toast.success('Responsable encontrado')
      } catch (e) {
        updateResp(card.id, { responsable_id: '', encontrado_nombre: '' })
        toast.error(userMessageFromError(e))
      } finally {
        setBuscandoRespId(null)
      }
    })()
  }

  return (
    <>
      <Modal
        open={open}
        xl
        title={done ? 'Matrícula lista' : 'Nueva matrícula'}
        onClose={requestClose}
        footer={
          done ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cerrar
            </button>
          ) : (
            <>
              <button type="button" className="btn btn--ghost" onClick={requestClose}>
                Cancelar
              </button>
              {step > 0 ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={goBack}
                  disabled={saveMut.isPending}
                >
                  Atrás
                </button>
              ) : null}
              {step < STEPS.length - 1 ? (
                <button type="button" className="btn btn--primary" data-testid="matricula-wizard-next" onClick={goNext}>
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  data-testid="matricula-wizard-finish"
                  disabled={saveMut.isPending}
                  onClick={() => {
                    const err = validateStep(3)
                    if (err) {
                      toast.error(err)
                      return
                    }
                    setConfirmSave(true)
                  }}
                >
                  {saveMut.isPending ? 'Guardando…' : 'Confirmar y guardar'}
                </button>
              )}
            </>
          )
        }
      >
        {!done ? <WizardSteps steps={[...STEPS]} current={step} /> : null}

        {done ? (
          <div className="wizard-success wizard-pane">
            <p className="wizard-pane__title">Alumno matriculado</p>
            <p className="wizard-pane__hint">
              Se descargó el PDF con el código y la contraseña temporal. Entrégalo al titular; la
              contraseña no se vuelve a mostrar.
            </p>
            <div className="wizard-success__code" data-testid="matricula-created-code">
              {createdCode}
            </div>
            <p className="texto-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
              Código del alumno
            </p>
          </div>
        ) : null}

        {!done && step === 0 ? (
          <div className="wizard-pane" key="alumno">
            <p className="wizard-pane__title">Datos del alumno</p>
            <p className="wizard-pane__hint">
              Nombres, sexo, nacimiento e identidad. El código se genera al confirmar.
            </p>
            <div className="wizard-grid">
              <Field label="Primer nombre" htmlFor="wiz-al-pn">
                <input
                  id="wiz-al-pn"
                  className="field__input"
                  data-testid="matricula-primer-nombre"
                  value={alumno.primer_nombre}
                  onChange={(e) => setAlumno((f) => ({ ...f, primer_nombre: e.target.value }))}
                />
              </Field>
              <Field label="Segundo nombre">
                <input
                  className="field__input"
                  value={alumno.segundo_nombre}
                  onChange={(e) => setAlumno((f) => ({ ...f, segundo_nombre: e.target.value }))}
                />
              </Field>
              <Field label="Primer apellido" htmlFor="wiz-al-pa">
                <input
                  id="wiz-al-pa"
                  className="field__input"
                  data-testid="matricula-primer-apellido"
                  value={alumno.primer_apellido}
                  onChange={(e) => setAlumno((f) => ({ ...f, primer_apellido: e.target.value }))}
                />
              </Field>
              <Field label="Segundo apellido">
                <input
                  className="field__input"
                  value={alumno.segundo_apellido}
                  onChange={(e) => setAlumno((f) => ({ ...f, segundo_apellido: e.target.value }))}
                />
              </Field>
              <Field label="Sexo" htmlFor="wiz-al-sexo">
                <Combobox
                  id="wiz-al-sexo"
                  data-testid="matricula-sexo"
                  value={alumno.sexo}
                  onChange={(v) => setAlumno((f) => ({ ...f, sexo: v }))}
                  options={SEXO_OPTIONS}
                  placeholder="Seleccionar…"
                />
              </Field>
              <Field label="Fecha de nacimiento" htmlFor="wiz-al-fn">
                <input
                  id="wiz-al-fn"
                  type="date"
                  className="field__input"
                  data-testid="matricula-fecha-nacimiento"
                  value={alumno.fecha_nacimiento}
                  onChange={(e) => setAlumno((f) => ({ ...f, fecha_nacimiento: e.target.value }))}
                />
              </Field>
              <div className="wizard-grid--full">
                <p className="texto-muted" style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }} data-testid="matricula-edad">
                  Edad: {edad !== null ? `${edad} años` : '—'}
                </p>
              </div>
              <Field label="Teléfono de contacto">
                <input
                  className="field__input"
                  data-testid="matricula-telefono"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="88721992"
                  value={alumno.telefono_contacto}
                  onChange={(e) =>
                    setAlumno((f) => ({ ...f, telefono_contacto: onlyDigits(e.target.value, 8) }))
                  }
                />
              </Field>
              <Field label="Número de identidad">
                <input
                  className="field__input"
                  data-testid="matricula-identidad"
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="1804199704869"
                  value={alumno.numero_identidad}
                  onChange={(e) =>
                    setAlumno((f) => ({ ...f, numero_identidad: onlyDigits(e.target.value, 13) }))
                  }
                />
              </Field>
            </div>
          </div>
        ) : null}

        {!done && step === 1 ? (
          <div className="wizard-pane" key="historial">
            <p className="wizard-pane__title">Historial</p>
            <p className="wizard-pane__hint">Procedencia, alergias, condiciones y grados repetidos.</p>

            <p className="wizard-choice__question">¿De dónde proviene el alumno?</p>
            <div className="wizard-choice" role="group" aria-label="Procedencia institucional">
              <button
                type="button"
                data-testid="matricula-otra-inst-no"
                className={`wizard-choice__btn${historial.procede_otra_institucion === false ? ' wizard-choice__btn--on' : ''}`}
                onClick={() =>
                  setHistorial((f) => ({
                    ...f,
                    procede_otra_institucion: false,
                    nombre_institucion_origen: '',
                  }))
                }
              >
                Esta institución
              </button>
              <button
                type="button"
                data-testid="matricula-otra-inst-si"
                className={`wizard-choice__btn${historial.procede_otra_institucion === true ? ' wizard-choice__btn--on' : ''}`}
                onClick={() =>
                  setHistorial((f) => ({ ...f, procede_otra_institucion: true }))
                }
              >
                Otra institución
              </button>
            </div>

            {historial.procede_otra_institucion === true ? (
              <div className="wizard-choice-panel">
                <Field label="Nombre de la institución anterior" htmlFor="wiz-inst">
                  <input
                    id="wiz-inst"
                    className="field__input"
                    data-testid="matricula-institucion"
                    value={historial.nombre_institucion_origen}
                    onChange={(e) =>
                      setHistorial((f) => ({ ...f, nombre_institucion_origen: e.target.value }))
                    }
                  />
                </Field>
              </div>
            ) : null}

            {historial.procede_otra_institucion !== null ? (
              <>
                <p className="wizard-pane__title" style={{ marginTop: '1.25rem' }}>
                  Alergias
                </p>
                {historial.alergias.map((a, idx) => (
                  <Field key={`alergia-${idx}`} label={idx === 0 ? 'Alergia' : `Alergia ${idx + 1}`}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Combobox
                          data-testid={idx === 0 ? 'matricula-alergia' : undefined}
                          allowCustom
                          value={a}
                          onChange={(v) =>
                            setHistorial((f) => {
                              const next = [...f.alergias]
                              next[idx] = v
                              return { ...f, alergias: next }
                            })
                          }
                          options={alergiaOptions}
                          placeholder="Elegir o escribir…"
                        />
                      </div>
                      {historial.alergias.length > 1 ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() =>
                            setHistorial((f) => ({
                              ...f,
                              alergias: f.alergias.filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </Field>
                ))}
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  data-testid="matricula-add-alergia"
                  onClick={() => setHistorial((f) => ({ ...f, alergias: [...f.alergias, ''] }))}
                >
                  Añadir alergia
                </button>

                <label style={{ fontSize: '0.85rem', display: 'block', margin: '1.25rem 0 0.65rem' }}>
                  <input
                    type="checkbox"
                    data-testid="matricula-condicion-check"
                    checked={historial.presenta_condicion_aprendizaje}
                    onChange={(e) =>
                      setHistorial((f) => ({
                        ...f,
                        presenta_condicion_aprendizaje: e.target.checked,
                        condiciones_aprendizaje: e.target.checked
                          ? f.condiciones_aprendizaje.length
                            ? f.condiciones_aprendizaje
                            : ['']
                          : [''],
                      }))
                    }
                  />{' '}
                  Presenta condición especial / de aprendizaje
                </label>
                {historial.presenta_condicion_aprendizaje ? (
                  <>
                    {historial.condiciones_aprendizaje.map((c, idx) => (
                      <Field
                        key={`cond-${idx}`}
                        label={idx === 0 ? 'Condición' : `Condición ${idx + 1}`}
                      >
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Combobox
                              allowCustom
                              value={c}
                              onChange={(v) =>
                                setHistorial((f) => {
                                  const next = [...f.condiciones_aprendizaje]
                                  next[idx] = v
                                  return { ...f, condiciones_aprendizaje: next }
                                })
                              }
                              options={condicionOptions}
                              placeholder="Elegir o escribir…"
                            />
                          </div>
                          {historial.condiciones_aprendizaje.length > 1 ? (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() =>
                                setHistorial((f) => ({
                                  ...f,
                                  condiciones_aprendizaje: f.condiciones_aprendizaje.filter(
                                    (_, i) => i !== idx,
                                  ),
                                }))
                              }
                            >
                              Quitar
                            </button>
                          ) : null}
                        </div>
                      </Field>
                    ))}
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        setHistorial((f) => ({
                          ...f,
                          condiciones_aprendizaje: [...f.condiciones_aprendizaje, ''],
                        }))
                      }
                    >
                      Añadir condición
                    </button>
                  </>
                ) : null}

                <label style={{ fontSize: '0.85rem', display: 'block', margin: '1.25rem 0 0.65rem' }}>
                  <input
                    type="checkbox"
                    data-testid="matricula-repetido-check"
                    checked={historial.ha_repetido_grado}
                    onChange={(e) =>
                      setHistorial((f) => ({
                        ...f,
                        ha_repetido_grado: e.target.checked,
                        grados_repetidos: e.target.checked
                          ? f.grados_repetidos.length
                            ? f.grados_repetidos
                            : [{ grado_id: '', anio: '' }]
                          : [{ grado_id: '', anio: '' }],
                      }))
                    }
                  />{' '}
                  Ha repetido grado
                </label>
                {historial.ha_repetido_grado ? (
                  <>
                    {historial.grados_repetidos.map((g, idx) => (
                      <div className="wizard-grid" key={`rep-${idx}`} style={{ marginBottom: '0.5rem' }}>
                        <Field label="Grado" htmlFor={`wiz-rep-grado-${idx}`}>
                          <Combobox
                            id={`wiz-rep-grado-${idx}`}
                            value={g.grado_id}
                            onChange={(v) =>
                              setHistorial((f) => {
                                const next = [...f.grados_repetidos]
                                next[idx] = { ...next[idx], grado_id: v }
                                return { ...f, grados_repetidos: next }
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
                              setHistorial((f) => {
                                const next = [...f.grados_repetidos]
                                next[idx] = { ...next[idx], anio: e.target.value }
                                return { ...f, grados_repetidos: next }
                              })
                            }
                          />
                        </Field>
                        {historial.grados_repetidos.length > 1 ? (
                          <div className="wizard-grid--full">
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() =>
                                setHistorial((f) => ({
                                  ...f,
                                  grados_repetidos: f.grados_repetidos.filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              Quitar grado
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      data-testid="matricula-add-grado-repetido"
                      onClick={() =>
                        setHistorial((f) => ({
                          ...f,
                          grados_repetidos: [...f.grados_repetidos, { grado_id: '', anio: '' }],
                        }))
                      }
                    >
                      Añadir otro grado repetido
                    </button>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {!done && step === 2 ? (
          <div className="wizard-pane" key="academico">
            <p className="wizard-pane__title">Datos académicos</p>
            <p className="wizard-pane__hint">
              Periodo, grado y modalidad. Por defecto se asigna sección de forma balanceada.
            </p>
            <Field label="Periodo académico" htmlFor="wiz-periodo">
              <Combobox
                id="wiz-periodo"
                data-testid="matricula-periodo"
                value={academico.periodo_academico_id}
                onChange={(v) => setAcademico((f) => ({ ...f, periodo_academico_id: v }))}
                options={periodoOptions}
                placeholder="Buscar periodo…"
              />
            </Field>
            <div className="wizard-grid">
              <Field label="Grado" htmlFor="wiz-grado">
                <Combobox
                  id="wiz-grado"
                  data-testid="matricula-grado"
                  value={academico.grado_id}
                  onChange={(v) =>
                    setAcademico((f) => ({
                      ...f,
                      grado_id: v,
                      seccion_id: '',
                    }))
                  }
                  options={gradoOptions}
                  placeholder="Buscar grado…"
                />
              </Field>
              <Field label="Modalidad" htmlFor="wiz-modalidad">
                <Combobox
                  id="wiz-modalidad"
                  data-testid="matricula-modalidad"
                  value={academico.modalidad_id}
                  onChange={(v) =>
                    setAcademico((f) => ({
                      ...f,
                      modalidad_id: v,
                      seccion_id: '',
                    }))
                  }
                  options={modalidadOptions}
                  placeholder="Buscar modalidad…"
                />
              </Field>
            </div>
            <label style={{ fontSize: '0.85rem', display: 'block', margin: '0.85rem 0 0.65rem' }}>
              <input
                type="checkbox"
                data-testid="matricula-auto-seccion"
                checked={academico.asignar_seccion_automatica}
                onChange={(e) =>
                  setAcademico((f) => ({
                    ...f,
                    asignar_seccion_automatica: e.target.checked,
                    seccion_id: e.target.checked ? '' : f.seccion_id,
                  }))
                }
              />{' '}
              Asignar sección automáticamente
            </label>
            {academico.asignar_seccion_automatica ? (
              <p className="texto-muted" style={{ fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
                Se asignará a la sección del grado/modalidad con menos inscritos en este periodo.
              </p>
            ) : (
              <Field label="Sección" htmlFor="wiz-seccion">
                <Combobox
                  id="wiz-seccion"
                  data-testid="matricula-seccion"
                  value={academico.seccion_id}
                  onChange={(v) => setAcademico((f) => ({ ...f, seccion_id: v }))}
                  options={seccionOptions}
                  placeholder={
                    academico.grado_id && academico.modalidad_id
                      ? 'Buscar sección…'
                      : 'Primero elige grado y modalidad'
                  }
                  disabled={!academico.grado_id || !academico.modalidad_id}
                  emptyLabel="No hay secciones para ese grado y modalidad"
                />
              </Field>
            )}
            <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={academico.generar_mensualidad}
                onChange={(e) =>
                  setAcademico((f) => ({ ...f, generar_mensualidad: e.target.checked }))
                }
              />{' '}
              Generar obligaciones de mensualidad
            </label>

            <p className="wizard-choice__question">¿Lleva cursos retrasados?</p>
            <div className="wizard-choice" role="group" aria-label="¿Lleva cursos retrasados?">
              <button
                type="button"
                data-testid="matricula-retrasados-si"
                className={`wizard-choice__btn${academico.tiene_cursos_retrasados === true ? ' wizard-choice__btn--on' : ''}`}
                onClick={() =>
                  setAcademico((f) => ({
                    ...f,
                    tiene_cursos_retrasados: true,
                    cursos_retrasados: f.cursos_retrasados.length
                      ? f.cursos_retrasados
                      : [{ curso_id: '', anio_previo: '' }],
                  }))
                }
              >
                Sí
              </button>
              <button
                type="button"
                data-testid="matricula-retrasados-no"
                className={`wizard-choice__btn${academico.tiene_cursos_retrasados === false ? ' wizard-choice__btn--on' : ''}`}
                onClick={() =>
                  setAcademico((f) => ({
                    ...f,
                    tiene_cursos_retrasados: false,
                    cursos_retrasados: [{ curso_id: '', anio_previo: '' }],
                  }))
                }
              >
                No
              </button>
            </div>

            {academico.tiene_cursos_retrasados === true ? (
              <div className="wizard-choice-panel">
                {academico.cursos_retrasados.map((c, idx) => (
                  <div className="wizard-grid" key={`cr-${idx}`} style={{ marginBottom: '0.5rem' }}>
                    <Field label="Curso" htmlFor={`wiz-curso-${idx}`}>
                      <Combobox
                        id={`wiz-curso-${idx}`}
                        data-testid={idx === 0 ? 'matricula-curso-retrasado' : undefined}
                        value={c.curso_id}
                        onChange={(v) =>
                          setAcademico((f) => {
                            const next = [...f.cursos_retrasados]
                            next[idx] = { ...next[idx], curso_id: v }
                            return { ...f, cursos_retrasados: next }
                          })
                        }
                        options={cursoOptions}
                        placeholder="Buscar curso…"
                      />
                    </Field>
                    <Field label="Año previo">
                      <input
                        className="field__input"
                        type="number"
                        min={1990}
                        max={2100}
                        value={c.anio_previo}
                        onChange={(e) =>
                          setAcademico((f) => {
                            const next = [...f.cursos_retrasados]
                            next[idx] = { ...next[idx], anio_previo: e.target.value }
                            return { ...f, cursos_retrasados: next }
                          })
                        }
                      />
                    </Field>
                    {academico.cursos_retrasados.length > 1 ? (
                      <div className="wizard-grid--full">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() =>
                            setAcademico((f) => ({
                              ...f,
                              cursos_retrasados: f.cursos_retrasados.filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          Quitar curso
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  data-testid="matricula-add-curso-retrasado"
                  onClick={() =>
                    setAcademico((f) => ({
                      ...f,
                      cursos_retrasados: [
                        ...f.cursos_retrasados,
                        { curso_id: '', anio_previo: '' },
                      ],
                    }))
                  }
                >
                  Añadir otro curso
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {!done && step === 3 ? (
          <div className="wizard-pane" key="responsables">
            <p className="wizard-pane__title">Responsables</p>
            <p className="wizard-pane__hint">
              Debe haber al menos uno. Puedes vincular existentes por código o registrar nuevos.
            </p>

            {responsables.map((r, idx) => (
              <div
                key={r.id}
                className="wizard-choice-panel"
                style={{ marginBottom: '1rem' }}
                data-testid={`matricula-responsable-${idx}`}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.65rem',
                  }}
                >
                  <strong style={{ fontSize: '0.9rem' }}>Responsable {idx + 1}</strong>
                  {responsables.length > 1 ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        setResponsables((list) => list.filter((x) => x.id !== r.id))
                      }
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>

                <p className="wizard-choice__question">¿El responsable ya está registrado?</p>
                <div
                  className="wizard-choice"
                  role="group"
                  aria-label={`¿Responsable ${idx + 1} existente?`}
                >
                  <button
                    type="button"
                    className={`wizard-choice__btn${r.mode === 'existente' ? ' wizard-choice__btn--on' : ''}`}
                    onClick={() =>
                      updateResp(r.id, {
                        mode: 'existente',
                        primer_nombre: '',
                        segundo_nombre: '',
                        primer_apellido: '',
                        segundo_apellido: '',
                        telefono_contacto: '',
                        profesion: '',
                        direccion_domicilio: '',
                        direccion_trabajo: '',
                        telefono_trabajo: '',
                        responsable_id: '',
                        encontrado_nombre: '',
                        user_code: '',
                      })
                    }
                  >
                    Sí, ya existe
                  </button>
                  <button
                    type="button"
                    className={`wizard-choice__btn${r.mode === 'nuevo' ? ' wizard-choice__btn--on' : ''}`}
                    onClick={() =>
                      updateResp(r.id, {
                        mode: 'nuevo',
                        responsable_id: '',
                        encontrado_nombre: '',
                        user_code: '',
                      })
                    }
                  >
                    No, es nuevo
                  </button>
                </div>

                {r.mode === 'existente' ? (
                  <>
                    <Field label="Código del responsable" htmlFor={`wiz-resp-code-${r.id}`}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          id={`wiz-resp-code-${r.id}`}
                          className="field__input"
                          data-testid={idx === 0 ? 'matricula-resp-code' : undefined}
                          value={r.user_code}
                          onChange={(e) =>
                            updateResp(r.id, {
                              user_code: e.target.value,
                              responsable_id: '',
                              encontrado_nombre: '',
                            })
                          }
                          placeholder="Ej. 1002026105"
                        />
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled={buscandoRespId === r.id || !r.user_code.trim()}
                          onClick={() => buscarResponsable(r)}
                        >
                          {buscandoRespId === r.id ? 'Buscando…' : 'Buscar'}
                        </button>
                      </div>
                    </Field>
                    {r.responsable_id ? (
                      <div className="wizard-summary" style={{ marginBottom: '0.85rem' }}>
                        <div className="wizard-summary__row">
                          <span className="wizard-summary__label">Encontrado</span>
                          <span className="wizard-summary__value">{r.encontrado_nombre}</span>
                        </div>
                        <div className="wizard-summary__row">
                          <span className="wizard-summary__label">Código</span>
                          <span className="wizard-summary__value">{r.user_code}</span>
                        </div>
                      </div>
                    ) : null}
                    <div className="wizard-grid">
                      <Field label="Parentesco">
                        <Combobox
                          allowCustom
                          value={r.parentesco}
                          onChange={(v) => updateResp(r.id, { parentesco: v })}
                          options={parentescoOptions}
                          placeholder="Elegir o escribir…"
                        />
                      </Field>
                      <label
                        style={{
                          fontSize: '0.85rem',
                          alignSelf: 'end',
                          paddingBottom: '0.55rem',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={r.es_principal}
                          onChange={(e) => updateResp(r.id, { es_principal: e.target.checked })}
                        />{' '}
                        Responsable principal
                      </label>
                    </div>
                  </>
                ) : null}

                {r.mode === 'nuevo' ? (
                  <div className="wizard-grid">
                    <Field label="Primer nombre">
                      <input
                        className="field__input"
                        data-testid={idx === 0 ? 'matricula-resp-nombre' : undefined}
                        value={r.primer_nombre}
                        onChange={(e) => updateResp(r.id, { primer_nombre: e.target.value })}
                      />
                    </Field>
                    <Field label="Segundo nombre">
                      <input
                        className="field__input"
                        value={r.segundo_nombre}
                        onChange={(e) => updateResp(r.id, { segundo_nombre: e.target.value })}
                      />
                    </Field>
                    <Field label="Primer apellido">
                      <input
                        className="field__input"
                        value={r.primer_apellido}
                        onChange={(e) => updateResp(r.id, { primer_apellido: e.target.value })}
                      />
                    </Field>
                    <Field label="Segundo apellido">
                      <input
                        className="field__input"
                        value={r.segundo_apellido}
                        onChange={(e) => updateResp(r.id, { segundo_apellido: e.target.value })}
                      />
                    </Field>
                    <Field label="Teléfono de contacto">
                      <input
                        className="field__input"
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="88721992"
                        value={r.telefono_contacto}
                        onChange={(e) =>
                          updateResp(r.id, { telefono_contacto: onlyDigits(e.target.value, 8) })
                        }
                      />
                    </Field>
                    <Field label="Parentesco">
                      <Combobox
                        allowCustom
                        value={r.parentesco}
                        onChange={(v) => updateResp(r.id, { parentesco: v })}
                        options={parentescoOptions}
                        placeholder="Elegir o escribir…"
                      />
                    </Field>
                    <Field label="Profesión">
                      <Combobox
                        allowCustom
                        value={r.profesion}
                        onChange={(v) => updateResp(r.id, { profesion: v })}
                        options={profesionOptions}
                        placeholder="Elegir o escribir…"
                      />
                    </Field>
                    <div className="wizard-grid--full">
                      <Field label="Dirección de domicilio">
                        <input
                          className="field__input"
                          value={r.direccion_domicilio}
                          onChange={(e) =>
                            updateResp(r.id, { direccion_domicilio: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Dirección de trabajo">
                      <input
                        className="field__input"
                        value={r.direccion_trabajo}
                        onChange={(e) => updateResp(r.id, { direccion_trabajo: e.target.value })}
                      />
                    </Field>
                    <Field label="Teléfono de trabajo">
                      <input
                        className="field__input"
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="88721992"
                        value={r.telefono_trabajo}
                        onChange={(e) =>
                          updateResp(r.id, { telefono_trabajo: onlyDigits(e.target.value, 8) })
                        }
                      />
                    </Field>
                    <label className="wizard-grid--full" style={{ fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={r.es_principal}
                        onChange={(e) => updateResp(r.id, { es_principal: e.target.checked })}
                      />{' '}
                      Responsable principal
                    </label>
                  </div>
                ) : null}
              </div>
            ))}

            <button
              type="button"
              className="btn btn--ghost"
              data-testid="matricula-add-responsable"
              onClick={() => setResponsables((list) => [...list, newResponsable(false)])}
            >
              Añadir otro responsable
            </button>
          </div>
        ) : null}

        {!done && step === 4 ? (
          <div className="wizard-pane" key="foto">
            <p className="wizard-pane__title">Fotografía</p>
            <p className="wizard-pane__hint">
              Opcional. Foto de perfil del alumno (cargar archivo o capturar con cámara).
            </p>
            <PhotoCapture file={foto} onChange={setFoto} />
          </div>
        ) : null}

        {!done && step === 5 ? (
          <div className="wizard-pane" key="confirm">
            <p className="wizard-pane__title">Revisión final</p>
            <p className="wizard-pane__hint">
              Al confirmar se creará el usuario, el perfil, la matrícula y se descargarán los PDF con
              código y contraseña.
            </p>
            <div className="wizard-summary">
              {fotoUrl ? (
                <div className="wizard-summary__photo">
                  <div className="photo-capture__frame" aria-label="Fotografía del alumno">
                    <img src={fotoUrl} alt="Fotografía del alumno" className="photo-capture__img" />
                  </div>
                </div>
              ) : (
                <div className="wizard-summary__row">
                  <span className="wizard-summary__label">Foto</span>
                  <span className="wizard-summary__value">Sin foto</span>
                </div>
              )}
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Alumno</span>
                <span className="wizard-summary__value">{fullName(alumno)}</span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Sexo</span>
                <span className="wizard-summary__value">
                  {SEXO_OPTIONS.find((o) => o.value === alumno.sexo)?.label ??
                    (alumno.sexo || '—')}
                </span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Nacimiento</span>
                <span className="wizard-summary__value">
                  {alumno.fecha_nacimiento
                    ? `${alumno.fecha_nacimiento}${edad !== null ? ` (${edad} años)` : ''}`
                    : '—'}
                </span>
              </div>
              {alumno.telefono_contacto ? (
                <div className="wizard-summary__row">
                  <span className="wizard-summary__label">Teléfono</span>
                  <span className="wizard-summary__value">{alumno.telefono_contacto}</span>
                </div>
              ) : null}
              {alumno.numero_identidad ? (
                <div className="wizard-summary__row">
                  <span className="wizard-summary__label">Identidad</span>
                  <span className="wizard-summary__value">
                  <span className="wizard-summary__value">{alumno.numero_identidad}</span>
                  </span>
                </div>
              ) : null}
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Otra institución</span>
                <span className="wizard-summary__value">
                  {historial.procede_otra_institucion
                    ? historial.nombre_institucion_origen || 'Sí'
                    : 'No'}
                </span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Alergias</span>
                <span className="wizard-summary__value">
                  {historial.alergias.map((a) => a.trim()).filter(Boolean).join(', ') || 'Ninguna'}
                </span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Periodo</span>
                <span className="wizard-summary__value">{selectedPeriodo?.nombre ?? '—'}</span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Grado</span>
                <span className="wizard-summary__value">{selectedGrado?.nombre ?? '—'}</span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Modalidad</span>
                <span className="wizard-summary__value">{selectedModalidad?.nombre ?? '—'}</span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Sección</span>
                <span className="wizard-summary__value">
                  {academico.asignar_seccion_automatica
                    ? 'Automática (balanceada)'
                    : (selectedSeccion?.nombre ?? '—')}
                </span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Mensualidad</span>
                <span className="wizard-summary__value">
                  {academico.generar_mensualidad ? 'Sí' : 'No'}
                </span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Cursos retrasados</span>
                <span className="wizard-summary__value">
                  {academico.tiene_cursos_retrasados
                    ? academico.cursos_retrasados
                        .filter((c) => c.curso_id)
                        .map((c) => {
                          const nombre = cursos.find((x) => x.id === c.curso_id)?.nombre ?? c.curso_id
                          return `${nombre} (${c.anio_previo})`
                        })
                        .join(', ') || 'Sí'
                    : 'No'}
                </span>
              </div>
              <div className="wizard-summary__row">
                <span className="wizard-summary__label">Responsables</span>
                <span className="wizard-summary__value">
                  {responsables
                    .map((r) => {
                      const nombre =
                        r.mode === 'existente'
                          ? r.encontrado_nombre || r.user_code
                          : fullName(r)
                      return `${nombre} (${r.parentesco}${r.es_principal ? ', principal' : ''})`
                    })
                    .join('; ')}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar matrícula"
        message={`¿Registrar a ${fullName(alumno)}? Se generará el PDF con código y contraseña.`}
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar matrícula"
        message="¿Seguro que quieres cancelar? Se perderán los datos del formulario."
        danger
        confirmLabel="Sí, cancelar"
        onConfirm={() => {
          setConfirmCancel(false)
          reset()
          onClose()
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  )
}
