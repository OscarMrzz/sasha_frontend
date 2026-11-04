import { MoreVertical } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export type RowAction = {
  label: string
  onClick: () => void
  /** Estilo destructivo (rojo) para acciones peligrosas. */
  danger?: boolean
  /** Reutiliza el `data-testid` de la acción equivalente del clic derecho. */
  testId?: string
}

/**
 * Botón de 3 puntos con el menú de acciones de una fila. Pensado para la vista
 * de cards en teléfono/tablet, donde el clic derecho no existe. Reutiliza las
 * clases del menú contextual (`.ctx-menu`) para verse igual que en escritorio.
 */
export function RowMenu({
  items,
  label = 'Acciones',
  testId,
}: {
  items: RowAction[]
  /** Texto para lectores de pantalla del botón. */
  label?: string
  testId?: string
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // El efecto que escucha punteros globales puede registrarse antes de que el
  // clic que abrió el menú termine de propagarse; sin esta guarda el menú se
  // cerraría en el acto.
  const abriendoRef = useRef(false)

  const cerrar = useCallback(() => setPos(null), [])

  useEffect(() => {
    if (!pos) return
    const onPointerDown = (e: PointerEvent) => {
      if (abriendoRef.current) return
      const target = e.target as Node
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setPos(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPos(null)
    }
    const onScroll = () => setPos(null)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [pos])

  if (items.length === 0) return null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="row-menu__btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={pos !== null}
        data-testid={testId}
        onClick={(e) => {
          e.stopPropagation()
          if (pos) {
            cerrar()
            return
          }
          const r = e.currentTarget.getBoundingClientRect()
          abriendoRef.current = true
          window.setTimeout(() => {
            abriendoRef.current = false
          }, 0)
          // El menú se alinea a la derecha del botón (translateX -100%). Lo
          // mantenemos dentro del viewport y lo volteamos hacia arriba si no
          // cabe debajo.
          const ancho = 180
          const alto = items.length * 34 + 14
          const x = Math.max(ancho + 8, Math.min(r.right, window.innerWidth - 8))
          let y = r.bottom + 4
          if (y + alto > window.innerHeight - 8) {
            y = Math.max(8, r.top - alto - 4)
          }
          setPos({ x, y })
        }}
      >
        <MoreVertical size={18} aria-hidden />
      </button>

      {pos ? (
        <div
          ref={menuRef}
          className="ctx-menu ctx-menu--left"
          style={{ left: pos.x, top: pos.y }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`ctx-menu__item${item.danger ? ' ctx-menu__item--danger' : ''}`}
              data-testid={item.testId}
              onClick={() => {
                cerrar()
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}
