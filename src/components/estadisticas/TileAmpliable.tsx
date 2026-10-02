import { useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2 } from 'lucide-react'
import { Modal } from '#/components/ui/Modal'

/**
 * Tarjeta del bento con botón para verla en grande. `children(true)` se pinta dentro del modal.
 * Con `sinTitulo` la tarjeta no muestra el título; `titulo` sigue nombrando el botón y el modal.
 */
export function TileAmpliable({
  titulo,
  sinTitulo = false,
  icono,
  className,
  testId,
  nivel,
  children,
}: {
  titulo: string
  sinTitulo?: boolean
  icono?: ReactNode
  className: string
  testId?: string
  nivel?: string
  children: (grande: boolean) => ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <section
      className={`mdash__tile ${className}`}
      data-testid={testId}
      data-nivel={nivel}
    >
      <header className="analisis-tile__head">
        {sinTitulo ? (
          <span />
        ) : (
          <h3 className="mdash__tile-title">
            {icono}
            {icono ? ' ' : null}
            {titulo}
          </h3>
        )}
        <button
          type="button"
          className="analisis-tile__ampliar"
          onClick={() => setAbierto(true)}
          aria-label={`Ampliar ${titulo}`}
          title="Ampliar"
          data-testid={testId ? `${testId}-ampliar` : undefined}
        >
          <Maximize2 size={14} aria-hidden />
        </button>
      </header>
      {children(false)}
      {abierto
        ? createPortal(
            <Modal
              open={abierto}
              title={titulo}
              onClose={() => setAbierto(false)}
              board
              footer={
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setAbierto(false)}
                >
                  Cerrar
                </button>
              }
            >
              <div className={`analisis-tile__grande ${className}`}>
                {children(true)}
              </div>
            </Modal>,
            document.body,
          )
        : null}
    </section>
  )
}
