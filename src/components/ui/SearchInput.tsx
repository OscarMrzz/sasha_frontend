import { Search } from 'lucide-react'
import type { CSSProperties, InputHTMLAttributes } from 'react'

/** El placeholder siempre es «Buscar…» (REG-UI-11); no se acepta otro texto. */
type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'placeholder'> & {
  wrapperStyle?: CSSProperties
}

/** Input de búsqueda unificado: placeholder «Buscar…» + lupa a la derecha. */
export function SearchInput({
  className,
  style,
  wrapperStyle,
  'aria-label': ariaLabel = 'Buscar',
  ...rest
}: SearchInputProps) {
  return (
    <div className={`search-input${className ? ` ${className}` : ''}`} style={wrapperStyle ?? style}>
      <input
        type="search"
        className="field__input search-input__field"
        placeholder="Buscar…"
        aria-label={ariaLabel}
        {...rest}
      />
      <Search className="search-input__icon" aria-hidden size={16} strokeWidth={2} />
    </div>
  )
}
