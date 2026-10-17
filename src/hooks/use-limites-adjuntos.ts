import { useQuery } from '@tanstack/react-query'
import {
  MAX_ADJUNTOS_TAREA_DEFAULT,
  MAX_PESO_ARCHIVO_MB_DEFAULT,
} from '#/helpers/adjuntos'
import { listPeriodos } from '#/services/catalogos'
import type { Periodo } from '#/services/catalogos'

/** Límites de adjuntos vigentes del periodo. */
export type LimitesAdjuntos = {
  /** Máximo de archivos por tarea. */
  maxArchivos: number
  /** Peso máximo por archivo, en MB. */
  maxPesoMB: number
  /** `true` cuando se resolvió el periodo (aunque sus valores caigan al default). */
  resuelto: boolean
}

/** Normaliza los límites de un periodo; un valor `< 1` cae al tope por defecto. */
export function limitesDePeriodo(periodo: Periodo | undefined): LimitesAdjuntos {
  const maxArchivos =
    periodo && periodo.max_archivos_tarea >= 1
      ? periodo.max_archivos_tarea
      : MAX_ADJUNTOS_TAREA_DEFAULT
  const maxPesoMB =
    periodo && periodo.max_peso_archivo_mb >= 1
      ? periodo.max_peso_archivo_mb
      : MAX_PESO_ARCHIVO_MB_DEFAULT
  return { maxArchivos, maxPesoMB, resuelto: Boolean(periodo) }
}

/**
 * Límites de adjuntos del periodo de una tarea o de una clase.
 *
 * - Creación/edición: pásale `periodoAcademicoId` (el periodo de la clase).
 * - Detalle de una tarea ya guardada: pásale `parcialId`; el periodo se localiza
 *   por el parcial al que pertenece la tarea (la lista de periodos ya trae sus
 *   parciales).
 *
 * Si no se puede resolver (sin id, error de red o `403`), devuelve los topes por
 * defecto para no bloquear la UI. La config vive en `/catalogos/periodos`
 * (`catalogos:get`), que los roles de staff ya tienen.
 */
export function useLimitesAdjuntos({
  periodoAcademicoId,
  parcialId,
}: {
  periodoAcademicoId?: string | null
  parcialId?: string | null
}): LimitesAdjuntos {
  const habilitado = Boolean(periodoAcademicoId) || Boolean(parcialId)
  const { data } = useQuery({
    queryKey: ['periodos'],
    queryFn: listPeriodos,
    enabled: habilitado,
  })

  const periodo = (data ?? []).find((p) =>
    periodoAcademicoId
      ? p.id === periodoAcademicoId
      : p.parciales.some((par) => par.id === parcialId),
  )

  return limitesDePeriodo(periodo)
}
