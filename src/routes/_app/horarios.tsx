import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Can, RequirePermission, useCan } from '#/components/gates/Can'
import {
  HorarioBoard,
  placedFromPreviewSlots,
  slotsFromPlaced,
  type HorarioPill,
  type PlacedBlock,
} from '#/components/horarios/HorarioBoard'
import { HorarioViewModal } from '#/components/horarios/HorarioViewModal'
import { MaestroHorarioView } from '#/components/horarios/MaestroHorarioView'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { WizardSteps } from '#/components/ui/WizardSteps'
import { addMinutes, buildClassSlots, mergeTimeIntervals, suggestRecess, type TimeInterval } from '#/lib/horarioGrid'
import { userMessageFromError } from '#/lib/api'
import { periodoSelectOptions } from '#/helpers/periodos'
import { listAsignaciones } from '#/services/asignacion'
import {
  listCursos,
  listGrados,
  listModalidades,
  listPeriodos,
  listSecciones,
} from '#/services/catalogos'
import { listMaestros } from '#/services/personas'
import {
  confirmHorario,
  deleteHorarioVersion,
  getHorarioVersion,
  listHorarioVersiones,
  previewHorario,
  setHorarioVersionActiva,
  updateHorarioVersion,
  type HorarioPreview,
  type HorarioVersion,
  type HorarioVersionDetail,
} from '#/services/horarios'

export const Route = createFileRoute('/_app/horarios')({ component: HorariosPage })

type VersionRow = HorarioVersion & {
  periodo_nombre?: string
  periodo_modalidad?: string
}

const col = createColumnHelper<VersionRow>()

const WIZARD_STEPS = [
  { id: 'datos', label: 'Datos' },
  { id: 'recreo', label: 'Recreo' },
  { id: 'tablero', label: 'Tablero' },
]

function HorariosPage() {
  const { can, roles } = useCan()
  const isMaestroView = roles.includes('maestro') && !can('horarios:post')

  if (isMaestroView) {
    return (
      <RequirePermission permission="horarios:get">
        <MaestroHorarioView />
      </RequirePermission>
    )
  }

  return <HorariosAdminView />
}

