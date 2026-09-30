import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCan } from '#/components/gates/Can'
import { AvisoBanner } from '#/components/layout/AvisoBanner'
import { useBovedaImage } from '#/hooks/use-boveda-image'
import { isResponsableRole } from '#/lib/home-path'
import { writePortalAlumnoId } from '#/lib/portal-context'
import { listHijos } from '#/services/portal'
import type { PortalHijo } from '#/services/portal'

export const Route = createFileRoute('/_app/responsable/')({
  component: ResponsableHomePage,
})

function ResponsableHomePage() {
  const { roles } = useCan()
  const navigate = useNavigate()
  const responsable = isResponsableRole(roles)
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['portal-hijos'],
    queryFn: listHijos,
    enabled: responsable,
  })

  const elegir = (h: PortalHijo) => {
    writePortalAlumnoId(h.alumno_id)
    void navigate({ to: '/alumno' })
  }

  if (!responsable) {
    return (
      <div className="empty-state" role="alert">
        Esta pantalla es solo para responsables.
      </div>
    )
  }

  return (
    <div className="maestro-hub" data-testid="responsable-home">
      <AvisoBanner />

      {isLoading ? (
        <div className="empty-state">Cargando alumnos…</div>
      ) : isError ? (
        <div className="empty-state" data-testid="responsable-home-error">
          Hay problemas de conexión.
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state" data-testid="responsable-home-empty">
          No tienes alumnos a cargo registrados.
        </div>
      ) : (
        <div className="maestro-hub__cards" data-testid="responsable-hijos">
          {data.map((h) => (
            <HijoCard key={h.alumno_id} hijo={h} onClick={() => elegir(h)} />
          ))}
        </div>
      )}
    </div>
  )
}

function HijoCard({ hijo, onClick }: { hijo: PortalHijo; onClick: () => void }) {
  const foto = useBovedaImage(hijo.path_imagen)
  return (
    <button
      type="button"
      className="maestro-hub__card hijo-card"
      data-testid={`responsable-hijo-${hijo.user_code}`}
      onClick={onClick}
    >
      {foto ? (
        <img className="hijo-card__foto" src={foto} alt={`Foto de ${hijo.nombre}`} />
      ) : (
        <div className="hijo-card__foto hijo-card__foto--placeholder" aria-hidden="true">
          {hijo.nombre.slice(0, 1)}
        </div>
      )}
      <div className="hijo-card__datos">
        <h2 className="maestro-hub__card-title">{hijo.nombre}</h2>
        <p className="maestro-hub__card-meta">
          N.º de cuenta <strong>{hijo.user_code}</strong>
        </p>
        <p className="maestro-hub__card-meta texto-muted">
          {hijo.grado ? `${hijo.grado} · sec${hijo.seccion}` : 'Sin matrícula activa'}
        </p>
      </div>
    </button>
  )
}
