import { useQuery } from '@tanstack/react-query'
import { useCan } from '#/components/gates/Can'
import { misCoordinaciones } from '#/services/coordinaciones'

/** Bloque «Coordinas»: solo para el rol coordinador, con sus coordinaciones activas. */
export function CoordinasAviso({ className = 'perfil-bloque' }: { className?: string }) {
  const { roles } = useCan()
  const esCoordinador = roles.includes('coordinador')
  const { data = [], isPending } = useQuery({
    queryKey: ['coordinaciones-mias'],
    queryFn: misCoordinaciones,
    enabled: esCoordinador,
  })
  if (!esCoordinador || isPending) return null

  return (
    <section className={className} data-testid="coordinas-aviso">
      <h2 className="perfil-bloque__titulo">Coordinas</h2>
      {data.length === 0 ? (
        <p className="texto-muted" style={{ margin: 0 }}>
          Aún no tienes coordinaciones asignadas. Pide al administrador que te asigne una.
        </p>
      ) : (
        <ul className="perfil-etiquetas">
          {data.map((c) => (
            <li key={c.id} className="perfil-etiqueta" title={c.descripcion || undefined}>
              {c.titulo} · {c.clases} {c.clases === 1 ? 'clase' : 'clases'}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
