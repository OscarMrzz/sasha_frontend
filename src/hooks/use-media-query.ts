import { useCallback, useSyncExternalStore } from 'react'

/**
 * Suscripción a `window.matchMedia` sin doble render. `getServerSnapshot` fija
 * `false`, así el primer render (SSR) es el de escritorio y se corrige al
 * hidratar: un solo DOM y sin `data-testid` duplicados.
 *
 * `getSnapshot` y `subscribe` solo corren en el cliente, por eso usan `window`
 * directamente.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])
  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Ancho del shell móvil (`style1.css`): teléfonos y tablets verticales. */
export const MOVIL_QUERY = '(max-width: 768px)'

/** `true` en teléfono/tablet (< 768px); `false` en el servidor y en escritorio. */
export function useEsMovil(): boolean {
  return useMediaQuery(MOVIL_QUERY)
}
