import { AsistenciaGridModal } from './AsistenciaGridModal'
import type { AsistenciaGridMode } from './AsistenciaGridModal'
import type { AsistenciaMateria, AsistenciaSeccion } from '#/services/asistencia'

export function AsistenciaSeccionModal({
  seccion,
  mode,
  onClose,
  inline = false,
}: {
  seccion: AsistenciaSeccion
  mode: AsistenciaGridMode
  onClose: () => void
  inline?: boolean
}) {
  const materia: AsistenciaMateria = {
    asignacion_docente_id: '',
    curso_id: '',
    curso_nombre: 'Asistencia general',
    grado_nombre: seccion.grado_nombre,
    modalidad_nombre: seccion.modalidad_nombre,
    seccion_id: seccion.seccion_id,
    seccion_nombre: seccion.seccion_nombre,
    periodo_academico_id: seccion.periodo_academico_id,
    periodo_nombre: seccion.periodo_nombre,
    modo_asistencia: 'SECCION',
    es_responsable: seccion.puede_editar,
  }
  return (
    <AsistenciaGridModal
      materia={materia}
      seccion={seccion}
      mode={mode}
      onClose={onClose}
      inline={inline}
    />
  )
}
