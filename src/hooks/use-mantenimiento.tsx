import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getEstadoMantenimiento,
  type EstadoMantenimiento,
} from '#/services/mantenimiento'

type MantenimientoContextValue = {
  /** Atajo de `estado?.activo`. */
  activo: boolean
  /** Último estado conocido; `null` mientras no se ha consultado todavía. */
  estado: EstadoMantenimiento | null
  /** Fuerza una consulta inmediata de `GET /mantenimiento`. */
  refrescar: () => Promise<void>
}

const MantenimientoContext = createContext<MantenimientoContextValue>({
  activo: false,
  estado: null,
  refrescar: async () => {},
})

/** Sondeo del estado de mantenimiento (~15 s) para reaccionar sin tráfico. */
const POLL_MS = 15_000

export function MantenimientoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoMantenimiento | null>(null)

  const refrescar = useCallback(async () => {
    try {
      const next = await getEstadoMantenimiento()
      setEstado(next)
    } catch {
      // Backend caído o sin red: se conserva el último estado conocido para no
      // romper la app; el próximo ciclo vuelve a intentarlo.
    }
  }, [])

  useEffect(() => {
    // No arrancar el sondeo en SSR.
    if (typeof window === 'undefined') return
    void refrescar()
    const id = window.setInterval(() => void refrescar(), POLL_MS)
    return () => window.clearInterval(id)
  }, [refrescar])

  const value = useMemo(
    () => ({ activo: estado?.activo ?? false, estado, refrescar }),
    [estado, refrescar],
  )

  return <MantenimientoContext.Provider value={value}>{children}</MantenimientoContext.Provider>
}

export function useMantenimiento() {
  return useContext(MantenimientoContext)
}
