import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Field } from '#/components/ui/Field'
import { parcialNombre } from '#/helpers/parciales'
import type { ParcialForm } from '#/services/catalogos'

type Props = {
  /** Filas de parciales controladas por el formulario del periodo. */
  value: ParcialForm[]
  onChange: (value: ParcialForm[]) => void
  /** Bloquea toda la sección (modo ver o periodo finalizado). */
  disabled?: boolean
}

const filaVacia = (numero: number): ParcialForm => ({
  numero,
  fecha_inicio: '',
  fecha_fin: '',
  nota_maxima: 100,
})

function Seccion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="expediente__seccion" data-testid="periodo-parciales">
      <h3 className="expediente__titulo">{title}</h3>
      {children}
    </section>
  )
}

export function ParcialesPeriodoForm({ value, onChange, disabled = false }: Props) {
  const setRow = (i: number, patch: Partial<ParcialForm>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const agregar = () => onChange([...value, filaVacia(value.length + 1)])

  const quitar = (i: number) =>
    onChange(value.filter((_, j) => j !== i).map((r, k) => ({ ...r, numero: k + 1 })))

  return (
    <Seccion title="Parciales">
      <div className="periodo-parciales">
        {value.map((p, i) => {
          const err = Boolean(p.fecha_inicio && p.fecha_fin && p.fecha_fin < p.fecha_inicio)
          return (
            <div
              key={i}
              className={`parcial-fila${err ? ' parcial-fila--error' : ''}`}
              data-testid={`periodo-parcial-${i + 1}`}
            >
              <span className="nivel-badge parcial-fila__nombre" data-testid={`periodo-parcial-${i + 1}-nombre`}>
                {parcialNombre(i + 1)}
              </span>
              <Field label="Fecha inicio">
                <input
                  type="date"
                  className="field__input"
                  disabled={disabled}
                  data-testid={`periodo-parcial-${i + 1}-inicio`}
                  value={p.fecha_inicio}
                  onChange={(e) => setRow(i, { fecha_inicio: e.target.value })}
                />
              </Field>
              <Field label="Fecha fin">
                <input
                  type="date"
                  className="field__input"
                  disabled={disabled}
                  min={p.fecha_inicio || undefined}
                  data-testid={`periodo-parcial-${i + 1}-fin`}
                  value={p.fecha_fin}
                  onChange={(e) => setRow(i, { fecha_fin: e.target.value })}
                />
              </Field>
              <Field label="Nota máxima">
                <input
                  type="number"
                  className="field__input"
                  disabled={disabled}
                  min={0}
                  max={100}
                  data-testid={`periodo-parcial-${i + 1}-nota-maxima`}
                  value={p.nota_maxima}
                  onChange={(e) =>
                    setRow(i, { nota_maxima: e.target.value === '' ? 100 : Number(e.target.value) })
                  }
                />
              </Field>
              <button
                type="button"
                className="nivel-fila__quitar parcial-fila__quitar"
                aria-label={`Quitar el ${parcialNombre(i + 1)}`}
                title="Quitar parcial"
                data-testid={`periodo-parcial-${i + 1}-quitar`}
                disabled={disabled || value.length === 1}
                onClick={() => quitar(i)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )
        })}
      </div>
      <div className="periodo-parciales__pie">
        <button
          type="button"
          className="btn btn--ghost periodo-parciales__agregar"
          data-testid="periodo-parcial-agregar"
          disabled={disabled}
          onClick={agregar}
        >
          <Plus size={16} /> Agregar
        </button>
      </div>
    </Seccion>
  )
}
