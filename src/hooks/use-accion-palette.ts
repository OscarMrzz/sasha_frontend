import { useEffect, useRef } from 'react'
import { alRecibirAccion, consumirAccion } from '#/lib/accion-palette'

/**
 * Ejecuta `handler` cuando el buscador de comandos pide abrir el modal de creación
 * de esta página (por navegación —sessionStorage— o estando ya en ella —evento—).
 */
export function useAccionPalette(id: string, handler: () => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (consumirAccion(id)) handlerRef.current()
    return alRecibirAccion(id, () => handlerRef.current())
  }, [id])
}
