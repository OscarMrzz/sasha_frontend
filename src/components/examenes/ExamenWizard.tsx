import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ExamenBoard } from '#/components/examenes/ExamenBoard'
import type { ExamenPill, PlacedExamen } from '#/components/examenes/ExamenBoard'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { WizardSteps } from '#/components/ui/WizardSteps'
import { userMessageFromError } from '#/lib/api'
import {
  bloquesIniciales,
  duracionMinutos,
  duracionTexto,
  fechasEntre,
  horaDeMinutos,
  fechaCorta,
  minutosDeHora,
  normalizarHora,
  recesosDeBloques,
  soloFecha,
  validarBloques,
} from '#/lib/examenes'
import {
  createExamenHorario,
  previewExamenes,
  publicarExamenes,
  updateExamenHorario,
} from '#/services/examenes'
import type {
  ExamenBloqueInput,
  ExamenCrearRequest,
  ExamenDetalle,
  ExamenOpciones,
  ExamenPreview,
} from '#/services/examenes'

const WIZARD_STEPS = [
  { id: 'datos', label: 'Datos' },
  { id: 'bloques', label: 'Bloques' },
  { id: 'supervisores', label: 'Supervisores' },
  { id: 'tablero', label: 'Tablero' },
]

type SupervisorPair = { maestro_id: string; seccion_id: string }

type ExamenWizardProps = {
  open: boolean
  onClose: () => void
  opciones: ExamenOpciones
  detail: ExamenDetalle | null
  onSaved: () => void
}

/** Un examen (materia + sección) solo se conserva una vez. */
function dedupePlaced(items: PlacedExamen[]): PlacedExamen[] {
  const vistos = new Set<string>()
  return items.filter((item) => {
    const key = `${item.cursoId}|${item.seccionId}`
    if (vistos.has(key)) return false
    vistos.add(key)
    return true
  })
}

function placedFromDetail(detail: ExamenDetalle): PlacedExamen[] {
  return dedupePlaced(detail.asignaciones.map((a, i) => ({
    key: `detalle-${a.id || i}`,
    fecha: soloFecha(a.fecha),
    bloqueOrden: a.bloque_orden,
    seccionId: a.seccion_id,
    seccionNombre: a.seccion_nombre ?? '',
    gradoId: a.grado_id,
    gradoNombre: a.grado_nombre,
    cursoId: a.curso_id,
    cursoNombre: a.curso_nombre ?? 'Materia',
    asignacionDocenteId: a.asignacion_docente_id,
  })))
}

