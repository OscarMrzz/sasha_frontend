import { useMemo, useState } from 'react'
import { SearchInput } from '#/components/ui/SearchInput'
import { claveRegla, etiquetaRegla, resumenReglas } from '#/helpers/tipos-pago'
import type { OpcionesDestino } from '#/helpers/tipos-pago'
import type { TipoPagoReglaInput } from '#/services/pagos-tipos'

type Tab = 'modalidad' | 'grado' | 'seccion' | 'avanzado'
type SeccionAvanzada = 'grado' | 'seccion' | 'modalidad' | 'curso' | 'alumno'

const TABS: { id: Tab; label: string }[] = [
  { id: 'modalidad', label: 'Modalidad' },
  { id: 'grado', label: 'Grado' },
  { id: 'seccion', label: 'Sección' },
  { id: 'avanzado', label: 'Avanzado' },
]

const SECCIONES: { clave: SeccionAvanzada; titulo: string; campo: keyof TipoPagoReglaInput }[] = [
  { clave: 'grado', titulo: 'Grado', campo: 'grado_id' },
  { clave: 'seccion', titulo: 'Sección', campo: 'seccion_id' },
  { clave: 'modalidad', titulo: 'Modalidad', campo: 'modalidad_id' },
  { clave: 'curso', titulo: 'Curso', campo: 'curso_id' },
  { clave: 'alumno', titulo: 'Alumno', campo: 'alumno_id' },
]

type OpcionAvanzada = { id: string; nombre: string }

type Props = {
  opciones: OpcionesDestino
  reglas: TipoPagoReglaInput[]
  onChange: (reglas: TipoPagoReglaInput[]) => void
  disabled?: boolean
}

const vacia = (): TipoPagoReglaInput => ({
  modalidad_id: null,
  grado_id: null,
  seccion_id: null,
  alumno_id: null,
  curso_id: null,
})

/**
 * Destinos de un tipo adicional. Las pestañas simples agregan una regla por opción;
 * «Avanzado» usa el mismo filtro de secciones con Todos/Ninguno y checkboxes.
 */
