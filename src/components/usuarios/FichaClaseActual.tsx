import type { FichaSlot } from '#/services/personas'

type Props = {
  hora: string
  slots: FichaSlot[]
  mensaje?: string
}

export function FichaClaseActual({ hora, slots, mensaje }: Props) {
  return (
    <div className="ficha-now" data-testid="ficha-clase-actual">
      <div className="ficha-now__label">Ahora · {hora}</div>
      {slots.length === 0 ? (
        <p className="ficha-now__empty">{mensaje || 'Sin clase en este horario'}</p>
      ) : (
        <ul className="ficha-now__list">
          {slots.map((s) => (
            <li key={`${s.asignacion_docente_id}-${s.hora_inicio}`}>
              <strong>{s.curso_nombre}</strong>
              <span className="texto-muted">
                {' '}
                · {s.grado_nombre} sec {s.seccion_nombre} · {s.hora_inicio}–{s.hora_fin}
                {s.maestro_nombre ? ` · ${s.maestro_nombre}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