export function ExamenWizard({ open, onClose, opciones, detail, onSaved }: ExamenWizardProps) {
  const [step, setStep] = useState(0)
  const [periodoId, setPeriodoId] = useState('')
  const [parcialId, setParcialId] = useState('')
  const [modalidadId, setModalidadId] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [bloques, setBloques] = useState<ExamenBloqueInput[]>([])
  const [agregarSupervisores, setAgregarSupervisores] = useState(false)
  const [supervisores, setSupervisores] = useState<SupervisorPair[]>([])
  const [supervisorMaestro, setSupervisorMaestro] = useState('')
  const [supervisorSeccion, setSupervisorSeccion] = useState('')
  const [placed, setPlaced] = useState<PlacedExamen[]>([])
  const [pillSearch, setPillSearch] = useState('')
  const [preview, setPreview] = useState<ExamenPreview | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const initializedRef = useRef(false)

  const isEditing = Boolean(detail)
  const publicado = detail?.estado === 'publicado'

  useEffect(() => {
    if (!open) {
      initializedRef.current = false
      return
    }
    if (initializedRef.current) return
    initializedRef.current = true
    setStep(0)
    setPreview(null)
    setPillSearch('')
    setSupervisorMaestro('')
    setSupervisorSeccion('')
    setConfirmSave(false)
    setConfirmPublish(false)

    if (detail) {
      setPeriodoId(detail.periodo_academico_id)
      setParcialId(detail.parcial_id)
      setModalidadId(detail.modalidad_id)
      setFechaInicio(soloFecha(detail.fecha_inicio))
      setFechaFin(soloFecha(detail.fecha_fin))
      setBloques(
        detail.bloques
          .map((b) => ({
            orden: b.orden,
            hora_inicio: normalizarHora(b.hora_inicio),
            hora_fin: normalizarHora(b.hora_fin),
          }))
          .sort((a, b) => a.orden - b.orden),
      )
      setSupervisores(
        detail.supervisores.map((s) => ({
          maestro_id: s.maestro_id,
          seccion_id: s.seccion_id,
        })),
      )
      setAgregarSupervisores(detail.supervisores.length > 0)
      setPlaced(placedFromDetail(detail))
      return
    }

    const activo =
      opciones.periodos.find((p) => p.status === 'ACTIVE')?.id ?? ''
    setPeriodoId(activo)
    setParcialId('')
    setModalidadId('')
    setFechaInicio('')
    setFechaFin('')
    setBloques([])
    setAgregarSupervisores(false)
    setSupervisores([])
    setPlaced([])
  }, [open, detail, opciones])

  const modalidad = useMemo(
    () => opciones.modalidades.find((m) => m.id === modalidadId) ?? null,
    [opciones.modalidades, modalidadId],
  )

  const parcial = useMemo(
    () => opciones.parciales.find((p) => p.id === parcialId) ?? null,
    [opciones.parciales, parcialId],
  )

  const parcialesDelPeriodo = useMemo(
    () =>
      opciones.parciales.filter(
        (p) => !periodoId || p.periodo_academico_id === periodoId,
      ),
    [opciones.parciales, periodoId],
  )

  const seccionesDeModalidad = useMemo(
    () =>
      opciones.secciones.filter(
        (s) => !modalidadId || s.modalidad_id === modalidadId,
      ),
    [opciones.secciones, modalidadId],
  )

  const maestroById = useMemo(
    () => new Map(opciones.maestros.map((m) => [m.id, m])),
    [opciones.maestros],
  )

  const supervisoresAgrupados = useMemo(() => {
    const map = new Map<string, SupervisorPair[]>()
    for (const pair of supervisores) {
      const list = map.get(pair.maestro_id) ?? []
      list.push(pair)
      map.set(pair.maestro_id, list)
    }
    return [...map.entries()]
  }, [supervisores])

  const seccionById = useMemo(
    () => new Map(opciones.secciones.map((s) => [s.id, s])),
    [opciones.secciones],
  )

  const pills = useMemo<ExamenPill[]>(() => {
    if (!periodoId || !modalidadId) return []
    const base = opciones.asignaciones.filter(
      (a) =>
        a.periodo_academico_id === periodoId && a.modalidad_id === modalidadId,
    )
    const specific = base.map((a) => ({
      key: `asg-${a.id}`,
      cursoId: a.curso_id,
      cursoNombre: a.curso_nombre,
      gradoId: a.grado_id,
      gradoNombre: a.grado_nombre,
      seccionId: a.seccion_id,
      seccionNombre: a.seccion_nombre,
      asignacionDocenteId: a.id,
      soloMateria: false,
    }))
    const cursos = new Map<string, string>()
    for (const a of base) cursos.set(a.curso_id, a.curso_nombre)
    const solo = [...cursos.entries()].map(([cursoId, cursoNombre]) => ({
      key: `solo-${cursoId}`,
      cursoId,
      cursoNombre,
      seccionId: '',
      soloMateria: true,
    }))
    return [...solo, ...specific]
  }, [opciones.asignaciones, periodoId, modalidadId])

  const fechas = useMemo(
    () => fechasEntre(fechaInicio, fechaFin),
    [fechaInicio, fechaFin],
  )

  const recesos = useMemo(() => recesosDeBloques(bloques), [bloques])

  function validarDatos(): string | null {
    if (!periodoId) return 'Selecciona el periodo académico.'
    if (!parcialId) return 'Selecciona el parcial.'
    if (!parcial) return 'El parcial seleccionado no existe.'
    if (parcial.periodo_academico_id !== periodoId) {
      return 'El parcial no pertenece al periodo académico elegido.'
    }
    if (!modalidadId) return 'Selecciona la modalidad.'
    if (!fechaInicio || !fechaFin) return 'Indica la fecha de inicio y fin.'
    if (fechaFin < fechaInicio) {
      return 'La fecha de fin no puede ser anterior a la fecha de inicio.'
    }
    const pIni = soloFecha(parcial.fecha_inicio)
    const pFin = soloFecha(parcial.fecha_fin)
    if (fechaInicio < pIni || fechaFin > pFin) {
      return `Las fechas deben estar dentro del parcial (${fechaCorta(pIni)} – ${fechaCorta(pFin)}).`
    }
    return null
  }

  function handlePeriodoChange(id: string) {
    setPeriodoId(id)
    setParcialId('')
    setFechaInicio('')
    setFechaFin('')
    setPlaced([])
    setPreview(null)
  }

  function handleParcialChange(id: string) {
    setParcialId(id)
    const p = opciones.parciales.find((x) => x.id === id)
    const inicio = p ? soloFecha(p.fecha_inicio) : ''
    setFechaInicio(inicio)
    setFechaFin(inicio)
    setPlaced([])
    setPreview(null)
  }

  function handleModalidadChange(id: string) {
    setModalidadId(id)
    setPlaced([])
    setPreview(null)
    setSupervisores([])
    setAgregarSupervisores(false)
    const mod = opciones.modalidades.find((m) => m.id === id)
    setBloques(bloquesIniciales(mod?.hora_inicio ?? '08:00', 1, 90))
  }

  function siguiente() {
    if (step === 0) {
      const error = validarDatos()
      if (error) {
        toast.error(error)
        return
      }
    if (bloques.length === 0) {
      setBloques(bloquesIniciales(modalidad?.hora_inicio ?? '08:00', 1, 90))
    }
      setStep(1)
      return
    }
    if (step === 1) {
      const error = validarBloques(bloques)
      if (error) {
        toast.error(error)
        return
      }
      setStep(2)
      return
    }
    if (step === 2) {
      if (agregarSupervisores) {
        const unique = new Set(supervisores.map((s) => `${s.maestro_id}|${s.seccion_id}`))
        if (unique.size !== supervisores.length) {
          toast.error('Hay un maestro repetido en la misma sección.')
          return
        }
      }
      const validOrders = new Set(bloques.map((b) => b.orden))
      const validDates = new Set(fechas)
      setPlaced((prev) =>
        prev.filter(
          (p) => validOrders.has(p.bloqueOrden) && validDates.has(p.fecha),
        ),
      )
      setStep(3)
    }
  }

  function agregarBloque() {
    setBloques((prev) => {
      const ordered = [...prev].sort((a, b) => a.orden - b.orden)
      const ultimo = ordered[ordered.length - 1]
      const inicio = ultimo?.hora_fin || normalizarHora(modalidad?.hora_inicio ?? '08:00')
      return [
        ...ordered,
        {
          orden: ordered.length + 1,
          hora_inicio: inicio,
          hora_fin: horaDeMinutos(minutosDeHora(inicio) + 90),
        },
      ]
    })
  }

  function quitarBloque(index: number) {
    setBloques((prev) => {
      if (prev.length <= 1) return prev
      return prev
        .filter((_, i) => i !== index)
        .map((b, i) => ({ ...b, orden: i + 1 }))
    })
  }

  function updateBloque(index: number, field: 'hora_inicio' | 'hora_fin', value: string) {
    setBloques((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    )
  }

  function agregarSupervisor() {
    if (!supervisorMaestro) {
      toast.error('Elige un maestro.')
      return
    }
    if (!supervisorSeccion) {
      toast.error('Elige una sección.')
      return
    }
    if (
      supervisores.some(
        (s) =>
          s.maestro_id === supervisorMaestro && s.seccion_id === supervisorSeccion,
      )
    ) {
      toast.error('Ese maestro ya supervisa esa sección.')
      return
    }
    setSupervisores((prev) => [
      ...prev,
      { maestro_id: supervisorMaestro, seccion_id: supervisorSeccion },
    ])
    setSupervisorSeccion('')
  }

  function quitarSupervisor(maestroId: string, seccionId: string) {
    setSupervisores((prev) =>
      prev.filter(
        (s) => !(s.maestro_id === maestroId && s.seccion_id === seccionId),
      ),
    )
  }

  function quitarMaestro(maestroId: string) {
    setSupervisores((prev) => prev.filter((s) => s.maestro_id !== maestroId))
  }

  function buildBody(): ExamenCrearRequest {
    const errorDatos = validarDatos()
    if (errorDatos) throw new Error(errorDatos)
    const errorBloques = validarBloques(bloques)
    if (errorBloques) throw new Error(errorBloques)
    if (placed.length === 0) {
      throw new Error('Coloca al menos un examen en el tablero.')
    }
    return {
      periodo_academico_id: periodoId,
      parcial_id: parcialId,
      modalidad_id: modalidadId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      bloques: [...bloques]
        .sort((a, b) => a.orden - b.orden)
        .map((b) => ({
          orden: b.orden,
          hora_inicio: normalizarHora(b.hora_inicio),
          hora_fin: normalizarHora(b.hora_fin),
        })),
      asignaciones: placed.map((p) => ({
        fecha: p.fecha,
        bloque_orden: p.bloqueOrden,
        seccion_id: p.seccionId,
        curso_id: p.cursoId,
        asignacion_docente_id: p.asignacionDocenteId || null,
      })),
      supervisores: agregarSupervisores ? supervisores : [],
    }
  }

  const generateMut = useMutation({
    mutationFn: async () => {
      const errorDatos = validarDatos()
      if (errorDatos) throw new Error(errorDatos)
      const errorBloques = validarBloques(bloques)
      if (errorBloques) throw new Error(errorBloques)
      return previewExamenes({
        periodo_academico_id: periodoId,
        parcial_id: parcialId,
        modalidad_id: modalidadId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        bloques: [...bloques]
          .sort((a, b) => a.orden - b.orden)
          .map((b) => ({
            orden: b.orden,
            hora_inicio: normalizarHora(b.hora_inicio),
            hora_fin: normalizarHora(b.hora_fin),
          })),
        bloques_fijos: placed.map((p) => ({
          fecha: p.fecha,
          bloque_orden: p.bloqueOrden,
          seccion_id: p.seccionId,
          curso_id: p.cursoId,
          asignacion_docente_id: p.asignacionDocenteId || null,
        })),
      })
    },
    onSuccess: (data) => {
      setPreview(data)
      setPlaced(
        dedupePlaced(
          data.asignaciones.map((a, i) => ({
            key: `preview-${a.fecha}-${a.bloque_orden}-${a.seccion_id}-${i}`,
            fecha: soloFecha(a.fecha),
            bloqueOrden: a.bloque_orden,
            seccionId: a.seccion_id,
            seccionNombre: a.seccion_nombre ?? '',
            gradoId: a.grado_id,
            gradoNombre: a.grado_nombre,
            cursoId: a.curso_id,
            cursoNombre: a.curso_nombre ?? 'Materia',
            asignacionDocenteId: a.asignacion_docente_id,
          })),
        ),
      )
      toast.success('Propuesta generada')
      for (const aviso of data.avisos) toast.message(aviso.mensaje)
    },
    onError: (error) => toast.error(userMessageFromError(error)),
  })

  const guardarMut = useMutation({
    mutationFn: async () => {
      const body = buildBody()
      if (detail) return updateExamenHorario(detail.id, body)
      return createExamenHorario(body)
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Horario actualizado' : 'Horario guardado como borrador')
      setConfirmSave(false)
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(userMessageFromError(error)),
  })

  const publicarMut = useMutation({
    mutationFn: async () => {
      const body = buildBody()
      const saved = detail
        ? await updateExamenHorario(detail.id, body)
        : await createExamenHorario(body)
      return publicarExamenes(saved.id)
    },
    onSuccess: () => {
      toast.success('Horario publicado')
      setConfirmPublish(false)
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(userMessageFromError(error)),
  })

  const guardando = guardarMut.isPending || publicarMut.isPending

  return (
    <>
      <Modal
        open={open}
        title={
          isEditing
            ? `Editar horario de exámenes · v${detail?.numero_version ?? ''}`
            : 'Agregar horario de exámenes'
        }
        board
        onClose={onClose}
        footer={
          <>
            <div style={{ marginRight: 'auto' }} className="texto-muted">
              {step === 3 ? (
                <span style={{ fontSize: '0.8rem' }}>
                  {placed.length} exámenes · {bloques.length} bloques
                  {preview ? ` · semilla ${preview.semilla}` : ''}
                </span>
              ) : null}
            </div>
            {step === 3 ? (
              <button
                type="button"
                className="btn btn--ghost"
                disabled={placed.length === 0 || generateMut.isPending || guardando}
                onClick={() => {
                  setPlaced([])
                  setPreview(null)
                }}
                data-testid="examen-wizard-vaciar"
              >
                Vaciar
              </button>
            ) : null}
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            {step > 0 ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Atrás
              </button>
            ) : null}
            {step < 3 ? (
              <button type="button" className="btn btn--primary" onClick={siguiente}>
                Siguiente
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={generateMut.isPending || guardando}
                  onClick={() => generateMut.mutate()}
                >
                  {generateMut.isPending ? 'Generando…' : 'Generar'}
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={guardando}
                  onClick={() => setConfirmSave(true)}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={guardando}
                  onClick={() => setConfirmPublish(true)}
                >
                  {publicado ? 'Republicar' : 'Publicar'}
                </button>
              </>
            )}
          </>
        }
      >
        <div className="examen-wizard__body">
          <div className="examen-wizard__steps">
            <WizardSteps steps={WIZARD_STEPS} current={step} />
          </div>

        {step === 0 ? (
          <div className="wizard-pane" style={{ marginTop: '1rem' }}>
            <div className="wizard-grid">
              <Field label="Periodo académico">
                <Combobox
                  value={periodoId}
                  onChange={handlePeriodoChange}
                  options={opciones.periodos.map((p) => ({
                    value: p.id,
                    label: `${p.nombre} · ${p.anio_lectivo}`,
                    keywords: `${p.anio_lectivo} ${p.status}`,
                    muted: p.status !== 'ACTIVE',
                  }))}
                  placeholder="Buscar periodo…"
                />
              </Field>
              <Field label="Parcial">
                <Combobox
                  value={parcialId}
                  onChange={handleParcialChange}
                  options={parcialesDelPeriodo.map((p) => ({
                    value: p.id,
                    label: `${p.nombre} (${p.fecha_inicio.slice(0, 10)} – ${p.fecha_fin.slice(0, 10)})`,
                  }))}
                  placeholder="Buscar parcial…"
                />
              </Field>
              <Field label="Modalidad">
                <Combobox
                  value={modalidadId}
                  onChange={handleModalidadChange}
                  options={opciones.modalidades.map((m) => ({
                    value: m.id,
                    label: `${m.nombre} · ${m.hora_inicio}–${m.hora_fin}`,
                    keywords: m.codigo,
                  }))}
                  placeholder="Buscar modalidad…"
                />
              </Field>
              <div className="wizard-datos__fechas">
                <Field label="Fecha de inicio">
                  <input
                    type="date"
                    className="field__input"
                    value={fechaInicio}
                    min={parcial ? soloFecha(parcial.fecha_inicio) : undefined}
                    max={parcial ? soloFecha(parcial.fecha_fin) : undefined}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </Field>
                <Field label="Fecha de fin">
                  <input
                    type="date"
                    className="field__input"
                    value={fechaFin}
                    min={fechaInicio || (parcial ? soloFecha(parcial.fecha_inicio) : undefined)}
                    max={parcial ? soloFecha(parcial.fecha_fin) : undefined}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </Field>
              </div>
            </div>
            {parcial ? (
              <p className="wizard-pane__hint">
                El parcial va del {parcial.fecha_inicio.slice(0, 10)} al{' '}
                {parcial.fecha_fin.slice(0, 10)}. Las fechas del horario deben caer dentro.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="wizard-pane" style={{ marginTop: '1rem' }}>
            <p className="wizard-pane__hint">
              Cada bloque se repite todos los días. El receso es el hueco entre bloques:
              deja minutos libres entre uno y otro.
            </p>
            <div className="examen-bloques">
              {bloques.map((bloque, index) => {
                const duracion = duracionMinutos(bloque.hora_inicio, bloque.hora_fin)
                return (
                  <article key={bloque.orden} className="examen-bloque-card">
                    <header className="examen-bloque-card__head">
                      <span className="examen-bloque-card__title">Bloque {index + 1}</span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={bloques.length <= 1}
                        onClick={() => quitarBloque(index)}
                      >
                        Quitar
                      </button>
                    </header>
                    <div className="wizard-grid">
                      <Field label="Hora de inicio">
                        <input
                          type="time"
                          className="field__input"
                          value={bloque.hora_inicio}
                          onChange={(e) => updateBloque(index, 'hora_inicio', e.target.value)}
                        />
                      </Field>
                      <Field label="Hora de fin">
                        <input
                          type="time"
                          className="field__input"
                          value={bloque.hora_fin}
                          onChange={(e) => updateBloque(index, 'hora_fin', e.target.value)}
                        />
                      </Field>
                    </div>
                    <p
                      className="examen-bloque-card__dur"
                      data-testid={`bloque-duracion-${index}`}
                    >
                      {duracion > 0
                        ? `Duración: ${duracionTexto(duracion)}`
                        : 'Indica hora de inicio y fin.'}
                    </p>
                  </article>
                )
              })}
            </div>
            <button
              type="button"
              className="btn btn--ghost examen-bloques__agregar"
              onClick={agregarBloque}
              data-testid="examen-bloques-agregar"
            >
              Agregar bloque
            </button>
            {recesos.length > 0 ? (
              <div style={{ marginTop: '0.75rem' }}>
                <p className="horario-board__filter-label">Recesos (huecos)</p>
                <ul className="texto-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  {recesos.map((r) => (
                    <li key={`${r.despuesDe}-${r.inicio}`}>
                      Después del bloque {r.despuesDe}: {r.inicio}–{r.fin} ({r.minutos} min)
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wizard-pane" style={{ marginTop: '1rem' }}>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={agregarSupervisores}
                onChange={(e) => {
                  setAgregarSupervisores(e.target.checked)
                  if (!e.target.checked) setSupervisores([])
                }}
              />
              ¿Agregar supervisores?
            </label>
            <p className="wizard-pane__hint">
              Un maestro puede supervisar varias secciones y una sección puede tener varios
              maestros. Agrega cada par maestro-sección.
            </p>
            {agregarSupervisores ? (
              <>
                <div className="examen-supervisores__form">
                  <Field label="Maestro">
                    <Combobox
                      value={supervisorMaestro}
                      onChange={setSupervisorMaestro}
                      options={opciones.maestros.map((m) => ({
                        value: m.id,
                        label: `${m.codigo} · ${m.nombre}`,
                        keywords: m.codigo,
                      }))}
                      placeholder="Buscar maestro…"
                    />
                  </Field>
                  <Field label="Grado · sección">
                    <Combobox
                      value={supervisorSeccion}
                      onChange={setSupervisorSeccion}
                      options={seccionesDeModalidad.map((s) => ({
                        value: s.id,
                        label: `${s.grado_nombre} · ${s.nombre}`,
                      }))}
                      placeholder="Buscar sección…"
                    />
                  </Field>
                  <div className="examen-supervisores__accion" style={{ paddingBottom: '0.35rem' }}>
                    <button type="button" className="btn btn--primary" onClick={agregarSupervisor}>
                      + Agregar
                    </button>
                  </div>
                </div>
                <div className="examen-supervisores">
                  {supervisoresAgrupados.length === 0 ? (
                    <p className="texto-muted" style={{ fontSize: '0.85rem' }}>
                      Aún no hay supervisores.
                    </p>
                  ) : (
                    supervisoresAgrupados.map(([maestroId, pares]) => {
                      const maestro = maestroById.get(maestroId)
                      return (
                        <div key={maestroId} className="examen-supervisor-card">
                          <div className="examen-supervisor-card__head">
                            <strong className="examen-supervisor-card__name">
                              {maestro ? `${maestro.codigo} · ${maestro.nombre}` : maestroId}
                            </strong>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => quitarMaestro(maestroId)}
                            >
                              Quitar
                            </button>
                          </div>
                          <div className="examen-supervisor-card__chips">
                            {pares.map((par) => {
                              const seccion = seccionById.get(par.seccion_id)
                              return (
                                <span key={par.seccion_id} className="examen-supervisor-card__chip">
                                  <span className="examen-supervisor-card__chip-text">
                                    {seccion
                                      ? `${seccion.grado_nombre} · ${seccion.nombre}`
                                      : par.seccion_id}
                                  </span>
                                  <button
                                    type="button"
                                    className="horario-pill__remove"
                                    aria-label="Quitar sección"
                                    onClick={() => quitarSupervisor(maestroId, par.seccion_id)}
                                  >
                                    ×
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="horario-board-page">
            <ExamenBoard
              dates={fechas}
              bloques={[...bloques]
                .sort((a, b) => a.orden - b.orden)
                .map((b) => ({
                  orden: b.orden,
                  hora_inicio: normalizarHora(b.hora_inicio),
                  hora_fin: normalizarHora(b.hora_fin),
                }))}
              pills={pills}
              placed={placed}
              onPlacedChange={(next) => {
                setPlaced(next)
                setPreview(null)
              }}
              pillSearch={pillSearch}
              onPillSearchChange={setPillSearch}
              toolbar={
                preview ? (
                  <div style={{ display: 'grid', gap: '0.25rem' }}>
                    <span className="texto-muted" style={{ fontSize: '0.8rem' }}>
                      Semilla {preview.semilla} · {preview.resumen.colocadas} colocadas ·{' '}
                      {preview.resumen.sin_colocar} sin colocar · capacidad por sección{' '}
                      {preview.resumen.capacidad_por_seccion}
                    </span>
                    {preview.avisos.length > 0 ? (
                      <ul className="texto-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                        {preview.avisos.map((a) => (
                          <li key={a.codigo}>{a.mensaje}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : undefined
              }
            />
          </div>
        ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title={isEditing ? 'Guardar cambios' : 'Guardar horario'}
        message={
          publicado
            ? 'Este horario está publicado: al guardar se actualizará el contenido y se avisará a alumnos y supervisores. ¿Continuar?'
            : isEditing
              ? '¿Actualizar el horario de exámenes?'
              : '¿Guardar el horario de exámenes como borrador?'
        }
        confirmLabel={isEditing ? 'Guardar cambios' : 'Guardar'}
        confirmDisabled={guardando}
        onConfirm={() => guardarMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />

      <ConfirmDialog
        open={confirmPublish}
        title={publicado ? 'Republicar horario' : 'Publicar horario'}
        message={
          publicado
            ? 'Se volverá a publicar la versión activa y se avisará a alumnos y supervisores. ¿Continuar?'
            : 'Al publicar, la versión anterior de este periodo, parcial y modalidad se desactiva. ¿Continuar?'
        }
        confirmLabel="Publicar"
        confirmDisabled={guardando}
        onConfirm={() => publicarMut.mutate()}
        onCancel={() => setConfirmPublish(false)}
      />
    </>
  )
}
