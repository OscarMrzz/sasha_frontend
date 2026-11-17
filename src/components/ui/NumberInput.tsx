import { useRef, useState } from 'react'
import type { FocusEvent, InputHTMLAttributes } from 'react'
type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  type?: 'number'
}

/** Permite reemplazar el cero inicial y restaura el valor si no se modifica. */
export function NumberInput({
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}: NumberInputProps) {
  const editing = useRef(false)
  const originalValue = useRef('')
  const changed = useRef(false)
  const clearedZero = useRef(false)
  const [draft, setDraft] = useState<string | null>(null)
  const currentValue = value == null ? '' : String(value)
  const numericValue = Number(currentValue)
  const startsAtZero =
    currentValue.trim() !== '' &&
    Number.isFinite(numericValue) &&
    numericValue === 0

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    editing.current = true
    originalValue.current = currentValue
    changed.current = false
    clearedZero.current = startsAtZero
    setDraft(startsAtZero ? '' : currentValue)
    onFocus?.(event)
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (clearedZero.current && !changed.current) {
      event.currentTarget.value = originalValue.current
    }
    editing.current = false
    setDraft(null)
    clearedZero.current = false
    onBlur?.(event)
  }

  return (
    <input
      {...props}
      type="number"
      value={editing.current && draft !== null ? draft : currentValue}
      onFocus={handleFocus}
      onChange={(event) => {
        if (editing.current) {
          changed.current = true
          setDraft(event.currentTarget.value)
        }
        onChange?.(event)
      }}
      onBlur={handleBlur}
    />
  )
}
