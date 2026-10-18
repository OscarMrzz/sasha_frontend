import { z } from 'zod'
import { apiRequest } from '#/lib/api'

/** Estado del modo mantenimiento (`GET /mantenimiento`, público). */
export const estadoMantenimientoSchema = z.object({
  activo: z.boolean(),
  motivo: z.string().nullish().transform((v) => v ?? ''),
  mensaje: z.string().nullish().transform((v) => v ?? ''),
  desde: z.string().nullish().transform((v) => v ?? null),
})

export type EstadoMantenimiento = z.infer<typeof estadoMantenimientoSchema>

export interface MantenimientoInput {
  activo: boolean
  motivo?: string
  mensaje?: string
}

/**
 * Lee el estado del modo mantenimiento. Endpoint **público**: se consulta sin
 * sesión y sin `X-Active-Role` (lo usan la pantalla y el sondeo global).
 */
export async function getEstadoMantenimiento(): Promise<EstadoMantenimiento> {
  const data = await apiRequest<unknown>('/mantenimiento', { activeRoles: null })
  return estadoMantenimientoSchema.parse(data)
}

/**
 * Activa o desactiva el modo mantenimiento. Requiere sesión y permiso
 * `mantenimiento:put` (solo el rol `developer` lo tiene). Devuelve el estado
 * resultante.
 */
export async function setMantenimiento(input: MantenimientoInput): Promise<EstadoMantenimiento> {
  const data = await apiRequest<unknown>('/mantenimiento', {
    method: 'PUT',
    body: input,
  })
  return estadoMantenimientoSchema.parse(data)
}
