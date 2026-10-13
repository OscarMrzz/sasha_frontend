import { Modal, useDismiss } from '#/components/ui/Modal'
import type { MonitorAlumnoMarca, MonitorClase } from '#/services/monitores'

export type MonitorAsistenciaTipo = 'resumen' | 'faltantes' | 'tarde'

const TITULO: Record<MonitorAsistenciaTipo, string> = {
  resumen: 'Asistencia de hoy',
  faltantes: 'Alumnos faltantes',
  tarde: 'Alumnos que llegaron tarde',
}

const LISTA_STYLE = {
  listStyle: 'none',
  margin: '0 0 0.5rem',
  padding: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.45rem',
}

function Lista({
  items,
  tipo,
  vacio,
}: {
  items: MonitorAlumnoMarca[]
  tipo: 'falta' | 'tarde'
  vacio: string
}) {
  if (!items.length) return <div className="empty-state">{vacio}</div>
  return (
    <ul style={LISTA_STYLE}>
      {items.map((a) => (
        <li
          key={a.alumno_id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--sasha-bg-muted)',
            borderRadius: '8px',
          }}
        >
          <span style={{ fontWeight: 600 }}>{a.nombre}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="texto-muted" style={{ fontSize: '0.8rem' }}>
              {a.codigo}
            </span>
            <span className="badge">{tipo === 'tarde' ? 'Tarde' : 'Falta'}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function MonitorAsistenciaModal({
  clase,
  tipo,
  onClose,
}: {
  clase: MonitorClase
  tipo: MonitorAsistenciaTipo
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const a = clase.asistencia

  return (
    <Modal
      open={open}
      title={`${TITULO[tipo]} · ${clase.curso_nombre}`}
      wide
      onClose={dismiss}
      footer={
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          Cerrar
        </button>
      }
    >
      <p className="texto-muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
        {clase.grado_nombre} · sec{clase.seccion_nombre} · {clase.maestro_nombre}
      </p>

      {tipo === 'resumen' ? (
        <>
          <p style={{ marginTop: 0 }} data-testid="monitor-asistencia-resumen">
            {a.pasada ? 'Asistencia registrada' : 'Aún no se pasa lista'} · {a.marcas}/{a.alumnos}{' '}
            alumnos
          </p>
          <h3 style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>Faltantes ({a.faltantes})</h3>
          <Lista items={a.faltantes_lista} tipo="falta" vacio="Sin faltantes." />
          <h3 style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>Tarde ({a.tarde})</h3>
          <Lista items={a.tarde_lista} tipo="tarde" vacio="Sin llegadas tarde." />
        </>
      ) : tipo === 'faltantes' ? (
        <Lista items={a.faltantes_lista} tipo="falta" vacio="Sin faltantes." />
      ) : (
        <Lista items={a.tarde_lista} tipo="tarde" vacio="Sin llegadas tarde." />
      )}
    </Modal>
  )
}
