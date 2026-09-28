import { useCallback, useEffect, useId, useRef, useState  } from 'react'
import type {ReactNode} from 'react';

const EXIT_MS = 280

function exitDuration() {
  if (typeof window === 'undefined') return EXIT_MS
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_MS
}

/** Retrasa el cierre del padre para que el modal alcance a encogerse. */
export function useDismiss(onClose: () => void) {
  const [open, setOpen] = useState(true)
  const onCloseRef = useRef(onClose)
  const timerRef = useRef<number | null>(null)
  const startedRef = useRef(false)
  onCloseRef.current = onClose

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const dismiss = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    setOpen(false)
    timerRef.current = window.setTimeout(() => {
      onCloseRef.current()
    }, exitDuration())
  }, [])

  return { open, dismiss }
}

type ModalProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
  wide?: boolean
  /** Modal más alto/ancho para wizards */
  xl?: boolean
  /** ~90% viewport — tablero de horarios */
  board?: boolean
}

export function Modal({ open, title, children, onClose, footer, wide, xl, board }: ModalProps) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const [present, setPresent] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setPresent(true)
      setClosing(false)
      return
    }
    if (!present) return
    setClosing(true)
    const timer = window.setTimeout(() => {
      setPresent(false)
      setClosing(false)
    }, exitDuration())
    return () => window.clearTimeout(timer)
  }, [open, present])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!present) return null

  const sizeClass = board ? ' modal--board' : xl ? ' modal--xl' : wide ? ' modal--wide' : ''

  return (
    <div
      className={`modal-backdrop${closing ? ' modal-backdrop--closing' : ''}`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        className={`modal${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>
  )
}
