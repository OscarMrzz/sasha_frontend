import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import { NavIcon } from '#/components/layout/nav-icons'
import { buscarComandos } from '#/helpers/command-palette'
import type { Comando } from '#/helpers/command-palette'

export function CommandPalette({
  open,
  onClose,
  comandos,
  atajo,
}: {
  open: boolean
  onClose: () => void
  comandos: Comando[]
  atajo: string
}) {
  const [consulta, setConsulta] = useState('')
  const [indice, setIndice] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const resultados = useMemo(() => buscarComandos(comandos, consulta), [comandos, consulta])
  const total = resultados.length

  useEffect(() => {
    if (!open) return
    setConsulta('')
    setIndice(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    setIndice(0)
  }, [consulta])

  if (!open) return null

  const ejecutar = (comando?: Comando) => {
    const elegido = comando ?? (total ? resultados[indice] : undefined)
    if (!elegido) return
    onClose()
    elegido.ejecutar()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndice((i) => (total ? (i + 1) % total : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndice((i) => (total ? (i - 1 + total) % total : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      ejecutar()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="cmdk-backdrop"
      role="presentation"
      data-testid="cmdk-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Buscador de comandos">
        <div className="cmdk__head">
          <Search size={16} className="cmdk__icon" aria-hidden />
          <input
            ref={inputRef}
            className="cmdk__input"
            type="text"
            placeholder="Buscar…"
            aria-label="Buscar comandos"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={onKeyDown}
            data-testid="cmdk-input"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cmdk__kbd">{atajo}</kbd>
        </div>

        <ul className="cmdk__list" role="listbox" aria-label="Comandos">
          {total === 0 ? (
            <li className="cmdk__empty">Sin resultados</li>
          ) : (
            resultados.map((comando, i) => {
              const nuevoGrupo = i === 0 || resultados[i - 1].grupo !== comando.grupo
              return (
                <Fragment key={comando.id}>
                  {nuevoGrupo ? (
                    <li className="cmdk__group" role="presentation">
                      {comando.grupo}
                    </li>
                  ) : null}
                  <li role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === indice}
                      className={`cmdk__item${i === indice ? ' cmdk__item--active' : ''}`}
                      data-testid={`cmdk-item-${comando.id}`}
                      onMouseMove={() => setIndice(i)}
                      onClick={() => ejecutar(comando)}
                    >
                      <NavIcon name={comando.icono} className="cmdk__item-icon" />
                      <span className="cmdk__item-text">
                        <span className="cmdk__item-title">{comando.titulo}</span>
                        <span className="cmdk__item-desc">{comando.descripcion}</span>
                      </span>
                    </button>
                  </li>
                </Fragment>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
