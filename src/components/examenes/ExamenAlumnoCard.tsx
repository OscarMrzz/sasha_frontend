import { useBovedaImage } from '#/hooks/use-boveda-image'
import { labelGradoSeccion } from '#/lib/examenes'

export type ExamenAlumnoCardData = {
  codigo: string
  nombre: string
  foto?: string
  grado: string
  seccion: string
}

/**
 * Card informativa del panel "Ahora": foto, nombre, código y grado-sección.
 * No muestra el detalle de pagos pendientes.
 */
export function ExamenAlumnoCard({ alumno }: { alumno: ExamenAlumnoCardData }) {
  const foto = useBovedaImage(alumno.foto)
  const inicial = alumno.nombre.trim().slice(0, 1).toUpperCase() || '?'

  return (
    <article
      className="examen-alumno-card"
      data-testid={`examen-alumno-${alumno.codigo}`}
    >
      {foto ? (
        <img
          className="examen-alumno-card__foto"
          src={foto}
          alt={`Foto de ${alumno.nombre}`}
        />
      ) : (
        <div className="examen-alumno-card__foto examen-alumno-card__foto--vacia" aria-hidden>
          {inicial}
        </div>
      )}

      <div className="examen-alumno-card__cuerpo">
        <p className="examen-alumno-card__nombre">{alumno.nombre}</p>
        <p className="examen-alumno-card__meta">
          Código {alumno.codigo || '—'} · {labelGradoSeccion(alumno.grado, alumno.seccion)}
        </p>
      </div>
    </article>
  )
}
