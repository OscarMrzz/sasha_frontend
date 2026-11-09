import { useBovedaImage } from '#/hooks/use-boveda-image'
import {
  etiquetaConcepto,
  formatearMes,
  labelGradoSeccion,
} from '#/lib/examenes'
import type { ExamenConceptoPendiente } from '#/services/examenes'

export type ExamenAlumnoCardData = {
  codigo: string
  nombre: string
  foto?: string
  grado: string
  seccion: string
  meses?: string[]
  conceptos?: ExamenConceptoPendiente[]
}

/**
 * Card informativa del panel "Ahora": foto, nombre, código, grado-sección
 * y los meses / otros conceptos que el alumno adeuda.
 */
export function ExamenAlumnoCard({ alumno }: { alumno: ExamenAlumnoCardData }) {
  const foto = useBovedaImage(alumno.foto)
  const inicial = alumno.nombre.trim().slice(0, 1).toUpperCase() || '?'

  const meses = deduplicar(
    alumno.meses?.length
      ? alumno.meses
      : (alumno.conceptos ?? [])
          .filter(
            (concepto) =>
              concepto.es_mensualidad && concepto.anio && concepto.mes,
          )
          .map(etiquetaConcepto),
  )
  const otros = deduplicar(
    (alumno.conceptos ?? [])
      .filter(
        (concepto) =>
          !concepto.es_mensualidad || !concepto.anio || !concepto.mes,
      )
      .map((concepto) => concepto.tipo_nombre)
      .filter(Boolean),
  )

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
        {meses.length ? (
          <p className="examen-alumno-card__aviso">
            Debe: {meses.map(formatearMes).join(' · ')}
          </p>
        ) : null}
        {otros.length ? (
          <p className="examen-alumno-card__aviso">
            Otros pendientes: {otros.join(' · ')}
          </p>
        ) : null}
      </div>
    </article>
  )
}

function deduplicar(valores: string[]): string[] {
  const vistos = new Set<string>()
  const out: string[] = []
  for (const valor of valores) {
    const limpio = valor.trim()
    if (!limpio || vistos.has(limpio)) continue
    vistos.add(limpio)
    out.push(limpio)
  }
  return out
}
