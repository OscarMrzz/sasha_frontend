import { Search } from 'lucide-react'
import type { CSSProperties, InputHTMLAttributes } from 'react'

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Por defecto «Buscar…» */
  placeholder?: string
  wrapperStyle?: CSSProperties
}

/** Input de búsqueda unificado: placeholder «Buscar…» + lupa a la derecha. */
export function SearchInput({
  className,
  style,
  wrapperStyle,
  placeholder = 'Buscar…',
  'aria-label': ariaLabel = 'Buscar',
  ...rest
}: SearchInputProps) {
  return (
    <div className={`search-input${className ? ` ${className}` : ''}`} style={wrapperStyle ?? style}>
      <input
        type="search"
        className="field__input search-input__field"
        placeholder={placeholder}
        aria-label={ariaLabel}
        {...rest}
      />
      <Search className="search-input__icon" aria-hidden size={16} strokeWidth={2} />
    </div>
  )
}
