import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

const MIN = 1
const MAX = 6
const STEP = 0.75

function acotar(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

type Punto = { x: number; y: number }

// Bloqueo del scroll mientras el visor está abierto (suma/resta segura).
let scrollLock = 0
let prevOverflow = ''
function lockScroll() {
  if (typeof document === 'undefined') return
  scrollLock += 1
  if (scrollLock !== 1) return
  prevOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}
function unlockScroll() {
  if (typeof document === 'undefined') return
  scrollLock = Math.max(0, scrollLock - 1)
  if (scrollLock !== 0) return
  document.body.style.overflow = prevOverflow
}

/**
 * Visor de imágenes a pantalla completa con zoom (pinch/rueda/botones) y
 * arrastre táctil. Pensado para teléfono: sin clic derecho, sin degradados.
 */
export function VisorImagen({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  const [escala, setEscala] = useState(1)
  const [pos, setPos] = useState<Punto>({ x: 0, y: 0 })
  const punteros = useRef(new Map<number, Punto>())
  const pinza = useRef<{ dist: number; escala: number; medio: Punto } | null>(null)
  const arrastre = useRef<{ x: number; y: number; pos: Punto } | null>(null)

  useEffect(() => {
    // El visor se abre sobre el modal de detalle. Con la fase de captura y
    // `stopPropagation`, el Escape cierra solo el visor y no el modal de debajo.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    lockScroll()
    return () => {
      window.removeEventListener('keydown', onKey, true)
      unlockScroll()
    }
  }, [onClose])

  const aplicarEscala = useCallback((nueva: number, centro?: Punto) => {
    const valor = acotar(nueva, MIN, MAX)
    setEscala(valor)
    setPos((p) => {
      if (valor <= 1) return { x: 0, y: 0 }
      if (!centro) return p
      // Mantiene el punto central del gesto bajo el dedo/puntero.
      const dx = centro.x - window.innerWidth / 2
      const dy = centro.y - window.innerHeight / 2
      const factor = valor / escala
      return { x: p.x - dx * (factor - 1), y: p.y - dy * (factor - 1) }
    })
  }, [escala])

  const onPointerDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (punteros.current.size === 1) {
      arrastre.current = { x: e.clientX, y: e.clientY, pos }
      pinza.current = null
    } else if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()]
      pinza.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        escala,
        medio: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
      arrastre.current = null
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!punteros.current.has(e.pointerId)) return
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (punteros.current.size >= 2 && pinza.current) {
      const [a, b] = [...punteros.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const factor = pinza.current.dist > 0 ? dist / pinza.current.dist : 1
      aplicarEscala(pinza.current.escala * factor, {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      })
      return
    }

    if (arrastre.current && escala > 1) {
      const dx = e.clientX - arrastre.current.x
      const dy = e.clientY - arrastre.current.y
      setPos({ x: arrastre.current.pos.x + dx, y: arrastre.current.pos.y + dy })
    }
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    punteros.current.delete(e.pointerId)
    if (punteros.current.size < 2) pinza.current = null
    if (punteros.current.size === 0) arrastre.current = null
    else if (punteros.current.size === 1) {
      const [p] = [...punteros.current.values()]
      arrastre.current = { x: p.x, y: p.y, pos }
    }
  }

  const cerrar = (e: ReactMouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="visor-imagen"
      role="dialog"
      aria-modal="true"
      aria-label={`Imagen: ${alt}`}
      data-testid="visor-imagen"
      data-scale={escala.toFixed(2)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="visor-imagen__lienzo"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseDown={cerrar}
      >
        <img
          className="visor-imagen__img"
          src={src}
          alt={alt}
          draggable={false}
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${escala})` }}
        />
      </div>

      <div className="visor-imagen__barra">
        <button
          type="button"
          className="visor-imagen__btn"
          data-testid="visor-zoom-out"
          aria-label="Alejar"
          onClick={() => aplicarEscala(escala - STEP)}
        >
          <ZoomOut size={22} aria-hidden />
        </button>
        <button
          type="button"
          className="visor-imagen__btn"
          data-testid="visor-zoom-in"
          aria-label="Acercar"
          onClick={() => aplicarEscala(escala + STEP)}
        >
          <ZoomIn size={22} aria-hidden />
        </button>
        <button
          type="button"
          className="visor-imagen__btn visor-imagen__btn--cerrar"
          data-testid="visor-cerrar"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X size={22} aria-hidden />
        </button>
      </div>
    </div>
  )
}
