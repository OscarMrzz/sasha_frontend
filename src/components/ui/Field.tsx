import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  error?: string
  children: ReactNode
  htmlFor?: string
}

export function Field({ label, error, children, htmlFor }: FieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <span className="field__error">{error}</span> : null}
    </div>
  )
}
