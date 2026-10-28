type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  value: T
  options: [Option<T>, Option<T>]
  onChange: (value: T) => void
  disabled?: boolean
  testId?: string
  ariaLabel?: string
}

/** Par de botones para elegir entre dos modos (por ejemplo, general / por grado). */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  disabled,
  testId,
  ariaLabel,
}: Props<T>) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel} data-testid={testId}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`segmented__option${value === o.value ? ' segmented__option--activo' : ''}`}
          aria-pressed={value === o.value}
          data-testid={testId ? `${testId}-${o.value}` : undefined}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
