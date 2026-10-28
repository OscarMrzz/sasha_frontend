import { claveMes, nombreMes } from '#/helpers/configuracion-pagos'
import type { MesCobroOpcion } from '#/services/pagos-config'

type Props = {
  opciones: MesCobroOpcion[]
  seleccionados: string[]
  onChange: (claves: string[]) => void
  disabled?: boolean
  /** Variante pequeña con números 1–12 (para meses por grado). */
  compacto?: boolean
}

/**
 * Selector de meses que se cobran en el periodo: botones (no checkboxes) con los
 * meses activos en naranja y los inactivos atenuados. Incluye enero–diciembre del
 * año lectivo y, si el periodo cruza año, también los 12 del año siguiente.
 */
export function MesesCobro({ opciones, seleccionados, onChange, disabled, compacto }: Props) {
  const marcados = new Set(seleccionados)
  const porAnio = new Map<number, MesCobroOpcion[]>()
  for (const o of opciones) {
    const lista = porAnio.get(o.anio) ?? []
    lista.push(o)
    porAnio.set(o.anio, lista)
  }
  const anios = [...porAnio.keys()].sort((a, b) => a - b)

  const toggle = (clave: string) => {
    if (disabled) return
    const next = new Set(marcados)
    if (next.has(clave)) next.delete(clave)
    else next.add(clave)
    onChange([...next])
  }

  return (
    <div
      className={compacto ? 'meses-cobro--compacto' : undefined}
      data-testid="pagos-config-meses"
    >
      {anios.map((anio) => (
        <fieldset key={anio} className="meses-cobro__grupo">
          <legend className="meses-cobro__anio">{anio}</legend>
          <div className="meses-cobro__rejilla">
            {(porAnio.get(anio) ?? []).map((o) => {
              const clave = claveMes(o)
              const activo = marcados.has(clave)
              return (
                <button
                  key={clave}
                  type="button"
                  className={`meses-cobro__mes${activo ? ' meses-cobro__mes--activo' : ''}`}
                  data-testid={`pagos-config-mes-${clave}`}
                  aria-pressed={activo}
                  disabled={disabled}
                  onClick={() => toggle(clave)}
                >
                  {compacto ? o.mes : nombreMes(o.mes) || o.etiqueta}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
      {anios.length === 0 ? <p className="texto-muted">Cargando meses…</p> : null}
      {compacto ? null : (
        <p className="texto-muted ficha-form__nota" style={{ marginBottom: 0 }}>
          {seleccionados.length} mes(es) marcado(s).
        </p>
      )}
    </div>
  )
}
