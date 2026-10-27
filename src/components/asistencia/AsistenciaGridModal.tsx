import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { SearchInput } from '#/components/ui/SearchInput'
import { userMessageFromError } from '#/lib/api'
import {
  downloadAsistenciaPdf,
  getSemanaAsistencia,
  getSemanaSeccion,
  guardarLista,
  guardarListaSeccion,
  LETRA_TO_CODIGO,
  nextLetra,
  nextLetraSeccion,
} from '#/services/asistencia'
import type {
  AsistenciaMateria,
  AsistenciaSeccion,
  SemanaMarca,
  SemanaResponse,
  SemanaSeccionResponse,
} from '#/services/asistencia'

export type AsistenciaGridMode = 'pasar' | 'editar' | 'ver'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function diaRelativo(fecha: string, hoy: string): 'pasado' | 'hoy' | 'futuro' {
  if (fecha === hoy) return 'hoy'
  if (fecha > hoy) return 'futuro'
  return 'pasado'
}

type Cambio = { alumno_id: string; fecha: string; letra: string }

const celdaKey = (alumnoId: string, fecha: string) => `${alumnoId}:${fecha}`

export function AsistenciaGridModal({
  materia,
  seccion,
  mode,
  onClose,
  inline = false,
  extraActions,
}: {
  materia: AsistenciaMateria
  /** Si viene, la grilla es la lista general de la sección (endpoint /asistencia/seccion/*). */
  seccion?: AsistenciaSeccion
  mode: AsistenciaGridMode
  onClose: () => void
  /** Se muestra dentro de la página (sin modal), p. ej. para el maestro dentro de su clase. */
  inline?: boolean
  extraActions?: ReactNode
}) {
  const { open, dismiss } = useDismiss(onClose)
  const qc = useQueryClient()
  const readOnly = mode === 'ver' || Boolean(seccion && !seccion.puede_editar)
  const [fechaRef, setFechaRef] = useState(todayISO)
  const [semana, setSemana] = useState<SemanaResponse | null>(null)
  const [seccionSemana, setSeccionSemana] = useState<SemanaSeccionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [alumnoFilter, setAlumnoFilter] = useState('')
  const [cambios, setCambios] = useState<Partial<Record<string, Cambio>>>({})
  const [saving, setSaving] = useState(false)
  const [confirmGuardar, setConfirmGuardar] = useState(false)
  const [confirmSalir, setConfirmSalir] = useState(false)
  const [vista, setVista] = useState<'semana' | 'dia'>(inline || seccion ? 'dia' : 'semana')

  const effectiveFecha = mode === 'pasar' ? todayISO() : fechaRef
  const dias = useMemo(() => {
    if (!semana) return []
    return vista === 'dia' ? semana.dias.filter((d) => d.fecha === effectiveFecha) : semana.dias
  }, [semana, vista, effectiveFecha])
  const fechasVisibles = useMemo(() => new Set(dias.map((d) => d.fecha)), [dias])
  const totalCambios = Object.keys(cambios).length

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (seccion) {
        const s = await getSemanaSeccion(seccion.seccion_id, effectiveFecha)
        setSeccionSemana(s)
        setSemana({
          asignacion_docente_id: '',
          curso_nombre: '',
          fecha_ref: s.fecha_ref,
          semana_inicio: s.semana_inicio,
          semana_fin: s.semana_fin,
          dias: s.dias.map((d) => ({ fecha: d.fecha, dia_semana: d.dia_semana, etiqueta: d.etiqueta })),
          alumnos: s.alumnos.map((a) => ({
            alumno_id: a.alumno_id,
            codigo: a.codigo,
            nombre: a.nombre,
            marcas: a.marcas.map((m) => ({
              fecha: m.fecha,
              tipo_codigo: m.tipo_codigo,
              letra: m.mixto ? '' : m.letra,
              mixto: m.mixto,
              bloqueada: m.bloqueada,
              excusa_tipo: m.excusa_tipo,
            })),
          })),
        })
      } else {
        const s = await getSemanaAsistencia(materia.asignacion_docente_id, effectiveFecha)
        setSemana(s)
        setSeccionSemana(null)
      }
    } catch (e) {
      toast.error(userMessageFromError(e))
      setSemana(null)
      setSeccionSemana(null)
    } finally {
      setLoading(false)
    }
  }, [materia.asignacion_docente_id, seccion, effectiveFecha])

  useEffect(() => {
    void load()
  }, [load])

  const title = seccion
    ? `Asistencia · ${seccion.grado_nombre} ${seccion.seccion_nombre} · ${seccion.periodo_nombre}`
    : inline
      ? `Asistencia · ${materia.curso_nombre} · ${materia.grado_nombre} sec${materia.seccion_nombre}`
      : mode === 'pasar'
        ? `Pasar asistencia — ${materia.curso_nombre}`
        : mode === 'editar'
          ? `Editar asistencia — ${materia.curso_nombre}`
          : `Ver asistencia — ${materia.curso_nombre}`

  const alumnosFiltrados = useMemo(() => {
    if (!semana) return []
    const q = alumnoFilter.trim().toLowerCase()
    if (!q) return semana.alumnos
    return semana.alumnos.filter(
      (a) => a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q),
    )
  }, [semana, alumnoFilter])

  const diaActual = seccionSemana?.dias.find((d) => d.fecha === effectiveFecha)
  const hayMixto = Boolean(
    seccionSemana?.alumnos.some((a) => a.marcas.some((m) => m.mixto && m.fecha === effectiveFecha)),
  )

  const cycleCelda = (alumnoId: string, m: SemanaMarca) => {
    if (readOnly || saving) return
    if (m.bloqueada) {
      toast.message(
        `El alumno tiene una excusa registrada${m.excusa_tipo ? ` (${m.excusa_tipo})` : ''}; no se puede cambiar`,
      )
      return
    }
    if (diaRelativo(m.fecha, todayISO()) === 'futuro') {
      toast.message('No se puede marcar asistencia en días futuros')
      return
    }
    const key = celdaKey(alumnoId, m.fecha)
    const actual = cambios[key]?.letra ?? (m.letra || (seccion ? 'A' : ''))
    const nueva = seccion ? (m.mixto ? 'A' : nextLetraSeccion(actual)) : nextLetra(actual)
    setCambios((prev) => {
      const next = { ...prev }
      if (nueva === (m.letra || '')) delete next[key]
      else next[key] = { alumno_id: alumnoId, fecha: m.fecha, letra: nueva }
      return next
    })
  }

  const guardar = async () => {
    setConfirmGuardar(false)
    setSaving(true)
    try {
      if (seccion) {
        const items = (semana?.alumnos ?? []).map((a) => {
          const marca = a.marcas.find((m) => m.fecha === effectiveFecha)
          const key = celdaKey(a.alumno_id, effectiveFecha)
          const letra = cambios[key]?.letra ?? (marca?.letra || 'A')
          return { alumno_id: a.alumno_id, tipo_codigo: LETRA_TO_CODIGO[letra] ?? 'presente' }
        })
        if (items.length === 0) {
          toast.error('La sección no tiene alumnos activos.')
          return
        }
        const res = await guardarListaSeccion(seccion.seccion_id, effectiveFecha, items)
        toast.success(
          `Asistencia de la sección guardada (${res.alumnos_guardados} alumnos, ${res.clases_afectadas} clases)`,
        )
        void qc.invalidateQueries({ queryKey: ['asistencia-secciones'] })
        void qc.invalidateQueries({ queryKey: ['asistencia-semana-seccion', seccion.seccion_id] })
        void qc.invalidateQueries({ queryKey: ['asistencia-materias'] })
        void qc.invalidateQueries({ queryKey: ['maestro-dashboard'] })
        void qc.invalidateQueries({ queryKey: ['asistencia-inasistencias'] })
      } else {
        await guardarLista(
          materia.asignacion_docente_id,
          Object.values(cambios)
            .filter((c): c is Cambio => c !== undefined)
            .map((c) => ({
              alumno_id: c.alumno_id,
              fecha: c.fecha,
              tipo_codigo: LETRA_TO_CODIGO[c.letra] ?? '',
            })),
        )
        toast.success('Asistencia guardada')
        void qc.invalidateQueries({ queryKey: ['maestro-dashboard', materia.asignacion_docente_id] })
      }
      setCambios({})
      await load()
    } catch (e) {
      toast.error(userMessageFromError(e))
      await load()
    } finally {
      setSaving(false)
    }
  }

  const cerrar = () => {
    if (confirmGuardar || confirmSalir) return
    if (totalCambios > 0) setConfirmSalir(true)
    else dismiss()
  }

  const onDownloadPdf = async () => {
    try {
      await downloadAsistenciaPdf(materia.asignacion_docente_id, effectiveFecha)
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const puedeGuardar = seccion ? true : totalCambios > 0
  const guardarButton = !readOnly ? (
    <button
      type="button"
      className="btn btn--primary"
      data-testid="asistencia-guardar"
      disabled={!puedeGuardar || saving}
      onClick={() => setConfirmGuardar(true)}
    >
      {saving
        ? 'Guardando…'
        : seccion
          ? 'Guardar lista'
          : totalCambios > 0
            ? `Guardar (${totalCambios})`
            : 'Guardar'}
    </button>
  ) : null

  const pdfButton = seccion ? null : (
    <button
      type="button"
      className={`btn ${inline ? 'btn--ghost' : 'btn--primary'}`}
      data-testid="asistencia-download-pdf"
      onClick={() => void onDownloadPdf()}
    >
      Descargar PDF
    </button>
  )

  const footer = (
    <>
      {mode === 'ver' ? pdfButton : null}
      <button type="button" className="btn btn--ghost" onClick={cerrar}>
        {readOnly ? 'Cerrar' : 'Cancelar'}
      </button>
      {guardarButton}
    </>
  )

  const inlineActions = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginLeft: 'auto' }}>
      {extraActions}
      {pdfButton}
      {!readOnly && totalCambios > 0 ? (
        <button
          type="button"
          className="btn btn--ghost"
          data-testid="asistencia-descartar"
          disabled={saving}
          onClick={() => setConfirmSalir(true)}
        >
          Descartar
        </button>
      ) : null}
      {guardarButton}
    </div>
  )

  const body = (
      <div data-testid="asistencia-grid-modal">
        <p className="texto-muted" style={{ marginTop: 0, fontSize: '0.85rem' }} data-testid="asistencia-seccion-meta">
          {!semana
            ? 'Cargando semana…'
            : vista === 'dia'
              ? `Día ${effectiveFecha}`
              : `Semana ${semana.semana_inicio} — ${semana.semana_fin}`}
          {' · '}
          {seccion ? `${seccion.grado_nombre} ${seccion.seccion_nombre}` : materia.seccion_nombre}
          {seccion && diaActual?.maestro_registro?.nombre
            ? ` · Tomada por: ${diaActual.maestro_registro.nombre}`
            : ''}
          {seccion && diaActual?.clases ? ` · Clases afectadas: ${diaActual.clases}` : ''}
        </p>
        {seccion && hayMixto ? (
          <div
            className="texto-muted"
            data-testid="asistencia-seccion-mixto"
            style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}
          >
            Las clases de este día tienen marcas distintas. Al guardar, se unificará toda la sección con la
            lista que marques.
          </div>
        ) : null}

        <div className="asistencia-toolbar">
          <div className="segmento" role="radiogroup" aria-label="Vista">
            {(
              [
                { value: 'semana', label: 'Semana' },
                { value: 'dia', label: 'Día' },
              ] as const
            ).map((v) => (
              <label key={v.value} className={`segmento__item${vista === v.value ? ' segmento__item--on' : ''}`}>
                <input
                  type="radio"
                  name="asistencia-vista"
                  data-testid={`asistencia-vista-${v.value}`}
                  checked={vista === v.value}
                  onChange={() => setVista(v.value)}
                />
                {v.label}
              </label>
            ))}
          </div>
          {mode !== 'pasar' ? (
            <Field label={vista === 'dia' ? 'Fecha' : 'Fecha (semana)'}>
              <input
                type="date"
                className="field__input"
                data-testid="asistencia-fecha-ref"
                value={fechaRef}
                max={todayISO()}
                disabled={totalCambios > 0}
                title={totalCambios > 0 ? 'Guarda o descarta los cambios antes de cambiar de semana' : undefined}
                onChange={(e) => setFechaRef(e.target.value)}
              />
            </Field>
          ) : null}
          <SearchInput
            data-testid="asistencia-alumno-filter"
            value={alumnoFilter}
            onChange={(e) => setAlumnoFilter(e.target.value)}
            style={{ minWidth: 200 }}
          />
          {inline ? inlineActions : null}
        </div>

        <div
          className="texto-muted"
          style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}
          data-testid="asistencia-leyenda"
        >
          Leyenda: <strong>A</strong> Asistió · <strong>T</strong> Tarde · <strong>E</strong> Excusa ·{' '}
          <strong>F</strong> Falta
          {!readOnly ? ' · Clic en celda para ciclar; los cambios se guardan con «Guardar»' : null}
          {' · '}
          <Lock size={12} aria-hidden /> excusa registrada (no se puede cambiar)
        </div>

        {loading ? (
          <div className="empty-state">Cargando…</div>
        ) : !semana ? (
          <div className="empty-state">No se pudo cargar la semana</div>
        ) : alumnosFiltrados.length === 0 ? (
          <div className="empty-state">Sin alumnos matriculados</div>
        ) : dias.length === 0 ? (
          <div className="empty-state" data-testid="asistencia-dia-sin-clase">
            No hay clase el {effectiveFecha}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" data-testid="asistencia-semana-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  {dias.map((d) => (
                    <th key={d.fecha} style={{ textAlign: 'center', minWidth: 52 }}>
                      {d.etiqueta}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alumnosFiltrados.map((al) => (
                  <tr key={al.alumno_id}>
                    <td>{al.codigo}</td>
                    <td>{al.nombre}</td>
                    {al.marcas.filter((m) => fechasVisibles.has(m.fecha)).map((m) => {
                      const key = celdaKey(al.alumno_id, m.fecha)
                      const cambio = cambios[key]
                      const letra = cambio?.letra ?? (seccion && !m.mixto ? m.letra || 'A' : m.letra || '')
                      const rel = diaRelativo(m.fecha, todayISO())
                      const futuro = rel === 'futuro'
                      const diaInfo = seccionSemana?.dias.find((d) => d.fecha === m.fecha)
                      const sinClase = Boolean(seccion && diaInfo && !diaInfo.tiene_clases)
                      const canEdit =
                        !readOnly &&
                        !futuro &&
                        !m.bloqueada &&
                        !sinClase &&
                        (!seccion || m.fecha === effectiveFecha)
                      const testId = `asistencia-celda-${al.codigo}-${m.fecha}`
                      return (
                        <td key={m.fecha} style={{ textAlign: 'center', padding: '0.15rem' }}>
                          {canEdit ? (
                            <button
                              type="button"
                              className={`asistencia-celda${cambio ? ' asistencia-celda--cambio' : ''}`}
                              data-testid={testId}
                              data-letra={letra}
                              data-dia={rel}
                              data-cambio={cambio ? 'true' : undefined}
                              disabled={saving}
                              onClick={() => cycleCelda(al.alumno_id, m)}
                            >
                              {letra}
                            </button>
                          ) : m.bloqueada ? (
                            <button
                              type="button"
                              className="asistencia-celda asistencia-celda--ro asistencia-celda--bloqueada"
                              data-testid={testId}
                              data-letra={letra}
                              data-dia={rel}
                              data-bloqueada="true"
                              title={`Excusa registrada${m.excusa_tipo ? `: ${m.excusa_tipo}` : ''}`}
                              onClick={() => cycleCelda(al.alumno_id, m)}
                            >
                              <Lock size={11} aria-hidden />
                              {letra}
                            </button>
                          ) : (
                            <span
                              className={`asistencia-celda asistencia-celda--ro${futuro ? ' asistencia-celda--futuro' : ''}`}
                              data-testid={testId}
                              data-letra={letra}
                              data-dia={rel}
                              title={futuro ? 'Día futuro: no editable' : undefined}
                            >
                              {letra || '·'}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
  )

  return (
    <>
      {inline ? (
        <section data-testid="asistencia-inline">
          <div className="page-title-row">
            <h1 className="page-title">{title}</h1>
          </div>
          {body}
        </section>
      ) : (
        <Modal open={open} title={title} onClose={cerrar} xl footer={footer}>
          {body}
        </Modal>
      )}
      <ConfirmDialog
        open={confirmGuardar}
        title="Guardar asistencia"
        message={
          seccion
            ? `¿Guardar la lista completa de ${seccion.grado_nombre} ${seccion.seccion_nombre} del ${effectiveFecha}? Se afectarán ${diaActual?.clases ?? seccion.clases_hoy} clases y se avisará a los padres de faltas y tardanzas.`
            : `¿Guardar ${totalCambios === 1 ? 'el cambio' : `los ${totalCambios} cambios`}? Se avisará a los padres de las llegadas tarde y las faltas.`
        }
        confirmLabel="Guardar"
        onConfirm={() => void guardar()}
        onCancel={() => setConfirmGuardar(false)}
      />
      <ConfirmDialog
        open={confirmSalir}
        title="Cambios sin guardar"
        message={
          inline
            ? '¿Descartar los cambios sin guardar?'
            : 'Hay cambios sin guardar. ¿Salir y descartarlos?'
        }
        confirmLabel={inline ? 'Descartar' : 'Salir sin guardar'}
        danger
        onConfirm={() => {
          setConfirmSalir(false)
          setCambios({})
          if (!inline) dismiss()
        }}
        onCancel={() => setConfirmSalir(false)}
      />
    </>
  )
}
