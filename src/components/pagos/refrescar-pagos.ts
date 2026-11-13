import type { QueryClient } from '@tanstack/react-query'

export function refrescarPagos(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['mensualidades'] })
  void qc.invalidateQueries({ queryKey: ['mensualidades-alumno'] })
  void qc.invalidateQueries({ queryKey: ['mora'] })
  void qc.invalidateQueries({ queryKey: ['recibos'] })
  void qc.invalidateQueries({ queryKey: ['liberacion-bloqueados'] })
}
