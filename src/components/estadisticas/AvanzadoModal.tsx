import { useMemo, useState } from 'react'
import { Modal } from '#/components/ui/Modal'
import { SearchInput } from '#/components/ui/SearchInput'
import { FILTROS_VACIOS } from '#/services/estadisticas'
import type { FiltrosAnalisis, OpcionItem, OpcionesAnalisis } from '#/services/estadisticas'

type Clave =
  | 'periodo_ids'
  | 'parcial_ids'
  | 'grado_ids'
  | 'modalidad_ids'
  | 'seccion_ids'
  | 'curso_ids'
  | 'maestro_ids'
  | 'alumno_ids'
  | 'tipo_tarea_ids'
  | 'meses'

/** null = todos marcados. */
type Borrador = Record<Clave, string[] | null>

const SECCIONES: { clave: Clave; titulo: string; ayuda?: string }[] = [
  { clave: 'periodo_ids', titulo: 'Periodo' },
  { clave: 'parcial_ids', titulo: 'Parcial' },
  { clave: 'grado_ids', titulo: 'Grado' },
  { clave: 'modalidad_ids', titulo: 'Modalidad' },
  { clave: 'seccion_ids', titulo: 'Sección', ayuda: 'Solo las secciones de los grados y modalidades marcados.' },
  { clave: 'curso_ids', titulo: 'Materia' },
  { clave: 'maestro_ids', titulo: 'Maestro' },
  { clave: 'alumno_ids', titulo: 'Alumno', ayuda: 'Solo los alumnos de las secciones marcadas.' },
  { clave: 'tipo_tarea_ids', titulo: 'Tipo de tarea', ayuda: 'Afecta a las tarjetas por tipo, no a la nota general.' },
  { clave: 'meses', titulo: 'Mes', ayuda: 'Solo afecta a la sección de asistencia.' },
]

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(
  (nombre, i) => ({ id: String(i + 1), nombre }),
)

function desdeFiltros(f: FiltrosAnalisis): Borrador {
  const b = {} as Borrador
  for (const s of SECCIONES) {
    const v = s.clave === 'meses' ? f.meses.map(String) : f[s.clave]
    b[s.clave] = v.length ? [...v] : null
  }
  return b
}

function visiblesDe(op: OpcionesAnalisis, b: Borrador): Record<Clave, OpcionItem[]> {
  const en = (sel: string[] | null, id: string | null) => sel === null || (id !== null && sel.includes(id))
  const secciones = op.secciones.filter((s) => en(b.grado_ids, s.grado_id) && en(b.modalidad_ids, s.modalidad_id))
  const secIds = new Set(secciones.map((s) => s.id))
  const secSel = b.seccion_ids === null ? secIds : new Set(b.seccion_ids.filter((id) => secIds.has(id)))
  const filtrarAlumnos = b.grado_ids !== null || b.modalidad_ids !== null || b.seccion_ids !== null
  return {
    periodo_ids: op.periodos,
    parcial_ids: op.parciales
      .filter((p) => en(b.periodo_ids, p.periodo_id))
      .map((p) => ({ id: p.id, nombre: `${p.nombre} · ${op.periodos.find((x) => x.id === p.periodo_id)?.nombre ?? ''}` })),
    grado_ids: op.grados,
    modalidad_ids: op.modalidades,
    seccion_ids: secciones,
    curso_ids: op.cursos,
    maestro_ids: op.maestros,
    alumno_ids: op.alumnos
      .filter((a) => !filtrarAlumnos || (a.seccion_id !== null && secSel.has(a.seccion_id)))
      .map((a) => ({ id: a.id, nombre: a.codigo ? `${a.nombre} (${a.codigo})` : a.nombre })),
    tipo_tarea_ids: op.tipos_tarea,
    meses: MESES,
  }
}

/** Todo lo visible marcado se envía como [] (= todos). */
function aFiltros(b: Borrador, vis: Record<Clave, OpcionItem[]>, solo: boolean): FiltrosAnalisis {
  const f: FiltrosAnalisis = { ...FILTROS_VACIOS, solo_liberadas: solo }
  for (const s of SECCIONES) {
    const sel = b[s.clave]
    const ids = new Set(vis[s.clave].map((o) => o.id))
    const elegidos = sel === null ? [] : sel.filter((id) => ids.has(id))
    const final = elegidos.length === ids.size ? [] : elegidos
    if (s.clave === 'meses') f.meses = final.map(Number)
    else f[s.clave] = final
  }
  return f
}

