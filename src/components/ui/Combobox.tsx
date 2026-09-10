import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

export type ComboboxOption = {
  value: string
  label: string
  /** Texto extra para filtrar (códigos, etc.) */
  keywords?: string
}

type ComboboxProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  disabled?: boolean
  emptyLabel?: string
  'data-testid'?: string
}

function matches(opt: ComboboxOption, q: string) {
  if (!q) return true
  const hay = `${opt.label} ${opt.keywords ?? ''} ${opt.value}`.toLowerCase()
  return hay.includes(q.toLowerCase())
}

/** Combobox con escritura para filtrar opciones (PRD formularios). */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder = 'Buscar…',
  disabled,
  emptyLabel = 'Sin resultados',
  'data-testid': testId,
}: ComboboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const listId = `${inputId}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const selected = options.find((o) => o.value === value)
  const display = open ? query : (selected?.label ?? '')

  const filtered = useMemo(() => options.filter((o) => matches(o, query)), [options, query])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && filtered[highlight]) pick(filtered[highlight].value)
      else setOpen(true)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className={`combobox${disabled ? ' combobox--disabled' : ''}`} ref={rootRef}>
      <div className="combobox__control">
        <input
          id={inputId}
          className="field__input combobox__input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          data-testid={testId}
          value={display}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (value) onChange('')
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && !disabled ? (
        <ul id={listId} className="combobox__list" role="listbox">
          {filtered.length === 0 ? (
            <li className="combobox__empty">{emptyLabel}</li>
          ) : (
            filtered.map((opt, i) => (
              <li key={opt.value} role="option" aria-selected={opt.value === value}>
                <button
                  type="button"
                  className={`combobox__option${i === highlight ? ' combobox__option--active' : ''}${
                    opt.value === value ? ' combobox__option--selected' : ''
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(opt.value)}
                >
                  {opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
