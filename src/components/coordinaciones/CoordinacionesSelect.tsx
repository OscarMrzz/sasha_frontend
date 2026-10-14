import { useQuery } from '@tanstack/react-query'
import { Field } from '#/components/ui/Field'
import { listCoordinaciones } from '#/services/coordinaciones'

/**
 * Checkboxes de coordinaciones (DEC-018). Muestra las activas más las ya marcadas
 * (aunque estén inactivas) y exige al menos una. Se usa al crear y al editar un usuario.
 */
export function CoordinacionesSelect({
  value,
  onChange,
  testIdPrefix = 'user',
}: {
  value: string[]
  onChange: (ids: string[]) => void
  testIdPrefix?: string
}) {
  const { data = [], isPending } = useQuery({ queryKey: ['coordinaciones'], queryFn: listCoordinaciones })
  const activas = data.filter((c) => c.status === 'ACTIVE' || value.includes(c.id))
  return (
    <Field
      label="Coordinaciones"
      error={!isPending && value.length === 0 ? 'Elige al menos una coordinación.' : undefined}
    >
      {isPending ? (
        <p className="texto-muted" style={{ margin: 0 }}>
          Cargando coordinaciones…
        </p>
      ) : activas.length === 0 ? (
        <p className="texto-muted" style={{ margin: 0 }}>
          No hay coordinaciones. Créalas primero en Coordinaciones.
        </p>
      ) : (
        <div className="coord-lista" data-testid={`${testIdPrefix}-coordinaciones`}>
          {activas.map((c) => (
            <label key={c.id} className="coord-check" title={c.descripcion || undefined}>
              <input
                type="checkbox"
                data-testid={`${testIdPrefix}-coordinacion-${c.titulo}`}
                checked={value.includes(c.id)}
                onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((id) => id !== c.id))}
              />
              <span>{c.titulo}</span>
            </label>
          ))}
        </div>
      )}
    </Field>
  )
}
