import { Plus, Trash2 } from 'lucide-react'
import { Field } from '#/components/ui/Field'
import { reglaVacia } from '#/helpers/configuracion-pagos'
import type { ReglaMoraForm } from '#/helpers/configuracion-pagos'

type Props = {
  /** Filas de reglas de mora controladas por el formulario del modal. */
  value: ReglaMoraForm[]
  onChange: (value: ReglaMoraForm[]) => void
  /** Bloquea la sección (modo ver o guardado en curso). */
  disabled?: boolean
  /** Id del grado; se usa para construir los `data-testid`. */
  gradoId: string
}

/**
 * Sub-componente controlado de reglas de mora de un grado.
 * Cada fila es «N días o más → monto»; los días se numeran solos (1.ª fila = 1,
 * 2.ª = 2, …) y las reglas son acumulativas.
 */
export function ReglasMoraGrado({ value, onChange, disabled = false, gradoId }: Props) {
  const setRow = (i: number, patch: Partial<ReglaMoraForm>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const agregar = () => onChange([...value, reglaVacia()])

  const quitar = (i: number) => onChange(value.filter((_, j) => j !== i))

  return (
    <div className="mora-reglas" data-testid={`pagos-config-reglas-${gradoId}`}>
      <div className="niveles">
        {value.map((regla, i) => (
          <div
            key={regla.key}
            className="nivel-fila mora-regla"
            data-testid={`pagos-config-regla-${gradoId}-${i}`}
          >
            <Field label="Días de retraso">
              <span
                className="mora-regla__dias"
                data-testid={`pagos-config-regla-${gradoId}-${i}-dias`}
                aria-label="Días de retraso o más"
              >
                {i + 1} {i + 1 === 1 ? 'día' : 'días'} o más
              </span>
            </Field>
            <Field label="Monto">
              <input
                type="number"
                min={0}
                className="field__input mora-regla__monto"
                aria-label="Monto del recargo"
                data-testid={`pagos-config-regla-${gradoId}-${i}-monto`}
                placeholder="0"
                disabled={disabled}
                value={regla.monto}
                onChange={(e) => setRow(i, { monto: e.target.value })}
              />
            </Field>
            <button
              type="button"
              className="nivel-fila__quitar mora-regla__quitar"
              aria-label="Quitar regla de mora"
              title="Quitar regla"
              data-testid={`pagos-config-regla-${gradoId}-${i}-quitar`}
              disabled={disabled}
              onClick={() => quitar(i)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="niveles__pie">
        <button
          type="button"
          className="btn btn--ghost"
          data-testid={`pagos-config-agregar-regla-${gradoId}`}
          disabled={disabled}
          onClick={agregar}
        >
          <Plus size={16} /> Agregar
        </button>
      </div>
    </div>
  )
}
