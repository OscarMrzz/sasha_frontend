import { useQuery } from '@tanstack/react-query'
import { useBovedaImage } from '#/hooks/use-boveda-image'
import { useSession } from '#/hooks/use-session'
import { getMiFicha } from '#/services/personas'

/** Foto de perfil del usuario en sesión: la guardada en su perfil y, si aún no hay, la recién subida. */
export function useMiFoto() {
  const { session } = useSession()
  const ficha = useQuery({
    queryKey: ['mi-ficha'],
    queryFn: getMiFicha,
    enabled: Boolean(session),
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  return useBovedaImage(ficha.data?.perfil?.path_imagen || session?.fotoKey)
}
