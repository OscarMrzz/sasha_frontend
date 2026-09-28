import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AsistenciaGridModal, type AsistenciaGridMode } from '#/components/asistencia/AsistenciaGridModal'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  getInasistenciaDetalle,
  listInasistencias,
  listMateriasAsistencia,
  type AsistenciaMateria,
  type InasistenciaDetalleResponse,
  type InasistenciaResumen,
} from '#/services/asistencia'

export const Route = createFileRoute('/_app/asistencia')({ component: AsistenciaPage })

const col = createColumnHelper<AsistenciaMateria>()

function AsistenciaPage() {
  const { can } = useCan()
  const canPost = can('asistencia:post')

  const { data = [], isLoading } = useQuery({
    queryKey: ['asistencia-materias'],
    queryFn: listMateriasAsistencia,
  })

  const [ctx, setCtx] = useState<{ x: number; y: number; row: AsistenciaMateria } | null>(null)
  const [gridMateria, setGridMateria] = useState<AsistenciaMateria | null>(null)
  const [gridMode, setGridMode] = useState<AsistenciaGridMode>('pasar')
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
      col.accessor('curso_nombre', { header: 'Curso', cell: (i) => i.getValue() || 'â€”' }),
      col.accessor('grado_nombre', { header: 'Grado', cell: (i) => i.getValue() || 'â€”' }),
      col.accessor('modalidad_nombre', { header: 'Modalidad', cell: (i) => i.getValue() || 'â€”' }),
      col.accessor('seccion_nombre', { header: 'SecciÃ³n', cell: (i) => i.getValue() || 'â€”' }),
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

  if (isLoading) return <div className="empty-state">Cargando materiasâ€¦</div>

  return (
    <RequirePermission permission="asistencia:get">
      <DataTable
        title="Asistencia"
        data={data}
        columns={columns}
        filters={tableFilters}
        searchPlaceholder="Buscarâ€¦"
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
        open={open}
        title={`Inasistencias â€” ${materia.curso_nombre}`}
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
            <div className="empty-state">Cargandoâ€¦</div>
          ) : list.length === 0 ? (
            <div className="empty-state">Sin inasistencias registradas</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>CÃ³digo</th>
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
        title={detalle ? `Detalle â€” ${detalle.nombre}` : 'Detalle'}
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
              {detalle.codigo} Â· {detalle.nombre}
            </p>
            {(detalle.items ?? []).length === 0 ? (
              <div className="empty-state">Sin registros</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>DÃ­a</th>
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
                        {it.letra} â€” {it.nombre_tipo}
                      </td>
                      <td>{it.observaciones || 'â€”'}</td>
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
