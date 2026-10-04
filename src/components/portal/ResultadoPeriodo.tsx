import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, Lock, XCircle } from 'lucide-react'
import { getResultadoPeriodo } from '#/services/portal'
import type { ResultadoAlumno, ResultadoClase } from '#/services/portal'

function Recuperaciones({ c }: { c: ResultadoClase }) {
  const notas = c.recuperaciones_periodo.flatMap((n, k) => (n == null ? [] : [`Rec. ${k + 1}: ${n}`]))
  if (notas.length === 0) return null
  return (
    <small className="resultado-periodo__recups">
      {notas.join(' · ')}
      {c.recuperacion_aprobada > 0 ? ` · aprobó con recuperación ${c.recuperacion_aprobada}` : ''}
    </small>
  )
}

function lista(nombres: string[]) {
  return nombres.length < 2 ? nombres.join('') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1) ?? ''}`
}

/** «Se confirma que…»: explica el resultado con el grado y las clases. */
function detalle(r: ResultadoAlumno) {
  if (!r.aprueba) {
    const clases = r.reprobadas === 1 ? '1 clase' : `${r.reprobadas} clases`
    return `Se confirma que el alumno tendrá que repetir el grado, ya que reprobó ${clases}.`
  }
  const destino = r.grado_siguiente ? `pasa a ${r.grado_siguiente.nombre}` : 'completó el último grado'
  const n = r.retrasadas.length
  if (n === 0) return `Se confirma que el alumno ${destino} con todas sus clases aprobadas.`
  const clases = n === 1 ? 'una clase retrasada' : `${n} clases retrasadas`
  return `Se confirma que el alumno ${destino} con ${clases} (${lista(r.retrasadas.map((c) => c.curso))}).`
}

/** Resultado del año: aparece cuando todos los parciales están visibles; antes, un aviso. */
export function ResultadoPeriodo({ alumnoId }: { alumnoId: string | null }) {
  const { data } = useQuery({
    queryKey: ['portal-resultado', alumnoId ?? 'self'],
    queryFn: () => getResultadoPeriodo(alumnoId),
  })
  if (!data || data.estado === 'sin_matricula') return null

  if (data.estado !== 'disponible' || !data.resultado) {
    const Icon = data.estado === 'bloqueado' ? Lock : Clock
    return (
      <section className="mdash__tile resultado-periodo" data-testid="resultado-periodo" data-estado={data.estado}>
        <h2 className="mdash__tile-title">Resultado del periodo</h2>
        <div className="notas-bento__bloqueo notas-bento__bloqueo--espera">
          <Icon size={22} aria-hidden />
          <p data-testid="resultado-periodo-mensaje">{data.mensaje}</p>
        </div>
      </section>
    )
  }

  const r = data.resultado
  const Icon = r.aprueba ? CheckCircle2 : XCircle
  return (
    <section
      className={`mdash__tile resultado-periodo resultado-periodo--${r.aprueba ? 'aprueba' : 'repite'}`}
      data-testid="resultado-periodo"
      data-estado={r.aprueba ? 'aprueba' : 'repite'}
    >
      <h2 className="mdash__tile-title">Resultado del periodo · {r.periodo_nombre}</h2>
      <div className="resultado-periodo__cabecera">
        <Icon size={36} aria-hidden />
        <div>
          <p className="resultado-periodo__mensaje" data-testid="resultado-periodo-mensaje">
            {r.mensaje}
          </p>
          <p className="notas-bento__nota" data-testid="resultado-periodo-detalle">
            {detalle(r)}
          </p>
        </div>
      </div>
      <ul className="resultado-periodo__clases">
        {r.clases.map((c) => (
          <li
            key={c.asignacion_id}
            className={`resultado-periodo__clase${c.aprobada ? '' : ' resultado-periodo__clase--reprobada'}`}
            data-testid={`resultado-periodo-clase-${c.curso_id}`}
          >
            <span className="resultado-periodo__curso">
              {c.curso}
              <Recuperaciones c={c} />
            </span>
            <span className="resultado-periodo__nota">{c.final}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
