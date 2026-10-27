import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AsistenciaGridModal } from '#/components/asistencia/AsistenciaGridModal'
import type { AsistenciaGridMode } from '#/components/asistencia/AsistenciaGridModal'
import { AsistenciaSeccionModal } from '#/components/asistencia/AsistenciaSeccionModal'
import { PuntosAsistenciaModal } from '#/components/asistencia/PuntosAsistenciaModal'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { isMaestroRole } from '#/lib/home-path'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import {
  getInasistenciaDetalle,
  listInasistencias,
  listMateriasAsistencia,
} from '#/services/asistencia'
import type {
  AsistenciaMateria,
  AsistenciaSeccion,
  InasistenciaDetalleResponse,
  InasistenciaResumen,
} from '#/services/asistencia'

export const Route = createFileRoute('/_app/asistencia')({ component: AsistenciaPage })

const col = createColumnHelper<AsistenciaMateria>()

function seccionDesdeMateria(m: AsistenciaMateria, puedeEditar: boolean): AsistenciaSeccion {
  return {
    seccion_id: m.seccion_id ?? '',
    seccion_nombre: m.seccion_nombre,
    grado_nombre: m.grado_nombre,
    modalidad_nombre: m.modalidad_nombre,
    periodo_academico_id: m.periodo_academico_id,
    periodo_nombre: m.periodo_nombre,
    alumnos: 0,
    clases_hoy: 0,
    modo_asistencia: 'SECCION',
    responsable: m.responsable_code
      ? { codigo: m.responsable_code, nombre: m.responsable_nombre ?? '' }
      : undefined,
    puede_editar: puedeEditar,
    marcas_hoy: 0,
    estado_hoy: 'pendiente',
  }
}

