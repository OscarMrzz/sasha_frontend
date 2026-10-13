import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Can } from '#/components/gates/Can'
import { Modal } from '#/components/ui/Modal'
import { labelPeriodo } from '#/helpers/periodos'
import type { Asignacion } from '#/services/asignacion'
import { listCursos, listGrados, listModalidades, listPeriodos, listSecciones } from '#/services/catalogos'
import { listMaestros } from '#/services/personas'

type Props = {
  open: boolean
  asignacion: Asignacion | null
  onClose: () => void
  onEditar?: () => void
}

export function AsignacionVerModal({ open, asignacion, onClose, onEditar }: Props) {
  const { data: maestros = [] } = useQuery({
    queryKey: ['maestros'],
    queryFn: listMaestros,
    enabled: open,
  })
  const { data: cursos = [] } = useQuery({
    queryKey: ['cursos'],
    queryFn: listCursos,
    enabled: open,
  })
  const { data: grados = [] } = useQuery({
    queryKey: ['grados'],
    queryFn: listGrados,
    enabled: open,
  })
  const { data: modalidades = [] } = useQuery({
    queryKey: ['modalidades'],
    queryFn: listModalidades,
    enabled: open,
  })
  const { data: secciones = [] } = useQuery({
    queryKey: ['secciones'],
    queryFn: listSecciones,
    enabled: open,
  })
  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos'],
    queryFn: listPeriodos,
    enabled: open,
  })

  const maestroMap = useMemo(() => new Map(maestros.map((m) => [m.id, m.nombre])), [maestros])
  const cursoMap = useMemo(() => new Map(cursos.map((c) => [c.id, c.nombre])), [cursos])
  const gradoMap = useMemo(() => new Map(grados.map((g) => [g.id, g.nombre])), [grados])
  const modalidadMap = useMemo(() => new Map(modalidades.map((m) => [m.id, m.nombre])), [modalidades])
  const seccionMap = useMemo(() => new Map(secciones.map((s) => [s.id, s])), [secciones])
  const periodoMap = useMemo(
    () => new Map(periodos.map((p) => [p.id, labelPeriodo(p)])),
    [periodos],
  )

  if (!asignacion) return null

  const seccion = seccionMap.get(asignacion.seccion_id)
  const gradoNombre = seccion ? gradoMap.get(seccion.grado_id) : undefined
  const modalidadNombre = seccion ? modalidadMap.get(seccion.modalidad_id) : undefined
  const filas: { label: string; value: string | ReactNode }[] = [
    { label: 'Maestro', value: maestroMap.get(asignacion.maestro_id) ?? '—' },
    { label: 'Curso', value: cursoMap.get(asignacion.curso_id) ?? asignacion.curso_nombre ?? '—' },
    { label: 'Grado', value: gradoNombre ?? asignacion.grado_nombre ?? '—' },
    { label: 'Modalidad', value: modalidadNombre ?? asignacion.modalidad_nombre ?? '—' },
    { label: 'Sección', value: seccion?.nombre ?? asignacion.seccion_nombre ?? '—' },
    { label: 'Periodo', value: periodoMap.get(asignacion.periodo_academico_id) ?? '—' },
    { label: 'Estado', value: <span className="badge">{asignacion.status}</span> },
  ]

  return (
    <Modal
      open={open}
      title="Detalle de la asignación"
      wide
      onClose={onClose}
      testId="asignacion-ver-modal"
      footer={
        <>
          <Can permission="asignacion:put">
            {onEditar ? (
              <button type="button" className="btn btn--primary" onClick={onEditar}>
                Editar
              </button>
            ) : null}
          </Can>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cerrar
          </button>
        </>
      }
    >
      <table className="ficha-table" data-testid="asignacion-ver-detalle">
        <tbody>
          {filas.map((f) => (
            <tr key={f.label}>
              <th style={{ width: '30%' }}>{f.label}</th>
              <td>{f.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  )
}
