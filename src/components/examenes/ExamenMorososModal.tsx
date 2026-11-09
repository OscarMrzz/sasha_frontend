import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Modal } from '#/components/ui/Modal'
import { SearchInput } from '#/components/ui/SearchInput'
import { userMessageFromError } from '#/lib/api'
import { formatearMes, labelGradoSeccion } from '#/lib/examenes'
import { getExamenesMorosos } from '#/services/examenes'
import type { ExamenAlumnoPagoPendiente } from '#/services/examenes'

/**
 * Lista informativa global de alumnos con mora. No filtra por grado ni sección:
 * cualquier maestro puede consultarla, aunque no sea supervisor del examen.
 */
export function ExamenMorososModal({
  open,
  onClose,
  final = false,
}: {
  open: boolean
  onClose: () => void
  final?: boolean
}) {
  const [filtro, setFiltro] = useState('')

  const consulta = useQuery({
    queryKey: ['examenes', 'morosos', final],
    queryFn: () => getExamenesMorosos(undefined, final),
    enabled: open,
  })

  const morosos = useMemo(() => {
    const lista = consulta.data ?? []
    const q = filtro.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((alumno) =>
      [
        alumno.codigo,
        alumno.nombre,
        alumno.grado,
        alumno.seccion,
        ...otrosPendientes(alumno),
      ].some((valor) => valor.toLowerCase().includes(q)),
    )
  }, [consulta.data, filtro])

  return (
    <Modal
      open={open}
      title="Alumnos con mora"
      onClose={onClose}
      xl
      testId="examen-morosos-modal"
      footer={
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <p className="texto-muted" style={{ marginTop: 0 }}>
        Todos los grados y secciones. Lista informativa.
      </p>
      {final ? (
        <p className="texto-muted" style={{ marginTop: 0 }}>
          Examen final: incluye meses y pagos bloqueantes aún no vencidos.
        </p>
      ) : null}

      <div className="asistencia-toolbar">
        <SearchInput
          data-testid="examen-morosos-filtro"
          value={filtro}
          onChange={(event) => setFiltro(event.target.value)}
          style={{ minWidth: 240 }}
        />
      </div>

      {consulta.isLoading ? (
        <div className="empty-state">Cargando alumnos…</div>
      ) : consulta.isError ? (
        <div className="empty-state" role="alert">
          {userMessageFromError(consulta.error)}
        </div>
      ) : morosos.length === 0 ? (
        <div className="empty-state">No hay alumnos con mora.</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table" data-testid="examen-morosos-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Alumno</th>
                <th>Grado / sección</th>
                <th>Meses</th>
                <th>Otros pendientes</th>
                <th>Obligaciones</th>
              </tr>
            </thead>
            <tbody>
              {morosos.map((alumno) => (
                <tr key={alumno.alumno_id}>
                  <td>{alumno.codigo}</td>
                  <td>{alumno.nombre}</td>
                  <td>{labelGradoSeccion(alumno.grado, alumno.seccion)}</td>
                  <td>
                    {alumno.meses.length > 0
                      ? alumno.meses.map(formatearMes).join(' · ')
                      : '—'}
                  </td>
                  <td>
                    {otrosPendientes(alumno).length > 0
                      ? otrosPendientes(alumno).join(' · ')
                      : '—'}
                  </td>
                  <td>{alumno.obligaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {consulta.data ? (
        <p
          className="texto-muted"
          style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}
        >
          {consulta.data.length} alumno{consulta.data.length === 1 ? '' : 's'}{' '}
          con {final ? 'pagos pendientes' : 'mora'}.
        </p>
      ) : null}
    </Modal>
  )
}

/** Nombres únicos de los conceptos pendientes que no son mensualidad. */
function otrosPendientes(alumno: ExamenAlumnoPagoPendiente): string[] {
  const vistos = new Set<string>()
  const out: string[] = []
  for (const concepto of alumno.conceptos ?? []) {
    if (concepto.es_mensualidad || !concepto.tipo_nombre) continue
    if (vistos.has(concepto.tipo_nombre)) continue
    vistos.add(concepto.tipo_nombre)
    out.push(concepto.tipo_nombre)
  }
  return out
}