export function AvanzadoModal({
  open,
  opciones,
  filtros,
  onClose,
  onApply,
}: {
  open: boolean
  opciones: OpcionesAnalisis
  filtros: FiltrosAnalisis
  onClose: () => void
  onApply: (f: FiltrosAnalisis) => void
}) {
  const [borrador, setBorrador] = useState<Borrador>(() => desdeFiltros(filtros))
  const [solo, setSolo] = useState(filtros.solo_liberadas)
  const [activa, setActiva] = useState<Clave>('periodo_ids')
  const [q, setQ] = useState('')
  const vis = useMemo(() => visiblesDe(opciones, borrador), [opciones, borrador])

  const marcados = (c: Clave) => {
    const sel = borrador[c]
    if (sel === null) return vis[c].length
    const ids = new Set(vis[c].map((o) => o.id))
    return sel.filter((id) => ids.has(id)).length
  }
  const vacias = SECCIONES.filter((s) => vis[s.clave].length > 0 && marcados(s.clave) === 0)

  const toggle = (c: Clave, id: string) => {
    setBorrador((b) => {
      const actual = b[c] ?? vis[c].map((o) => o.id)
      const next = actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]
      const todos = vis[c].every((o) => next.includes(o.id))
      return { ...b, [c]: todos ? null : next }
    })
  }

  const seccion = SECCIONES.find((s) => s.clave === activa)!
  const lista = vis[activa].filter((o) => !q.trim() || o.nombre.toLowerCase().includes(q.trim().toLowerCase()))
  const sel = borrador[activa]

  return (
    <Modal
      open={open}
      title="Análisis avanzado"
      onClose={onClose}
      xl
      footer={
        <>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setBorrador(desdeFiltros(FILTROS_VACIOS))
              setSolo(false)
            }}
          >
            Restablecer
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={vacias.length > 0}
            title={vacias.length ? `Marca al menos uno en: ${vacias.map((s) => s.titulo).join(', ')}` : undefined}
            onClick={() => onApply(aFiltros(borrador, vis, solo))}
            data-testid="avanzado-aplicar"
          >
            Aplicar
          </button>
        </>
      }
    >
      <div className="avanzado" data-testid="avanzado-modal">
        <nav className="avanzado__nav" aria-label="Secciones del filtro">
          {SECCIONES.map((s) => {
            const n = marcados(s.clave)
            const total = vis[s.clave].length
            return (
              <button
                key={s.clave}
                type="button"
                className={`avanzado__nav-item${s.clave === activa ? ' avanzado__nav-item--activa' : ''}${n === 0 && total > 0 ? ' avanzado__nav-item--vacia' : ''}`}
                onClick={() => {
                  setActiva(s.clave)
                  setQ('')
                }}
                data-testid={`avanzado-seccion-${s.clave}`}
              >
                <span>{s.titulo}</span>
                <span className="avanzado__conteo">{n === total ? 'Todos' : `${n} de ${total}`}</span>
              </button>
            )
          })}
          <label className="avanzado__switch">
            <input type="checkbox" checked={solo} onChange={(e) => setSolo(e.target.checked)} data-testid="avanzado-solo-liberadas" />
            <span>Solo parciales liberados</span>
          </label>
        </nav>

        <section className="avanzado__panel">
          <header className="avanzado__panel-head">
            <div>
              <h3 className="avanzado__titulo">{seccion.titulo}</h3>
              {seccion.ayuda ? <p className="avanzado__ayuda">{seccion.ayuda}</p> : null}
            </div>
            <div className="avanzado__acciones">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setBorrador((b) => ({ ...b, [activa]: null }))}
              >
                Todos
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setBorrador((b) => ({ ...b, [activa]: [] }))}>
                Ninguno
              </button>
            </div>
          </header>
          {vis[activa].length > 8 ? <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" /> : null}
          {vis[activa].length === 0 ? (
            <p className="analisis-bento__vacio">No hay opciones con los filtros actuales.</p>
          ) : (
            <ul className="avanzado__lista">
              {lista.map((o) => (
                <li key={o.id}>
                  <label className="avanzado__check">
                    <input
                      type="checkbox"
                      checked={sel === null || sel.includes(o.id)}
                      onChange={() => toggle(activa, o.id)}
                    />
                    <span>{o.nombre}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  )
}
