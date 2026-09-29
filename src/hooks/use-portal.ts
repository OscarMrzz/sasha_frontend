import { useQuery } from '@tanstack/react-query'
import { useCan } from '#/components/gates/Can'
import { isPortalRole, isResponsableRole } from '#/lib/home-path'
import { usePortalAlumnoId, usePortalClase } from '#/lib/portal-context'
import { getPortalInicio } from '#/services/portal'

/**
 * Contexto del portal. `alumnoId` es el hijo elegido (solo responsable; el alumno usa su sesión).
 * `ready` es false si un responsable aún no eligió hijo.
 */
export function usePortal() {
  const { roles } = useCan()
  const portal = isPortalRole(roles)
  const responsable = isResponsableRole(roles)
  const storedAlumnoId = usePortalAlumnoId()
  const clase = usePortalClase()
  const alumnoId = responsable ? storedAlumnoId : null
  const ready = portal && (!responsable || Boolean(alumnoId))
  return { portal, responsable, alumnoId, clase, ready }
}

export function usePortalInicio() {
  const { alumnoId, ready } = usePortal()
  return useQuery({
    queryKey: ['portal-inicio', alumnoId ?? 'self'],
    queryFn: () => getPortalInicio(alumnoId),
    enabled: ready,
  })
}
