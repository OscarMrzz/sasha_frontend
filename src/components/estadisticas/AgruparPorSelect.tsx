import { useEffect, useRef, useState } from 'react'
import {
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  Clock,
  GraduationCap,
  Layers,
  LayoutGrid,
  User,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DIMENSIONES } from '#/helpers/estadisticas-mensajes'
import type { Dimension } from '#/services/estadisticas'

const ICONOS: Record<Dimension, LucideIcon> = {
  general: Building2,
  clase: BookMarked,
  maestro: Users,
  alumno: User,
  curso: BookOpen,
  grado: GraduationCap,
  seccion: LayoutGrid,
  modalidad: Clock,
  periodo: CalendarRange,
  parcial: Layers,
  mes: CalendarDays,
}

const AYUDA: Record<Dimension, string> = {
  general: 'Toda la institución en un solo bloque',
  clase: 'Compara cada materia en cada sección',
  maestro: 'Compara a los maestros entre sí',
  alumno: 'Compara a cada alumno',
  curso: 'Compara las materias',
  grado: 'Compara los grados',
  seccion: 'Compara las secciones',
  modalidad: 'Compara las modalidades (jornadas)',
  periodo: 'Compara los años lectivos',
  parcial: 'Compara los parciales',
  mes: 'Solo asistencia, mes a mes',
}

export function AgruparPorSelect({
  value,
  onChange,
  dimensiones,
  etiquetas,
  ayuda,
}: {
  value: Dimension
  onChange: (d: Dimension) => void
  /** Subconjunto a ofrecer; por defecto todas. */
  dimensiones?: Dimension[]
  etiquetas?: Partial<Record<Dimension, string>>
  ayuda?: Partial<Record<Dimension, string>>
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const lista = DIMENSIONES.filter((d) => !dimensiones || dimensiones.includes(d.id)).map((d) => ({
    ...d,
    label: etiquetas?.[d.id] ?? d.label,
    ayuda: ayuda?.[d.id] ?? AYUDA[d.id],
  }))
  const actual = lista.find((d) => d.id === value) ?? lista[0]
  const Icon = ICONOS[actual.id]

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  return (
    <div className="agrupar-select" ref={ref}>
      <button
        type="button"
        className={`agrupar-select__trigger${abierto ? ' agrupar-select__trigger--open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        data-testid="analisis-agrupar"
      >
        <span className="agrupar-select__icono">
          <Icon size={18} aria-hidden />
        </span>
        <span className="agrupar-select__texto">
          <span className="agrupar-select__kicker">Comparar por</span>
          <span className="agrupar-select__valor">{actual.label}</span>
        </span>
        <ChevronDown size={18} aria-hidden className="agrupar-select__chevron" />
      </button>
      {abierto ? (
        <ul className="agrupar-select__panel" role="listbox" aria-label="Comparar por">
          {lista.map((d) => {
            const I = ICONOS[d.id]
            const sel = d.id === value
            return (
              <li key={d.id} role="option" aria-selected={sel}>
                <button
                  type="button"
                  className={`agrupar-select__opcion${sel ? ' agrupar-select__opcion--sel' : ''}`}
                  onClick={() => {
                    onChange(d.id)
                    setAbierto(false)
                  }}
                  data-testid={`analisis-agrupar-${d.id}`}
                >
                  <I size={16} aria-hidden />
                  <span>
                    <span className="agrupar-select__opcion-label">{d.label}</span>
                    <span className="agrupar-select__opcion-ayuda">{d.ayuda}</span>
                  </span>
                  {sel ? <Check size={16} aria-hidden className="agrupar-select__check" /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
