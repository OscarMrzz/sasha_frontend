import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { RequirePermission } from '#/components/gates/Can'
import { SaceContenido, SaceDescargas, useSaceSeleccion } from '#/components/sace/SaceMaestroModal'
import { getMiDocumentoSace } from '#/services/sace'

export const Route = createFileRoute('/_app/maestro/sace')({
  component: () => (
    <RequirePermission permission="mi_sace:get">
      <MiSacePage />
    </RequirePermission>
  ),
})

function MiSacePage() {
  const { data: doc, isLoading, isError } = useQuery({ queryKey: ['sace-mio'], queryFn: getMiDocumentoSace })
  const s = useSaceSeleccion(doc)

  return (
    <div className="mi-sace" data-testid="mi-sace-page">
      <header className="mi-sace__header">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Mi SACE
          </h1>
          <p className="texto-muted" style={{ margin: '0.35rem 0 0' }}>
            Inasistencias y nota total de tus clases para pasarlas al SACE.
          </p>
        </div>
        <div className="mi-sace__acciones">
          {doc && s.clase ? <SaceDescargas doc={doc} clase={s.clase} /> : null}
        </div>
      </header>

      {isLoading ? (
        <div className="empty-state">Cargando documento…</div>
      ) : isError ? (
        <div className="empty-state">Hay problemas de conexión.</div>
      ) : !doc || s.clases.length === 0 ? (
        <div className="empty-state">No tienes clases en el periodo activo.</div>
      ) : (
        <SaceContenido doc={doc} s={s} />
      )}
    </div>
  )
}
