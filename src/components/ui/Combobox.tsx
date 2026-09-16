import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

export type ComboboxOption = {
  value: string
  label: string
  /** Texto extra para filtrar (códigos, etc.) */
  keywords?: string
  /** Apariencia más suave (sigue siendo seleccionable). */
  muted?: boolean
}

type ComboboxProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  disabled?: boolean
  emptyLabel?: string
  /** Permite confirmar texto que no está en la lista (Enter, blur o «Usar»). */
  allowCustom?: boolean
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
  allowCustom = false,
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
  const display = open ? query : (selected?.label ?? value)

  const filtered = useMemo(() => options.filter((o) => matches(o, query)), [options, query])
  const q = query.trim()
  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === q.toLowerCase() || o.value.toLowerCase() === q.toLowerCase(),
  )
  const showCreate = allowCustom && Boolean(q) && !exactMatch
  const itemCount = filtered.length + (showCreate ? 1 : 0)

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  const commitCustom = () => {
    const t = query.trim()
    if (!t) {
      onChange('')
      return
    }
    const match = options.find(
      (o) => o.label.toLowerCase() === t.toLowerCase() || o.value.toLowerCase() === t.toLowerCase(),
    )
    onChange(match ? match.value : t)
  }

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        if (allowCustom) commitCustom()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
    // query is read via closure when mousedown fires
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, allowCustom, query, options])

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, Math.max(itemCount - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && filtered[highlight]) pick(filtered[highlight].value)
      else if (open && showCreate && highlight >= filtered.length) pick(q)
      else if (allowCustom && q) {
        commitCustom()
        setOpen(false)
        setQuery('')
      } else setOpen(true)
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
            if (!allowCustom && value) onChange('')
          }}
          onFocus={() => {
            setQuery(allowCustom ? (selected?.label ?? value ?? '') : '')
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && !disabled ? (
        <ul id={listId} className="combobox__list" role="listbox">
          {filtered.length === 0 && !showCreate ? (
            <li className="combobox__empty">{emptyLabel}</li>
          ) : (
            <>
              {filtered.map((opt, i) => (
                <li key={opt.value} role="option" aria-selected={opt.value === value}>
                  <button
                    type="button"
                    className={`combobox__option${i === highlight ? ' combobox__option--active' : ''}${
                      opt.value === value ? ' combobox__option--selected' : ''
                    }${opt.muted ? ' combobox__option--muted' : ''}`}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pick(opt.value)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
              {showCreate ? (
                <li role="option" aria-selected={false}>
                  <button
                    type="button"
                    className={`combobox__option${highlight >= filtered.length ? ' combobox__option--active' : ''}`}
                    onMouseEnter={() => setHighlight(filtered.length)}
                    onClick={() => pick(q)}
                  >
                    Usar «{q}»
                  </button>
                </li>
              ) : null}
            </>
          )}
        </ul>
      ) : null}
    </div>
  )
}
