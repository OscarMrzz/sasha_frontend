import { useState } from 'react'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'

export type VistaCalif = 'total' | 'parcial'
export type ResultadoCalif = 'aprobado' | 'reprobado' | 'sin_nota'
export type RangoPreset = 'todos' | '25' | '50' | '70' | '90' | 'custom'

export interface AvanzadoCalif {
  vista: VistaCalif
  resultados: ResultadoCalif[]
  rango: RangoPreset
  desde: string
  hasta: string
}

export const AVANZADO_CALIF_VACIO: AvanzadoCalif = {
  vista: 'total',
  resultados: ['aprobado', 'reprobado', 'sin_nota'],
  rango: 'todos',
  desde: '',
  hasta: '',
}

type Seccion = 'vista' | 'resultado' | 'rango'

const VISTAS: { id: VistaCalif; nombre: string }[] = [
  { id: 'total', nombre: 'Total y promedio' },
  { id: 'parcial', nombre: 'Por parcial' },
]

const RESULTADOS: { id: ResultadoCalif; nombre: string }[] = [
  { id: 'aprobado', nombre: 'Aprobados' },
  { id: 'reprobado', nombre: 'Reprobados' },
  { id: 'sin_nota', nombre: 'Sin nota' },
]

const RANGOS: { id: RangoPreset; nombre: string }[] = [
  { id: 'todos', nombre: 'Cualquiera' },
  { id: '25', nombre: 'Más de 25' },
  { id: '50', nombre: 'Más de 50' },
  { id: '70', nombre: 'Más de 70' },
  { id: '90', nombre: 'Más de 90' },
  { id: 'custom', nombre: 'Personalizado' },
]

export function etiquetaRango(a: AvanzadoCalif) {
  if (a.rango !== 'custom') return RANGOS.find((r) => r.id === a.rango)?.nombre ?? 'Cualquiera'
  return `${a.desde || '0'} – ${a.hasta || '100'}`
}

/** Cuántos filtros avanzados se apartan del valor por defecto (la vista no cuenta). */
export function filtrosActivos(a: AvanzadoCalif) {
  return (a.resultados.length < RESULTADOS.length ? 1 : 0) + (a.rango !== 'todos' ? 1 : 0)
}

export function CalificacionesAvanzadoModal({
  open,
  valor,
  onClose,
  onApply,
}: {
  open: boolean
  valor: AvanzadoCalif
  onClose: () => void
  onApply: (v: AvanzadoCalif) => void
}) {
  const [b, setB] = useState<AvanzadoCalif>(valor)
  const [activa, setActiva] = useState<Seccion>('vista')

  const toggleResultado = (id: ResultadoCalif) =>
    setB((x) => ({
      ...x,
      resultados: x.resultados.includes(id) ? x.resultados.filter((r) => r !== id) : [...x.resultados, id],
    }))

  const nav: { id: Seccion; titulo: string; conteo: string; vacia?: boolean }[] = [
    { id: 'vista', titulo: 'Vista', conteo: VISTAS.find((v) => v.id === b.vista)!.nombre },
    {
      id: 'resultado',
      titulo: 'Resultado',
      conteo: b.resultados.length === RESULTADOS.length ? 'Todos' : `${b.resultados.length} de ${RESULTADOS.length}`,
      vacia: b.resultados.length === 0,
    },
    { id: 'rango', titulo: 'Rango de promedio', conteo: etiquetaRango(b) },
  ]
  const actual = nav.find((n) => n.id === activa)!

  return (
    <Modal
      open={open}
      title="Filtros avanzados"
      onClose={onClose}
      xl
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => setB(AVANZADO_CALIF_VACIO)}>
            Restablecer
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={b.resultados.length === 0}
            title={b.resultados.length === 0 ? 'Marca al menos un resultado' : undefined}
            onClick={() => onApply(b)}
            data-testid="calif-avanzado-aplicar"
          >
            Aplicar
          </button>
        </>
      }
    >
      <div className="avanzado" data-testid="calif-avanzado-modal">
        <nav className="avanzado__nav" aria-label="Secciones del filtro">
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`avanzado__nav-item${n.id === activa ? ' avanzado__nav-item--activa' : ''}${n.vacia ? ' avanzado__nav-item--vacia' : ''}`}
              onClick={() => setActiva(n.id)}
              data-testid={`calif-avanzado-seccion-${n.id}`}
            >
              <span>{n.titulo}</span>
              <span className="avanzado__conteo">{n.conteo}</span>
            </button>
          ))}
        </nav>

        <section className="avanzado__panel">
          <header className="avanzado__panel-head">
            <div>
              <h3 className="avanzado__titulo">{actual.titulo}</h3>
              <p className="avanzado__ayuda">
                {activa === 'vista'
                  ? 'Cómo se muestran las columnas de la tabla.'
                  : activa === 'resultado'
                    ? 'Aprobados incluye honor al mérito y excelencia académica.'
                    : 'Se aplica al promedio de cada alumno con los filtros principales.'}
              </p>
            </div>
          </header>

          {activa === 'vista' ? (
            <ul className="avanzado__lista">
              {VISTAS.map((v) => (
                <li key={v.id}>
                  <label className="avanzado__check">
                    <input
                      type="radio"
                      name="calif-vista"
                      checked={b.vista === v.id}
                      onChange={() => setB((x) => ({ ...x, vista: v.id }))}
                      data-testid={`calif-vista-${v.id}`}
                    />
                    <span>{v.nombre}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}

          {activa === 'resultado' ? (
            <ul className="avanzado__lista">
              {RESULTADOS.map((r) => (
                <li key={r.id}>
                  <label className="avanzado__check">
                    <input
                      type="checkbox"
                      checked={b.resultados.includes(r.id)}
                      onChange={() => toggleResultado(r.id)}
                      data-testid={`calif-resultado-${r.id}`}
                    />
                    <span>{r.nombre}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}

          {activa === 'rango' ? (
            <>
              <ul className="avanzado__lista">
                {RANGOS.map((r) => (
                  <li key={r.id}>
                    <label className="avanzado__check">
                      <input
                        type="radio"
                        name="calif-rango"
                        checked={b.rango === r.id}
                        onChange={() => setB((x) => ({ ...x, rango: r.id }))}
                        data-testid={`calif-rango-${r.id}`}
                      />
                      <span>{r.nombre}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {b.rango === 'custom' ? (
                <div className="calif-avanzado__rango">
                  <Field label="Desde" htmlFor="calif-rango-desde">
                    <input
                      id="calif-rango-desde"
                      className="field__input"
                      type="number"
                      min={0}
                      max={100}
                      value={b.desde}
                      onChange={(e) => setB((x) => ({ ...x, desde: e.target.value }))}
                      data-testid="calif-rango-desde"
                    />
                  </Field>
                  <Field label="Hasta" htmlFor="calif-rango-hasta">
                    <input
                      id="calif-rango-hasta"
                      className="field__input"
                      type="number"
                      min={0}
                      max={100}
                      value={b.hasta}
                      onChange={(e) => setB((x) => ({ ...x, hasta: e.target.value }))}
                      data-testid="calif-rango-hasta"
                    />
                  </Field>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </Modal>
  )
}
