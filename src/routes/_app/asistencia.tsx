import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { SearchInput } from '#/components/ui/SearchInput'
import { userMessageFromError } from '#/lib/api'
import {
  downloadAsistenciaPdf,
  getInasistenciaDetalle,
  getSemanaAsistencia,
  listInasistencias,
  listMateriasAsistencia,
  LETRA_TO_CODIGO,
  nextLetra,
  putCeldaAsistencia,
  type AsistenciaMateria,
  type InasistenciaDetalleResponse,
  type InasistenciaResumen,
  type SemanaAlumno,
  type SemanaResponse,
} from '#/services/asistencia'

export const Route = createFileRoute('/_app/asistencia')({ component: AsistenciaPage })

const col = createColumnHelper<AsistenciaMateria>()

type ModalMode = 'pasar' | 'editar' | 'ver'

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

function AsistenciaPage() {
  const { can } = useCan()
  const canPost = can('asistencia:post')

  const { data = [], isLoading } = useQuery({
    queryKey: ['asistencia-materias'],
    queryFn: listMateriasAsistencia,
  })

  const [ctx, setCtx] = useState<{ x: number; y: number; row: AsistenciaMateria } | null>(null)
  const [gridMateria, setGridMateria] = useState<AsistenciaMateria | null>(null)
  const [gridMode, setGridMode] = useState<ModalMode>('pasar')
  const [inaMateria, setInaMateria] = useState<AsistenciaMateria | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const openPasar = (row: AsistenciaMateria) => {
    if (!canPost) return
    setGridMode('pasar')
    setGridMateria(row)
  }

  const openEditar = (row: AsistenciaMateria) => {
    if (!canPost) return
    setGridMode('editar')
    setGridMateria(row)
  }

  const openVer = (row: AsistenciaMateria) => {
    setGridMode('ver')
    setGridMateria(row)
  }

  const columns = useMemo(
    () => [
      col.accessor('curso_nombre', { header: 'Curso', cell: (i) => i.getValue() || '—' }),
      col.accessor('grado_nombre', { header: 'Grado', cell: (i) => i.getValue() || '—' }),
      col.accessor('modalidad_nombre', { header: 'Modalidad', cell: (i) => i.getValue() || '—' }),
      col.accessor('seccion_nombre', { header: 'Sección', cell: (i) => i.getValue() || '—' }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'grado',
        label: 'Grado',
        getValue: (r: AsistenciaMateria) => r.grado_nombre,
      },
      {
        id: 'modalidad',
        label: 'Modalidad',
        getValue: (r: AsistenciaMateria) => r.modalidad_nombre,
      },
      {
        id: 'curso',
        label: 'Curso',
        getValue: (r: AsistenciaMateria) => r.curso_id || r.curso_nombre,
        getLabel: (r: AsistenciaMateria) => r.curso_nombre,
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando materias…</div>

  return (
    <RequirePermission permission="asistencia:get">
      <DataTable
        title="Asistencia"
        data={data}
        columns={columns}
        filters={tableFilters}
        searchPlaceholder="Buscar…"
        canAdd={false}
        exportFilename="asistencia-materias"
        exportRows={data.map((m) => ({
          curso: m.curso_nombre,
          grado: m.grado_nombre,
          modalidad: m.modalidad_nombre,
          seccion: m.seccion_nombre,
        }))}
        onRowDoubleClick={(row) => openPasar(row)}
        onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
      />

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="asistencia-ctx-menu">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="asistencia-ctx-ver"
            onClick={() => {
              openVer(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
          {canPost ? (
            <>
              <button
                type="button"
                className="ctx-menu__item"
                data-testid="asistencia-ctx-pasar"
                onClick={() => {
                  openPasar(ctx.row)
                  closeCtx()
                }}
              >
                Asistencia
              </button>
              <button
                type="button"
                className="ctx-menu__item"
                data-testid="asistencia-ctx-editar"
                onClick={() => {
                  openEditar(ctx.row)
                  closeCtx()
                }}
              >
                Editar
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="asistencia-ctx-inasistencias"
            onClick={() => {
              setInaMateria(ctx.row)
              closeCtx()
            }}
          >
            Inasistencias
          </button>
        </div>
      ) : null}

      {gridMateria ? (
        <AsistenciaGridModal
          materia={gridMateria}
          mode={gridMode}
          onClose={() => setGridMateria(null)}
        />
      ) : null}

      {inaMateria ? (
        <InasistenciasModal materia={inaMateria} onClose={() => setInaMateria(null)} />
      ) : null}
    </RequirePermission>
  )
}

function AsistenciaGridModal({
  materia,
  mode,
  onClose,
}: {
  materia: AsistenciaMateria
  mode: ModalMode
  onClose: () => void
}) {
  const readOnly = mode === 'ver'
  const [fechaRef, setFechaRef] = useState(todayISO())
  const [semana, setSemana] = useState<SemanaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [alumnoFilter, setAlumnoFilter] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  const effectiveFecha = mode === 'pasar' ? todayISO() : fechaRef

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s = await getSemanaAsistencia(materia.asignacion_docente_id, effectiveFecha)
      setSemana(s)
    } catch (e) {
      toast.error(userMessageFromError(e))
      setSemana(null)
    } finally {
      setLoading(false)
    }
  }, [materia.asignacion_docente_id, effectiveFecha])

  useEffect(() => {
    void load()
  }, [load])

  const title =
    mode === 'pasar'
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

  const cycleCelda = async (alumno: SemanaAlumno, fecha: string, letraActual: string) => {
    if (readOnly || pending) return
    if (diaRelativo(fecha, todayISO()) === 'futuro') {
      toast.message('No se puede marcar asistencia en días futuros')
      return
    }
    const nueva = nextLetra(letraActual)
    const codigo = LETRA_TO_CODIGO[nueva]
    const key = `${alumno.alumno_id}:${fecha}`
    setPending(key)
    // Optimistic update
    setSemana((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        alumnos: prev.alumnos.map((a) => {
          if (a.alumno_id !== alumno.alumno_id) return a
          return {
            ...a,
            marcas: a.marcas.map((m) =>
              m.fecha === fecha
                ? { ...m, letra: nueva, tipo_codigo: codigo }
                : m,
            ),
          }
        }),
      }
    })
    try {
      await putCeldaAsistencia({
        alumno_id: alumno.alumno_id,
        asignacion_docente_id: materia.asignacion_docente_id,
        fecha,
        tipo_codigo: codigo,
      })
    } catch (e) {
      toast.error(userMessageFromError(e))
      await load()
    } finally {
      setPending(null)
    }
  }

  const onDownloadPdf = async () => {
    try {
      await downloadAsistenciaPdf(materia.asignacion_docente_id, effectiveFecha)
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      xl
      footer={
        <>
          {mode === 'ver' ? (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="asistencia-download-pdf"
              onClick={() => void onDownloadPdf()}
            >
              Descargar PDF
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cerrar
          </button>
        </>
      }
    >
      <div data-testid="asistencia-grid-modal">
        <p className="texto-muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
          {semana
            ? `Semana ${semana.semana_inicio} — ${semana.semana_fin}`
            : 'Cargando semana…'}
          {' · '}
          {materia.seccion_nombre}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem 1.25rem',
            alignItems: 'end',
            marginBottom: '0.75rem',
          }}
        >
          {mode !== 'pasar' ? (
            <Field label="Fecha (semana)">
              <input
                type="date"
                className="field__input"
                data-testid="asistencia-fecha-ref"
                value={fechaRef}
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
        </div>

        <div
          className="texto-muted"
          style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}
          data-testid="asistencia-leyenda"
        >
          Leyenda: <strong>A</strong> Asistió · <strong>T</strong> Tarde · <strong>E</strong> Excusa ·{' '}
          <strong>F</strong> Falta
          {!readOnly ? ' · Clic en celda para ciclar' : null}
        </div>

        {loading ? (
          <div className="empty-state">Cargando…</div>
        ) : !semana ? (
          <div className="empty-state">No se pudo cargar la semana</div>
        ) : alumnosFiltrados.length === 0 ? (
          <div className="empty-state">Sin alumnos matriculados</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" data-testid="asistencia-semana-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  {semana.dias.map((d) => (
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
                    {al.marcas.map((m) => {
                      const key = `${al.alumno_id}:${m.fecha}`
                      const busy = pending === key
                      const rel = diaRelativo(m.fecha, todayISO())
                      const locked = rel === 'futuro'
                      const canEdit = !readOnly && !locked
                      return (
                        <td key={m.fecha} style={{ textAlign: 'center', padding: '0.15rem' }}>
                          {canEdit ? (
                            <button
                              type="button"
                              className="asistencia-celda"
                              data-testid={`asistencia-celda-${al.codigo}-${m.fecha}`}
                              data-letra={m.letra || ''}
                              data-dia={rel}
                              disabled={busy}
                              onClick={() => void cycleCelda(al, m.fecha, m.letra || '')}
                            >
                              {m.letra || ''}
                            </button>
                          ) : (
                            <span
                              className={`asistencia-celda asistencia-celda--ro${locked ? ' asistencia-celda--futuro' : ''}`}
                              data-testid={`asistencia-celda-${al.codigo}-${m.fecha}`}
                              data-letra={m.letra || ''}
                              data-dia={rel}
                              title={locked ? 'Día futuro: no editable' : undefined}
                            >
                              {m.letra || '·'}
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
    </Modal>
  )
}

function InasistenciasModal({
  materia,
  onClose,
}: {
  materia: AsistenciaMateria
  onClose: () => void
}) {
  const [list, setList] = useState<InasistenciaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState<InasistenciaDetalleResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const rows = await listInasistencias(materia.asignacion_docente_id)
        if (!cancelled) setList(rows)
      } catch (e) {
        toast.error(userMessageFromError(e))
        if (!cancelled) setList([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [materia.asignacion_docente_id])

  const openDetalle = async (row: InasistenciaResumen) => {
    try {
      const d = await getInasistenciaDetalle(materia.asignacion_docente_id, row.alumno_id)
      setDetalle(d)
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  return (
    <>
      <Modal
        open
        title={`Inasistencias — ${materia.curso_nombre}`}
        onClose={onClose}
        wide
        footer={
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cerrar
          </button>
        }
      >
        <div data-testid="asistencia-inasistencias-modal">
          {loading ? (
            <div className="empty-state">Cargando…</div>
          ) : list.length === 0 ? (
            <div className="empty-state">Sin inasistencias registradas</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th style={{ textAlign: 'center' }}>Faltas</th>
                  <th style={{ textAlign: 'center' }}>Excusas</th>
                  <th style={{ textAlign: 'center' }}>Tardes</th>
                  <th style={{ textAlign: 'center' }}>Total F+E</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr
                    key={r.alumno_id}
                    style={{ cursor: 'pointer' }}
                    data-testid={`asistencia-ina-row-${r.codigo}`}
                    onClick={() => void openDetalle(r)}
                  >
                    <td>{r.codigo}</td>
                    <td>{r.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{r.faltas}</td>
                    <td style={{ textAlign: 'center' }}>{r.excusas}</td>
                    <td style={{ textAlign: 'center' }}>{r.tardes}</td>
                    <td style={{ textAlign: 'center' }}>
                      <strong>{r.total_inasistencias}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="texto-muted" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
            Clic en un alumno para ver el detalle de fechas.
          </p>
        </div>
      </Modal>

      {detalle ? (
        <Modal
          open
          title={`Detalle — ${detalle.nombre}`}
          onClose={() => setDetalle(null)}
          footer={
            <button type="button" className="btn btn--ghost" onClick={() => setDetalle(null)}>
              Cerrar
            </button>
          }
        >
          <div data-testid="asistencia-detalle-modal">
            <p className="texto-muted" style={{ marginTop: 0 }}>
              {detalle.codigo} · {detalle.nombre}
            </p>
            {(detalle.items ?? []).length === 0 ? (
              <div className="empty-state">Sin registros</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Día</th>
                    <th>Tipo</th>
                    <th>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.items.map((it, i) => (
                    <tr key={`${it.fecha}-${i}`}>
                      <td>{it.fecha}</td>
                      <td>{it.dia_semana}</td>
                      <td>
                        {it.letra} — {it.nombre_tipo}
                      </td>
                      <td>{it.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      ) : null}
    </>
  )
}
