import { etiquetaEstado, formatearFecha } from '#/helpers/actualizaciones'
import type { ActualizacionSistema } from '#/services/actualizaciones'

export function ActualizacionCard({
  actualizacion,
  puedeEditar,
  puedeEliminar,
  onEditar,
  onEliminar,
}: {
  actualizacion: ActualizacionSistema
  puedeEditar: boolean
  puedeEliminar: boolean
  onEditar: (a: ActualizacionSistema) => void
  onEliminar: (a: ActualizacionSistema) => void
}) {
  return (
    <article className="actualizacion-card" data-testid={`actualizacion-card-${actualizacion.id}`}>
      <div className="actualizacion-card__head">
        <span className="actualizacion-card__estado" data-estado={actualizacion.estado}>
          {etiquetaEstado(actualizacion.estado)}
        </span>
      </div>

      <h3 className="actualizacion-card__titulo">{actualizacion.titulo}</h3>

      {actualizacion.modulo || actualizacion.version ? (
        <div className="actualizacion-card__chips">
          {actualizacion.modulo ? <span className="badge">{actualizacion.modulo}</span> : null}
          {actualizacion.version ? (
            <span className="texto-muted">v{actualizacion.version}</span>
          ) : null}
        </div>
      ) : null}

      <p className="actualizacion-card__desc">{actualizacion.descripcion}</p>

      <footer className="actualizacion-card__meta">
        <span>{formatearFecha(actualizacion.fecha)}</span>
        {puedeEditar || puedeEliminar ? (
          <div className="actualizacion-card__acciones">
            {puedeEditar ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                data-testid={`actualizacion-editar-${actualizacion.id}`}
                onClick={() => onEditar(actualizacion)}
              >
                Editar
              </button>
            ) : null}
            {puedeEliminar ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm actualizacion-card__eliminar"
                data-testid={`actualizacion-eliminar-${actualizacion.id}`}
                onClick={() => onEliminar(actualizacion)}
              >
                Eliminar
              </button>
            ) : null}
          </div>
        ) : null}
      </footer>
    </article>
  )
}