export function DestinosTipoPago({ opciones, reglas, onChange, disabled }: Props) {
  const [tab, setTab] = useState<Tab>('modalidad')
  const [activa, setActiva] = useState<SeccionAvanzada>('grado')
  const [q, setQ] = useState('')

  const claves = useMemo(() => new Set(reglas.map(claveRegla)), [reglas])
  const yaIncluida = (r: TipoPagoReglaInput) => claves.has(claveRegla(r))

  const agregar = (r: TipoPagoReglaInput) => {
    if (disabled || yaIncluida(r)) return
    onChange([...reglas, r])
  }
  const quitar = (i: number) => {
    if (disabled) return
    onChange(reglas.filter((_, idx) => idx !== i))
  }

  const opcionesDe = useMemo(() => {
    const mapa: Record<SeccionAvanzada, OpcionAvanzada[]> = {
      modalidad: opciones.modalidades.map((m) => ({ id: m.id, nombre: m.nombre })),
      grado: opciones.grados.map((g) => ({ id: g.id, nombre: g.nombre })),
      seccion: opciones.secciones.map((s) => ({
        id: s.id,
        nombre: `${s.grado_nombre} · ${s.nombre}`,
      })),
      curso: opciones.cursos.map((c) => ({ id: c.id, nombre: c.nombre })),
      alumno: opciones.alumnos.map((a) => ({
        id: a.id,
        nombre: `${a.nombre} · ${a.codigo} · ${a.grado_nombre} ${a.seccion_nombre}`,
      })),
    }
    return mapa
  }, [opciones])

  const seccion = SECCIONES.find((s) => s.clave === activa) ?? SECCIONES[0]
  const totalSeccion = opcionesDe[activa].length

  const incluidas = (clave: SeccionAvanzada) => {
    const campo = SECCIONES.find((s) => s.clave === clave)?.campo
    if (!campo) return 0
    return reglas.filter((r) => r[campo]).length
  }

  const incluida = (clave: SeccionAvanzada, id: string) => {
    const campo = SECCIONES.find((s) => s.clave === clave)?.campo
    if (!campo) return false
    return reglas.some((r) => r[campo] === id)
  }

  const reglaPara = (clave: SeccionAvanzada, id: string): TipoPagoReglaInput => {
    const r = vacia()
    const campo = SECCIONES.find((s) => s.clave === clave)?.campo
    if (campo) r[campo] = id
    return r
  }

  const toggle = (clave: SeccionAvanzada, id: string) => {
    if (disabled) return
    const campo = SECCIONES.find((s) => s.clave === clave)?.campo
    if (!campo) return
    const idx = reglas.findIndex((r) => r[campo] === id)
    if (idx >= 0) {
      onChange(reglas.filter((_, i) => i !== idx))
      return
    }
    onChange([...reglas, reglaPara(clave, id)])
  }

  const marcarTodos = (clave: SeccionAvanzada) => {
    if (disabled) return
    const nuevas = [...reglas]
    for (const o of opcionesDe[clave]) {
      if (!incluida(clave, o.id)) nuevas.push(reglaPara(clave, o.id))
    }
    onChange(nuevas)
  }

  const limpiarSeccion = (clave: SeccionAvanzada) => {
    if (disabled) return
    const campo = SECCIONES.find((s) => s.clave === clave)?.campo
    if (!campo) return
    onChange(reglas.filter((r) => !r[campo]))
  }

  const lista = useMemo(() => {
    const texto = q.trim().toLowerCase()
    const base = opcionesDe[activa]
    if (!texto) return base
    return base.filter((o) => o.nombre.toLowerCase().includes(texto))
  }, [opcionesDe, activa, q])

  const opcion = (r: TipoPagoReglaInput, texto: string, testId: string) => (
    <button
      key={testId}
      type="button"
      className="destinos__opcion"
      disabled={disabled || yaIncluida(r)}
      data-testid={testId}
      onClick={() => agregar(r)}
    >
      <span className="destinos__opcion-texto">{texto}</span>
      {yaIncluida(r) ? <span className="destinos__opcion-marca">Incluida</span> : null}
    </button>
  )

  return (
    <div className="destinos" data-testid="tipo-pago-destinos">
      <div className="destinos__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`destinos__tab${tab === t.id ? ' destinos__tab--activo' : ''}`}
            data-testid={`tipo-pago-tab-${t.id}`}
            disabled={disabled}
            onClick={() => {
              setTab(t.id)
              setQ('')
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={tab === 'avanzado' ? 'destinos__panel destinos__panel--avanzado' : 'destinos__panel'}>
        {tab === 'modalidad' ? (
          <div className="destinos__lista" data-testid="tipo-pago-destinos-modalidad">
            {opciones.modalidades.length === 0 ? (
              <p className="texto-muted">No hay modalidades activas.</p>
            ) : (
              opciones.modalidades.map((m) =>
                opcion(
                  { ...vacia(), modalidad_id: m.id },
                  m.nombre,
                  `tipo-pago-destino-modalidad-${m.id}`,
                ),
              )
            )}
          </div>
        ) : null}

        {tab === 'grado' ? (
          <div className="destinos__lista" data-testid="tipo-pago-destinos-grado">
            {opciones.grados.map((g) =>
              opcion({ ...vacia(), grado_id: g.id }, g.nombre, `tipo-pago-destino-grado-${g.id}`),
            )}
          </div>
        ) : null}

        {tab === 'seccion' ? (
          <div className="destinos__lista" data-testid="tipo-pago-destinos-seccion">
            {opciones.secciones.map((s) =>
              opcion(
                { ...vacia(), seccion_id: s.id },
                `${s.grado_nombre} · ${s.nombre}`,
                `tipo-pago-destino-seccion-${s.id}`,
              ),
            )}
          </div>
        ) : null}

        {tab === 'avanzado' ? (
          <div className="avanzado" data-testid="tipo-pago-destinos-avanzado">
            <nav className="avanzado__nav" aria-label="Secciones de destinos">
              {SECCIONES.map((s) => {
                const n = incluidas(s.clave)
                const total = opcionesDe[s.clave].length
                return (
                  <button
                    key={s.clave}
                    type="button"
                    className={`avanzado__nav-item${s.clave === activa ? ' avanzado__nav-item--activa' : ''}${n === 0 && total > 0 ? ' avanzado__nav-item--vacia' : ''}`}
                    onClick={() => {
                      setActiva(s.clave)
                      setQ('')
                    }}
                    data-testid={`tipo-pago-avanzado-seccion-${s.clave}`}
                  >
                    <span>{s.titulo}</span>
                    <span className="avanzado__conteo">
                      {n === total ? 'Todos' : `${n} de ${total}`}
                    </span>
                  </button>
                )
              })}
            </nav>

            <section className="avanzado__panel">
              <header className="avanzado__panel-head">
                <div>
                  <h3 className="avanzado__titulo">{seccion.titulo}</h3>
                </div>
                <div className="avanzado__acciones">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    data-testid={`tipo-pago-avanzado-todos-${activa}`}
                    disabled={disabled}
                    onClick={() => marcarTodos(activa)}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    data-testid={`tipo-pago-avanzado-ninguno-${activa}`}
                    disabled={disabled}
                    onClick={() => limpiarSeccion(activa)}
                  >
                    Ninguno
                  </button>
                </div>
              </header>

              {totalSeccion > 8 ? <SearchInput value={q} onChange={(e) => setQ(e.target.value)} /> : null}

              {totalSeccion === 0 ? (
                <p className="texto-muted">No hay opciones para este periodo.</p>
              ) : lista.length === 0 ? (
                <p className="texto-muted">Sin coincidencias.</p>
              ) : (
                <ul className="avanzado__lista">
                  {lista.map((o) => (
                    <li key={o.id}>
                      <label className="avanzado__check">
                        <input
                          type="checkbox"
                          checked={incluida(activa, o.id)}
                          disabled={disabled}
                          data-testid={`tipo-pago-avanzado-${activa}-${o.id}`}
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
        ) : null}
      </div>

      <div className="destinos__resumen" data-testid="tipo-pago-resumen-destinos">
        <p className="texto-muted ficha-form__nota" style={{ margin: 0 }}>
          {resumenReglas(reglas)}
        </p>
        {reglas.length > 0 ? (
          <ul className="destinos__chips">
            {reglas.map((r, i) => (
              <li key={`${claveRegla(r)}-${i}`} className="destinos__chip">
                <span>{etiquetaRegla(r, opciones)}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  data-testid={`tipo-pago-regla-quitar-${i}`}
                  disabled={disabled}
                  onClick={() => quitar(i)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