function HorariosAdminView() {
  const { can } = useCan()
  const qc = useQueryClient()

  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })
  const { data: modalidades = [] } = useQuery({ queryKey: ['modalidades'], queryFn: listModalidades })
  const { data: secciones = [] } = useQuery({ queryKey: ['secciones'], queryFn: listSecciones })
  const { data: cursos = [] } = useQuery({ queryKey: ['cursos'], queryFn: listCursos })
  const { data: grados = [] } = useQuery({ queryKey: ['grados'], queryFn: listGrados })
  const { data: asignaciones = [] } = useQuery({ queryKey: ['asignaciones'], queryFn: listAsignaciones })
  const { data: maestros = [] } = useQuery({ queryKey: ['maestros'], queryFn: listMaestros })

  const [listPeriodoId, setListPeriodoId] = useState('')
  const [openWizard, setOpenWizard] = useState(false)
  const [step, setStep] = useState(0)
  const [periodoId, setPeriodoId] = useState('')
  const [modalidadId, setModalidadId] = useState('')
  const [recreoInicio, setRecreoInicio] = useState('09:40')
  const [recreoFin, setRecreoFin] = useState('10:00')
  const [placed, setPlaced] = useState<PlacedBlock[]>([])
  const [boardSlots, setBoardSlots] = useState<TimeInterval[]>([])
  const [pillSearch, setPillSearch] = useState('')
  const [preview, setPreview] = useState<HorarioPreview | null>(null)
  const [activar, setActivar] = useState(true)
  const [confirmGenerate, setConfirmGenerate] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [generateMode, setGenerateMode] = useState<'vaciar' | 'rellenar'>('rellenar')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState('')
  const [editingNumero, setEditingNumero] = useState(0)

  const [ctx, setCtx] = useState<{ x: number; y: number; row: VersionRow } | null>(null)
  const [viewDetail, setViewDetail] = useState<HorarioVersionDetail | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<VersionRow | null>(null)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [confirmToggle, setConfirmToggle] = useState<VersionRow | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const versionPeriodoId = periodoId || listPeriodoId
  const { data: versionesAll = [] } = useQuery({
    queryKey: ['horario-versiones', versionPeriodoId || 'all'],
    queryFn: () => listHorarioVersiones(versionPeriodoId || undefined),
    enabled: true,
  })
  const { data: versionesLista = [], isFetching: loadingVersiones } = useQuery({
    queryKey: ['horario-versiones', listPeriodoId || 'all'],
    queryFn: () => listHorarioVersiones(listPeriodoId || undefined),
  })

  const versiones = periodoId ? versionesAll : versionesLista
  const isEditing = Boolean(editingId)

  const modalidad = useMemo(
    () => modalidades.find((m) => m.id === modalidadId) ?? null,
    [modalidades, modalidadId],
  )

  const nextVersion = useMemo(() => {
    const max = versiones.reduce((acc, v) => Math.max(acc, v.numero_version), 0)
    return max + 1
  }, [versiones])

  const versionCode = isEditing ? editingCode : `vrs-${nextVersion}`

  const days = useMemo(() => [1, 2, 3, 4, 5], [])

  const recessInterval = useMemo(() => {
    if (!modalidad || modalidad.cantidad_recreos <= 0) return null
    return { start: recreoInicio, end: recreoFin }
  }, [modalidad, recreoInicio, recreoFin])

  const pills: HorarioPill[] = useMemo(() => {
    if (!periodoId || !modalidadId) return []
    const secOfMod = secciones.filter((s) => s.modalidad_id === modalidadId)
    const secIds = new Set(secOfMod.map((s) => s.id))
    const gradoById = new Map(grados.map((g) => [g.id, g]))
    const cursoById = new Map(cursos.map((c) => [c.id, c]))
    const seccionById = new Map(secOfMod.map((s) => [s.id, s]))
    const maestroById = new Map(maestros.map((m) => [m.id, m]))
    return asignaciones
      .filter(
        (a) =>
          a.status === 'ACTIVE' &&
          a.periodo_academico_id === periodoId &&
          secIds.has(a.seccion_id),
      )
      .map((a) => {
        const sec = seccionById.get(a.seccion_id)
        const curso = cursoById.get(a.curso_id)
        const grado = sec ? gradoById.get(sec.grado_id) : undefined
        const maestro = maestroById.get(a.maestro_id)
        const seccionLabel = [grado?.nombre, sec ? `sec${sec.nombre}` : ''].filter(Boolean).join(' ')
        const label = [curso?.nombre ?? 'Curso', grado?.nombre ?? '', sec ? `sec${sec.nombre}` : '']
          .filter(Boolean)
          .join('-')
        return {
          asignacionId: a.id,
          seccionId: a.seccion_id,
          cursoId: a.curso_id,
          maestroId: a.maestro_id,
          gradoId: sec?.grado_id ?? '',
          label,
          minHours: curso?.horas_semana_minimas ?? 1,
          maestroNombre: maestro?.nombre ?? a.maestro_id.slice(0, 8),
          cursoNombre: curso?.nombre ?? 'Curso',
          seccionLabel: seccionLabel || sec?.nombre || a.seccion_id.slice(0, 8),
          gradoNombre: grado?.nombre ?? '',
        }
      })
  }, [asignaciones, secciones, cursos, grados, maestros, periodoId, modalidadId])

  const labelByAsignacion = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pills) m.set(p.asignacionId, p.label)
    return m
  }, [pills])

  const tableRows = useMemo(
    () =>
      versionesLista.map((v) => {
        const periodoNombre =
          v.periodo_nombre || periodos.find((p) => p.id === v.periodo_academico_id)?.nombre || ''
        const modalidadNombre =
          v.modalidad_nombre ||
          modalidades.find((m) => m.id === v.modalidad_id)?.nombre ||
          ''
        return {
          ...v,
          periodo_nombre: periodoNombre,
          modalidad_nombre: modalidadNombre,
          periodo_modalidad: [periodoNombre, modalidadNombre].filter(Boolean).join(' · ') || '—',
        }
      }),
    [versionesLista, periodos, modalidades],
  )

  const columns = useMemo(
    () => [
      col.accessor('codigo_semilla', { header: 'Versión' }),
      col.accessor('periodo_modalidad', { header: 'Periodo · modalidad' }),
      col.accessor('es_activa', {
        header: 'Estado',
        cell: (i) => (i.getValue() ? 'Activa' : 'Inactiva'),
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      {
        id: 'periodo_modalidad',
        label: 'Periodo · modalidad',
        getValue: (r: VersionRow) => r.periodo_modalidad ?? '',
      },
      {
        id: 'es_activa',
        label: 'Estado',
        getValue: (r: VersionRow) => (r.es_activa ? 'Activa' : 'Inactiva'),
      },
    ],
    [],
  )

  function resetWizardState() {
    setStep(0)
    setPlaced([])
    setBoardSlots([])
    setPreview(null)
    setPillSearch('')
    setEditingId(null)
    setEditingCode('')
    setEditingNumero(0)
    setActivar(true)
  }

  function openCreate() {
    resetWizardState()
    setPeriodoId(listPeriodoId || '')
    setModalidadId('')
    setOpenWizard(true)
  }

  function closeWizard() {
    setOpenWizard(false)
    resetWizardState()
  }

  async function openView(row: VersionRow) {
    closeCtx()
    setViewOpen(true)
    setViewLoading(true)
    setViewDetail(null)
    try {
      const d = await getHorarioVersion(row.id)
      setViewDetail(d)
    } catch (e) {
      toast.error(userMessageFromError(e))
      setViewOpen(false)
    } finally {
      setViewLoading(false)
    }
  }

  async function openEdit(row: VersionRow) {
    closeCtx()
    try {
      const d = await getHorarioVersion(row.id)
      const modId = d.modalidad_id || ''
      const mod = modalidades.find((m) => m.id === modId)
      setEditingId(d.id)
      setEditingCode(d.codigo_semilla)
      setEditingNumero(d.numero_version)
      setPeriodoId(d.periodo_academico_id)
      setModalidadId(modId)
      setListPeriodoId(d.periodo_academico_id)
      setActivar(d.es_activa)
      setPreview(null)
      setPillSearch('')

      let recess: TimeInterval | null = null
      if (d.recreo_inicio && d.recreo_fin) {
        recess = { start: d.recreo_inicio.slice(0, 5), end: d.recreo_fin.slice(0, 5) }
        setRecreoInicio(recess.start)
        setRecreoFin(recess.end)
      } else if (mod && mod.cantidad_recreos > 0 && mod.duracion_recreo_minutos > 0) {
        recess = suggestRecess(
          mod.hora_inicio,
          mod.hora_fin,
          mod.duracion_hora_clase_minutos || 40,
          mod.duracion_recreo_minutos,
        )
        setRecreoInicio(recess.start)
        setRecreoFin(recess.end)
      }

      const labels = new Map<string, string>()
      for (const s of d.slots) labels.set(s.asignacion_docente_id, s.label)
      setPlaced(
        placedFromPreviewSlots(
          d.slots.map((s) => ({
            asignacion_docente_id: s.asignacion_docente_id,
            seccion_id: s.seccion_id,
            curso_id: s.curso_id,
            maestro_id: s.maestro_id,
            dia_semana: s.dia_semana,
            hora_inicio: s.hora_inicio,
            hora_fin: s.hora_fin,
            es_fijo: s.es_fijo,
          })),
          labels,
        ),
      )

      if (mod) {
        const base = buildClassSlots(
          mod.hora_inicio,
          mod.hora_fin,
          mod.duracion_hora_clase_minutos || 40,
          recess,
        )
        setBoardSlots(
          mergeTimeIntervals(
            base,
            d.slots.map((s) => ({ start: s.hora_inicio, end: s.hora_fin })),
          ),
        )
      } else {
        setBoardSlots(
          mergeTimeIntervals(
            [],
            d.slots.map((s) => ({ start: s.hora_inicio, end: s.hora_fin })),
          ),
        )
      }

      setOpenWizard(true)
      setStep(2)
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  function goRecreo() {
    if (!periodoId || !modalidadId) {
      toast.error('Selecciona periodo y modalidad')
      return
    }
    if (periodoId !== listPeriodoId) {
      setListPeriodoId(periodoId)
    }
    const mod = modalidades.find((m) => m.id === modalidadId)
    if (mod && mod.cantidad_recreos > 0 && mod.duracion_recreo_minutos > 0) {
      const sug = suggestRecess(
        mod.hora_inicio,
        mod.hora_fin,
        mod.duracion_hora_clase_minutos || 40,
        mod.duracion_recreo_minutos,
      )
      setRecreoInicio(sug.start)
      setRecreoFin(sug.end)
    }
    setStep(1)
  }

  function goTablero() {
    if (!modalidad) return
    if (modalidad.cantidad_recreos > 0) {
      if (!recreoInicio || !recreoFin || recreoInicio >= recreoFin) {
        toast.error('Indica hora de inicio y fin del recreo válidas')
        return
      }
    }
    const slotMin = modalidad.duracion_hora_clase_minutos || 40
    setBoardSlots(
      buildClassSlots(
        modalidad.hora_inicio,
        modalidad.hora_fin,
        slotMin,
        modalidad.cantidad_recreos > 0 ? { start: recreoInicio, end: recreoFin } : null,
      ),
    )
    setStep(2)
  }

  const generateMut = useMutation({
    mutationFn: async () => {
      if (!modalidad) throw new Error('Modalidad requerida')
      const slotMin = modalidad.duracion_hora_clase_minutos || 40
      const fijos =
        generateMode === 'vaciar'
          ? []
          : slotsFromPlaced(placed).map((s) => ({
              asignacion_docente_id: s.asignacion_docente_id,
              seccion_id: s.seccion_id,
              curso_id: s.curso_id,
              maestro_id: s.maestro_id,
              dia_semana: s.dia_semana,
              hora_inicio: s.hora_inicio,
              hora_fin: s.hora_fin,
            }))
      const used = new Map<string, number>()
      for (const f of fijos) {
        used.set(f.asignacion_docente_id, (used.get(f.asignacion_docente_id) ?? 0) + 1)
      }
      const asg = pills
        .map((p) => {
          const have = used.get(p.asignacionId) ?? 0
          const remaining = Math.max(0, p.minHours - have)
          return {
            asignacion_docente_id: p.asignacionId,
            seccion_id: p.seccionId,
            curso_id: p.cursoId,
            maestro_id: p.maestroId,
            horas_semana_minimas: remaining,
            grado_label: p.label,
          }
        })
        .filter((a) => a.horas_semana_minimas > 0)

      const recreos =
        modalidad.cantidad_recreos > 0
          ? [{ hora_inicio: recreoInicio, hora_fin: recreoFin }]
          : []

      const lastEnd =
        boardSlots.length > 0
          ? [...boardSlots].sort((a, b) => a.start.localeCompare(b.start)).at(-1)!.end
          : modalidad.hora_fin
      const extraEnd =
        lastEnd > modalidad.hora_fin ? lastEnd : addMinutes(modalidad.hora_fin, slotMin * 2)

      return previewHorario({
        slot_minutes: slotMin,
        modalidad_hora_inicio: modalidad.hora_inicio,
        modalidad_hora_fin: modalidad.hora_fin,
        extra_hora_fin: extraEnd,
        dias: days,
        recreos,
        bloques_fijos: fijos,
        asignaciones: asg,
        numero_version: isEditing ? editingNumero : nextVersion,
        codigo_semilla: versionCode,
      })
    },
    onSuccess: (data) => {
      setPreview(data)
      setPlaced(placedFromPreviewSlots(data.slots, labelByAsignacion))
      if (modalidad) {
        const slotMin = modalidad.duracion_hora_clase_minutos || 40
        const recess =
          modalidad.cantidad_recreos > 0 ? { start: recreoInicio, end: recreoFin } : null
        const base = buildClassSlots(
          modalidad.hora_inicio,
          modalidad.hora_fin,
          slotMin,
          recess,
        )
        const extras = data.slots
          .filter((s) => s.hora_inicio >= modalidad.hora_fin)
          .map((s) => ({ start: s.hora_inicio, end: s.hora_fin }))
        setBoardSlots(mergeTimeIntervals(base, extras))
      }
      setConfirmGenerate(false)
      toast.success('Horario generado')
      for (const a of data.avisos) toast.message(a.mensaje)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const confirmMut = useMutation({
    mutationFn: () => {
      if (!periodoId) throw new Error('Periodo requerido')
      const slots = preview?.slots?.length ? preview.slots : slotsFromPlaced(placed)
      if (!slots.length) throw new Error('No hay slots para guardar')
      if (editingId) {
        return updateHorarioVersion(editingId, {
          slots,
          activar,
          recreo_inicio: modalidad?.cantidad_recreos ? recreoInicio : '',
          recreo_fin: modalidad?.cantidad_recreos ? recreoFin : '',
        })
      }
      return confirmHorario({
        periodo_academico_id: periodoId,
        codigo_semilla: preview?.codigo_semilla ?? versionCode,
        numero_version: preview?.numero_version ?? nextVersion,
        slots,
        activar,
        recreo_inicio: modalidad?.cantidad_recreos ? recreoInicio : undefined,
        recreo_fin: modalidad?.cantidad_recreos ? recreoFin : undefined,
      })
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Horario actualizado' : 'Horario guardado')
      setConfirmSave(false)
      closeWizard()
      void qc.invalidateQueries({ queryKey: ['horario-versiones'] })
      if (periodoId) setListPeriodoId(periodoId)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const toggleMut = useMutation({
    mutationFn: (row: VersionRow) => setHorarioVersionActiva(row.id, !row.es_activa),
    onSuccess: (_, row) => {
      toast.success(row.es_activa ? 'Horario desactivado' : 'Horario activado')
      setConfirmToggle(null)
      void qc.invalidateQueries({ queryKey: ['horario-versiones'] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteHorarioVersion(id),
    onSuccess: () => {
      toast.success('Horario eliminado')
      setConfirmDelete(null)
      setDeleteTyped('')
      void qc.invalidateQueries({ queryKey: ['horario-versiones'] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const deleteExpected = confirmDelete
    ? `${confirmDelete.codigo_semilla} / ${confirmDelete.periodo_nombre || 'Periodo'}`
    : ''
  const deleteMatches =
    Boolean(confirmDelete) && deleteTyped.trim().toLowerCase() === deleteExpected.toLowerCase()

  const boardOpen = openWizard && step === 2

  return (
    <RequirePermission permission="horarios:get">
      <div style={{ marginBottom: '0.75rem', maxWidth: 420 }}>
        <Field label="Periodo (lista de versiones)">
          <Combobox
            data-testid="horario-list-periodo"
            value={listPeriodoId}
            onChange={setListPeriodoId}
            options={[
              { value: '', label: 'Todos los periodos' },
              ...periodoSelectOptions(periodos),
            ]}
            placeholder="Filtrar por periodo…"
          />
        </Field>
      </div>

      <DataTable
        title="Horarios"
        data={tableRows}
        columns={columns}
        filters={filters}
        addLabel="Agregar horarios"
        canAdd={can('horarios:post')}
        onAdd={openCreate}
        searchPlaceholder="Buscar…"
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />
      {loadingVersiones ? (
        <p className="texto-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          Cargando versiones…
        </p>
      ) : null}

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="ctx-menu__item" onClick={() => void openView(ctx.row)}>
            Ver
          </button>
          <Can permission="horarios:put">
            <button
              type="button"
              className="ctx-menu__item"
              onClick={() => {
                setConfirmToggle(ctx.row)
                closeCtx()
              }}
            >
              {ctx.row.es_activa ? 'Desactivar' : 'Activar'}
            </button>
            <button type="button" className="ctx-menu__item" onClick={() => void openEdit(ctx.row)}>
              Editar
            </button>
            <button
              type="button"
              className="ctx-menu__item ctx-menu__item--danger"
              onClick={() => {
                setConfirmDelete(ctx.row)
                setDeleteTyped('')
                closeCtx()
              }}
            >
              Eliminar
            </button>
          </Can>
        </div>
      ) : null}

      <Modal
        open={openWizard && step < 2}
        title={isEditing ? `Editar horario · ${versionCode}` : 'Agregar horarios'}
        xl
        onClose={closeWizard}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={closeWizard}>
              Cancelar
            </button>
            {step === 0 ? (
              <button type="button" className="btn btn--primary" onClick={goRecreo}>
                Siguiente
              </button>
            ) : (
              <>
                <button type="button" className="btn btn--ghost" onClick={() => setStep(0)}>
                  Atrás
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  data-testid="horario-wizard-to-board"
                  onClick={goTablero}
                >
                  Siguiente
                </button>
              </>
            )}
          </>
        }
      >
        <WizardSteps steps={WIZARD_STEPS} current={step} />
        {step === 0 ? (
          <div className="wizard-pane" style={{ marginTop: '1rem' }}>
            <div className="wizard-grid">
              <Field label="Periodo académico">
                <Combobox
                  data-testid="horario-periodo-select"
                  value={periodoId}
                  onChange={setPeriodoId}
                  disabled={isEditing}
                  options={periodoSelectOptions(periodos)}
                  placeholder="Buscar periodo…"
                />
              </Field>
              <Field label="Modalidad">
                <Combobox
                  data-testid="horario-modalidad-select"
                  value={modalidadId}
                  onChange={setModalidadId}
                  disabled={isEditing}
                  options={modalidades.map((m) => ({
                    value: m.id,
                    label: m.nombre,
                    keywords: m.codigo,
                  }))}
                  placeholder="Buscar modalidad…"
                />
              </Field>
              <Field label="Versión">
                <p data-testid="horario-version-code" className="texto-primary" style={{ margin: 0 }}>
                  {versionCode}
                </p>
              </Field>
              {modalidad ? (
                <p className="texto-muted" style={{ gridColumn: '1 / -1', fontSize: '0.85rem' }}>
                  Jornada {modalidad.hora_inicio}–{modalidad.hora_fin} · clase{' '}
                  {modalidad.duracion_hora_clase_minutos} min · recreo {modalidad.cantidad_recreos}×
                  {modalidad.duracion_recreo_minutos} min
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="wizard-pane" style={{ marginTop: '1rem' }}>
            <p className="wizard-pane__hint">
              Define el recreo antes del tablero para alinear las franjas (duración según modalidad).
            </p>
            <div className="wizard-grid">
              <Field label="Inicio recreo">
                <input
                  type="time"
                  className="field__input"
                  value={recreoInicio}
                  onChange={(e) => setRecreoInicio(e.target.value)}
                  data-testid="horario-recreo-inicio"
                />
              </Field>
              <Field label="Fin recreo">
                <input
                  type="time"
                  className="field__input"
                  value={recreoFin}
                  onChange={(e) => setRecreoFin(e.target.value)}
                  data-testid="horario-recreo-fin"
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={boardOpen}
        title={isEditing ? `Editar horario · ${versionCode}` : `Armar horario · ${versionCode}`}
        board
        onClose={closeWizard}
        footer={
          <>
            <label style={{ marginRight: 'auto', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={activar} onChange={(e) => setActivar(e.target.checked)} />{' '}
              Activar al guardar
            </label>
            <button type="button" className="btn btn--ghost" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              data-testid="horario-generate-button"
              disabled={generateMut.isPending || pills.length === 0}
              onClick={() => setConfirmGenerate(true)}
            >
              Generar
            </button>
            <Can permission={isEditing ? 'horarios:put' : 'horarios:post'}>
              <button
                type="button"
                className="btn btn--primary"
                data-testid="horario-confirm-button"
                disabled={confirmMut.isPending || (placed.length === 0 && !preview)}
                onClick={() => setConfirmSave(true)}
              >
                Guardar
              </button>
            </Can>
          </>
        }
      >
        <div className="horario-board-page">
          {modalidad ? (
            <HorarioBoard
              days={days}
              slots={boardSlots}
              onSlotsChange={(next) => {
                setBoardSlots(next)
                setPreview(null)
              }}
              slotMinutes={modalidad.duracion_hora_clase_minutos || 40}
              recess={recessInterval}
              jornadaFin={modalidad.hora_fin}
              pills={pills}
              placed={placed}
              onPlacedChange={(next) => {
                setPlaced(next)
                setPreview(null)
              }}
              pillSearch={pillSearch}
              onPillSearchChange={setPillSearch}
              toolbar={
                <>
                  <WizardSteps steps={WIZARD_STEPS} current={2} />
                  <span className="texto-muted" style={{ fontSize: '0.8rem' }}>
                    {pills.length} pastillas · {placed.length} celdas ocupadas
                    {preview ? ` · semilla ${preview.codigo_semilla}` : ''}
                  </span>
                </>
              }
            />
          ) : (
            <p className="texto-muted">No se pudo cargar la modalidad de esta versión.</p>
          )}
        </div>
      </Modal>

      <HorarioViewModal
        open={viewOpen}
        detail={viewDetail}
        loading={viewLoading}
        jornadaFin={
          modalidades.find((m) => m.id === (viewDetail?.modalidad_id || ''))?.hora_fin
        }
        onClose={() => {
          setViewOpen(false)
          setViewDetail(null)
        }}
      />

      <ConfirmDialog
        open={confirmGenerate}
        title="Generar horario"
        message={
          generateMode === 'vaciar'
            ? 'Se vaciará el tablero y se regenerará todo. ¿Continuar?'
            : 'Se conservarán los bloques fijados a mano y se rellenarán huecos. ¿Continuar?'
        }
        confirmLabel={generateMode === 'vaciar' ? 'Vaciar y generar' : 'Rellenar huecos'}
        onConfirm={() => generateMut.mutate()}
        onCancel={() => setConfirmGenerate(false)}
      />
      {confirmGenerate ? (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            display: 'flex',
            gap: '0.5rem',
            background: 'var(--sasha-bg-raised)',
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            border: '1px solid var(--sasha-border-suave)',
          }}
        >
          <button
            type="button"
            className={`btn ${generateMode === 'rellenar' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setGenerateMode('rellenar')}
          >
            Rellenar huecos
          </button>
          <button
            type="button"
            className={`btn ${generateMode === 'vaciar' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setGenerateMode('vaciar')}
          >
            Vaciar todo
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmSave}
        title={isEditing ? 'Guardar cambios' : 'Guardar horario'}
        message={
          isEditing
            ? `¿Actualizar la versión ${versionCode}?`
            : `¿Guardar la versión ${preview?.codigo_semilla ?? versionCode}?`
        }
        onConfirm={() => confirmMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />

      <ConfirmDialog
        open={Boolean(confirmToggle)}
        title={confirmToggle?.es_activa ? 'Desactivar horario' : 'Activar horario'}
        message={
          confirmToggle?.es_activa
            ? `¿Desactivar ${confirmToggle.codigo_semilla} (${confirmToggle.periodo_nombre})?`
            : `¿Activar ${confirmToggle?.codigo_semilla} (${confirmToggle?.periodo_modalidad || confirmToggle?.periodo_nombre})? Se desactivarán otras versiones del mismo periodo y modalidad.`
        }
        confirmLabel={confirmToggle?.es_activa ? 'Desactivar' : 'Activar'}
        onConfirm={() => confirmToggle && toggleMut.mutate(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />

      <Modal
        open={Boolean(confirmDelete)}
        title="Eliminar horario"
        onClose={() => {
          setConfirmDelete(null)
          setDeleteTyped('')
        }}
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setConfirmDelete(null)
                setDeleteTyped('')
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--danger"
              disabled={!deleteMatches || deleteMut.isPending}
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
            >
              Eliminar
            </button>
          </>
        }
      >
        <div className="horario-delete-confirm">
          <p className="horario-delete-confirm__hint">
            Para confirmar, escribe exactamente la versión y el periodo:
          </p>
          <div className="horario-delete-confirm__expected">{deleteExpected}</div>
          <Field label="Confirmación">
            <input
              className="field__input"
              value={deleteTyped}
              onChange={(e) => setDeleteTyped(e.target.value)}
              placeholder={deleteExpected}
              autoComplete="off"
              data-testid="horario-delete-confirm-input"
            />
          </Field>
        </div>
      </Modal>
    </RequirePermission>
  )
}
