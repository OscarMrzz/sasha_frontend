import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Can, useCan } from '#/components/gates/Can'
import { Modal } from '#/components/ui/Modal'
import { downloadTablePdf } from '#/helpers/export-pdf'
import { labelPeriodo } from '#/helpers/periodos'
import { listAsignaciones } from '#/services/asignacion'
import { listGrados, listPeriodos, listSecciones, type Curso } from '#/services/catalogos'
import { listMaestros } from '#/services/personas'

type Props = {
  open: boolean
  curso: Curso | null
  onClose: () => void
  onAsignar?: () => void
}

export function CursoVerModal({ open, curso, onClose, onAsignar }: Props) {
  const { can } = useCan()
  const canAsignaciones = can('asignacion:get')

  const { data: asignaciones = [], isLoading } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: listAsignaciones,
    enabled: open && canAsignaciones,
  })
  const { data: maestros = [] } = useQuery({
    queryKey: ['maestros'],
    queryFn: listMaestros,
    enabled: open && canAsignaciones,
  })
  const { data: secciones = [] } = useQuery({
    queryKey: ['secciones'],
    queryFn: listSecciones,
    enabled: open && canAsignaciones,
  })
  const { data: grados = [] } = useQuery({
    queryKey: ['grados'],
    queryFn: listGrados,
    enabled: open && canAsignaciones,
  })
  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos'],
    queryFn: listPeriodos,
    enabled: open && canAsignaciones,
  })

  const maestroMap = useMemo(() => Object.fromEntries(maestros.map((m) => [m.id, m.nombre])), [maestros])
  const seccionMap = useMemo(() => Object.fromEntries(secciones.map((s) => [s.id, s])), [secciones])
  const gradoMap = useMemo(() => Object.fromEntries(grados.map((g) => [g.id, g.nombre])), [grados])
  const periodoMap = useMemo(
    () => Object.fromEntries(periodos.map((p) => [p.id, labelPeriodo(p)])),
    [periodos],
  )

  const rows = useMemo(() => {
    if (!curso) return []
    return asignaciones
      .filter((a) => a.curso_id === curso.id)
      .map((a) => {
        const sec = seccionMap[a.seccion_id]
        return {
          maestro: maestroMap[a.maestro_id] ?? a.maestro_id,
          grado: sec ? (gradoMap[sec.grado_id] ?? '—') : '—',
          seccion: sec?.nombre ?? a.seccion_id,
          periodo: periodoMap[a.periodo_academico_id] ?? a.periodo_academico_id,
          status: a.status,
        }
      })
      .sort((a, b) => a.maestro.localeCompare(b.maestro) || a.grado.localeCompare(b.grado))
  }, [asignaciones, curso, maestroMap, seccionMap, gradoMap, periodoMap])

  if (!curso) return null

  return (
    <Modal
      open={open}
      title={curso.nombre}
      wide
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              downloadTablePdf(`curso-${curso.codigo || curso.nombre}-maestros`, curso.nombre, rows)
            }
            disabled={rows.length === 0}
          >
            Descargar PDF
          </button>
          <Can permission="asignacion:post">
            {onAsignar ? (
              <button type="button" className="btn btn--primary" onClick={onAsignar}>
                Asignar maestro
              </button>
            ) : null}
          </Can>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cerrar
          </button>
        </>
      }
    >
      <p className="texto-muted" style={{ marginTop: 0 }}>
        {curso.codigo ? `${curso.codigo} · ` : ''}
        {curso.horas_semana_minimas} h/semana · {curso.status}
      </p>

      <h3 className="ficha__section-title" style={{ marginBottom: '0.5rem' }}>
        Maestros asignados
      </h3>

      {!canAsignaciones ? (
        <p className="texto-muted">No tienes permiso para ver asignaciones.</p>
      ) : isLoading ? (
        <p className="texto-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="texto-muted">Ningún maestro asignado a este curso.</p>
      ) : (
        <table className="ficha-table" data-testid="curso-ver-maestros">
          <thead>
            <tr>
              <th>Maestro</th>
              <th>Grado</th>
              <th>Sección</th>
              <th>Periodo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.maestro}-${r.seccion}-${r.periodo}-${i}`}>
                <td>{r.maestro}</td>
                <td>{r.grado}</td>
                <td>{r.seccion}</td>
                <td>{r.periodo}</td>
                <td>
                  <span className="badge">{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}
