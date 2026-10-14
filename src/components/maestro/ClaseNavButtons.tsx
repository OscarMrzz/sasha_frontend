import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useMemo } from 'react'
import { getHorarioMio } from '#/services/horarios'

function hm(t: string | undefined) {
  return (t ?? '').slice(0, 5)
}

function aMinutos(t: string) {
  const [h, m] = hm(t).split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return -1
  return h * 60 + m
}

/**
 * Botones Anterior / Ahora / Siguiente del dashboard de clase. Usa el horario del
 * maestro para ordenar las clases de HOY por hora de inicio y moverse entre ellas.
 * «Ahora» salta a la clase que toca en este momento (o a la próxima si está en un
 * hueco); «Anterior»/«Siguiente» se desactivan en los extremos del día.
 */
export function ClaseNavButtons({ asignacionId }: { asignacionId?: string | null }) {
  const navigate = useNavigate()
  const { data } = useQuery({ queryKey: ['horario-mio'], queryFn: () => getHorarioMio() })

  const { orden, ahoraIdx } = useMemo(() => {
    const slots = data?.slots ?? []
    const jsDay = new Date().getDay()
    const dia = jsDay === 0 ? 7 : jsDay
    const porAsig = new Map<string, { asignacion: string; inicio: string; fin: string }>()
    for (const s of slots) {
      if (s.dia_semana !== dia) continue
      const inicio = hm(s.hora_inicio)
      const cur = porAsig.get(s.asignacion_docente_id)
      if (!cur || inicio < cur.inicio) {
        porAsig.set(s.asignacion_docente_id, {
          asignacion: s.asignacion_docente_id,
          inicio,
          fin: hm(s.hora_fin),
        })
      }
    }
    const ordenados = [...porAsig.values()].sort((a, b) => a.inicio.localeCompare(b.inicio))
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    let idxAhora = ordenados.findIndex((a) => nowMin >= aMinutos(a.inicio) && nowMin < aMinutos(a.fin))
    if (idxAhora < 0) idxAhora = ordenados.findIndex((a) => aMinutos(a.inicio) > nowMin)
    return { orden: ordenados, ahoraIdx: idxAhora }
  }, [data])

  const idxVista = asignacionId ? orden.findIndex((a) => a.asignacion === asignacionId) : -1
  // Cursor: la clase que se está viendo; en la home (sin clase) se usa «ahora».
  const cursor = idxVista >= 0 ? idxVista : ahoraIdx
  const anterior = cursor > 0 ? orden[cursor - 1] : undefined
  const siguiente = cursor >= 0 && cursor < orden.length - 1 ? orden[cursor + 1] : undefined
  const ahora = ahoraIdx >= 0 ? orden[ahoraIdx] : undefined

  const tituloAnterior = anterior
    ? 'Clase anterior'
    : cursor === 0
      ? 'Primera clase del día'
      : 'Sin clase anterior'
  const tituloSiguiente = siguiente
    ? 'Siguiente clase'
    : orden.length > 0 && cursor === orden.length - 1
      ? 'Última clase del día'
      : 'Sin clase siguiente'
  const tituloAhora = ahora ? 'Ir a la clase de ahora' : 'No hay clase en este momento'

  const go = (destino?: { asignacion: string }) => {
    if (!destino || destino.asignacion === asignacionId) return
    void navigate({ to: '/maestro/clases/$asignacionId', params: { asignacionId: destino.asignacion } })
  }

  return (
    <div className="clase-nav" data-testid="clase-nav">
      <button
        type="button"
        className="btn btn--ghost clase-nav__btn"
        data-testid="clase-nav-anterior"
        title={tituloAnterior}
        disabled={!anterior}
        onClick={() => go(anterior)}
      >
        <ChevronLeft size={16} /> <span className="clase-nav__label">Anterior</span>
      </button>
      <button
        type="button"
        className="btn btn--primary clase-nav__btn"
        data-testid="clase-nav-ahora"
        title={tituloAhora}
        disabled={!ahora}
        onClick={() => go(ahora)}
      >
        <Clock size={16} /> <span className="clase-nav__label">Ahora</span>
      </button>
      <button
        type="button"
        className="btn btn--ghost clase-nav__btn"
        data-testid="clase-nav-siguiente"
        title={tituloSiguiente}
        disabled={!siguiente}
        onClick={() => go(siguiente)}
      >
        <span className="clase-nav__label">Siguiente</span> <ChevronRight size={16} />
      </button>
    </div>
  )
}