function AsistenciaPage() {
  const { can, roles } = useCan()
  const canPost = can('asistencia:post')

  const { data = [], isLoading } = useQuery({
    queryKey: ['asistencia-materias'],
    queryFn: listMateriasAsistencia,
  })

  const [ctx, setCtx] = useState<{ x: number; y: number; row: AsistenciaMateria } | null>(null)
  const [gridMateria, setGridMateria] = useState<AsistenciaMateria | null>(null)
  const [gridMode, setGridMode] = useState<AsistenciaGridMode>('pasar')
  const [gridSeccion, setGridSeccion] = useState<{
    seccion: AsistenciaSeccion
    mode: AsistenciaGridMode
  } | null>(null)
  const [inaMateria, setInaMateria] = useState<AsistenciaMateria | null>(null)
  const [puntosMateria, setPuntosMateria] = useState<AsistenciaMateria | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const esSeccion = (row: AsistenciaMateria) => (row.modo_asistencia ?? 'CLASE') === 'SECCION'

  const openPasar = (row: AsistenciaMateria) => {
    if (!canPost) return
    if (esSeccion(row)) {
      setGridSeccion({ seccion: seccionDesdeMateria(row, true), mode: 'editar' })
      return
    }
    setGridMode('pasar')
    setGridMateria(row)
  }

  const openEditar = (row: AsistenciaMateria) => {
    if (!canPost) return
    if (esSeccion(row)) {
      setGridSeccion({ seccion: seccionDesdeMateria(row, true), mode: 'editar' })
      return
    }
    setGridMode('editar')
    setGridMateria(row)
  }

  const openVer = (row: AsistenciaMateria) => {
    if (esSeccion(row)) {
      setGridSeccion({ seccion: seccionDesdeMateria(row, false), mode: 'ver' })
      return
    }
    setGridMode('ver')
    setGridMateria(row)
  }

  const columns = useMemo(
    () => [
      col.accessor('curso_nombre', { header: 'Clase', cell: (i) => i.getValue() || '—' }),
      col.accessor('grado_nombre', { header: 'Grado', cell: (i) => i.getValue() || '—' }),
      col.accessor('modalidad_nombre', { header: 'Modalidad', cell: (i) => i.getValue() || '—' }),
      col.accessor('seccion_nombre', { header: 'Sección', cell: (i) => i.getValue() || '—' }),
      col.accessor('modo_asistencia', {
        header: 'Lista',
        cell: (i) => {
          const m = i.row.original
          const modo = m.modo_asistencia ?? 'CLASE'
          return (
            <span>
              <span className={`badge ${modo === 'SECCION' ? 'badge--ok' : 'badge--muted'}`}>
                {modo === 'SECCION' ? 'Por sección' : 'Por clase'}
              </span>
              {modo === 'SECCION' ? (
                <span className="texto-muted" style={{ marginLeft: '0.4rem', fontSize: '0.8rem' }}>
                  {m.responsable_code ? `${m.responsable_code} · ` : ''}
                  {m.responsable_nombre || 'Sin responsable'}
                </span>
              ) : null}
            </span>
          )
        },
      }),
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
        label: 'Clase',
        getValue: (r: AsistenciaMateria) => r.curso_id || r.curso_nombre,
        getLabel: (r: AsistenciaMateria) => r.curso_nombre,
      },
      {
        id: 'modo',
        label: 'Lista',
        getValue: (r: AsistenciaMateria) => r.modo_asistencia ?? 'CLASE',
        getLabel: (r: AsistenciaMateria) =>
          (r.modo_asistencia ?? 'CLASE') === 'SECCION' ? 'Por sección' : 'Por clase',
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando materias…</div>

  if (isMaestroRole(roles)) {
    const lastId = readLastAsignacionId()
    const materia =
      data.length === 0
        ? undefined
        : (data.find((m) => m.asignacion_docente_id === lastId) ?? data[0])
    const materiaEsSeccion = (materia?.modo_asistencia ?? 'CLASE') === 'SECCION'
    return (
      <RequirePermission permission="asistencia:get">
        {materia ? (
          <AsistenciaGridModal
            key={materia.asignacion_docente_id}
            materia={materia}
            mode={materiaEsSeccion ? 'ver' : canPost ? 'editar' : 'ver'}
            inline
            onClose={() => {}}
            extraActions={
              <>
                <button
                  type="button"
                  className="btn btn--ghost"
                  data-testid="asistencia-ver-faltas"
                  onClick={() => setInaMateria(materia)}
                >
                  Ver faltas
                </button>
                {materiaEsSeccion && materia.es_responsable ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    data-testid="asistencia-seccion-acceso"
                    onClick={() =>
                      setGridSeccion({ seccion: seccionDesdeMateria(materia, true), mode: 'pasar' })
                    }
                  >
                    Pasar asistencia de la sección
                  </button>
                ) : null}
                {canPost && !materiaEsSeccion ? (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    data-testid="asistencia-puntos"
                    onClick={() => setPuntosMateria(materia)}
                  >
                    Puntos por parcial
                  </button>
                ) : null}
              </>
            }
          />
        ) : (
          <div className="empty-state">No tienes clases asignadas</div>
        )}
        {gridSeccion ? (
          <AsistenciaSeccionModal
            seccion={gridSeccion.seccion}
            mode={gridSeccion.mode}
            onClose={() => setGridSeccion(null)}
          />
        ) : null}
        {inaMateria ? (
          <InasistenciasModal materia={inaMateria} onClose={() => setInaMateria(null)} />
        ) : null}
        {puntosMateria ? (
          <PuntosAsistenciaModal materia={puntosMateria} onClose={() => setPuntosMateria(null)} />
        ) : null}
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="asistencia:get">
      <DataTable
        title="Asistencia"
        data={data}
        columns={columns}
        filters={tableFilters}
        canAdd={false}
        exportFilename="asistencia-materias"
        exportRows={data.map((m) => ({
          clase: m.curso_nombre,
          grado: m.grado_nombre,
          modalidad: m.modalidad_nombre,
          seccion: m.seccion_nombre,
          lista: (m.modo_asistencia ?? 'CLASE') === 'SECCION' ? 'Por sección' : 'Por clase',
          responsable:
            (m.modo_asistencia ?? 'CLASE') === 'SECCION'
              ? `${m.responsable_code ?? ''} ${m.responsable_nombre ?? ''}`.trim()
              : '',
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
            Ver faltas
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

      {gridSeccion ? (
        <AsistenciaSeccionModal
          seccion={gridSeccion.seccion}
          mode={gridSeccion.mode}
          onClose={() => setGridSeccion(null)}
        />
      ) : null}

      {inaMateria ? (
        <InasistenciasModal materia={inaMateria} onClose={() => setInaMateria(null)} />
      ) : null}
    </RequirePermission>
  )
}

function InasistenciasModal({
  materia,
  onClose,
}: {
  materia: AsistenciaMateria
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const [list, setList] = useState<InasistenciaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState<InasistenciaDetalleResponse | null>(null)

  useEffect(() => {
    const state = { cancelled: false }
    ;(async () => {
      setLoading(true)
      try {
        const rows = await listInasistencias(materia.asignacion_docente_id)
        if (!state.cancelled) setList(rows)
      } catch (e) {
        toast.error(userMessageFromError(e))
        if (!state.cancelled) setList([])
      } finally {
        if (!state.cancelled) setLoading(false)
      }
    })()
    return () => {
      state.cancelled = true
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
        open={open}
        title={`Inasistencias — ${materia.curso_nombre}`}
        onClose={dismiss}
        wide
        footer={
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
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

      <Modal
        open={detalle != null}
        title={detalle ? `Detalle — ${detalle.nombre}` : 'Detalle'}
        onClose={() => setDetalle(null)}
        footer={
          <button type="button" className="btn btn--ghost" onClick={() => setDetalle(null)}>
            Cerrar
          </button>
        }
      >
        {detalle ? (
          <div data-testid="asistencia-detalle-modal">
            <p className="texto-muted" style={{ marginTop: 0 }}>
              {detalle.codigo} · {detalle.nombre}
            </p>
            {detalle.items.length === 0 ? (
              <div className="empty-state">Sin registros</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Día</th>
                    <th>Tipo</th>
                    <th>Registró</th>
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
                      <td data-testid="asistencia-detalle-registro">
                        {it.maestro_nombre
                          ? `${it.maestro_nombre}${it.maestro_code ? ` (${it.maestro_code})` : ''}`
                          : '—'}
                      </td>
                      <td>{it.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
        </Modal>
    </>
  )
}
