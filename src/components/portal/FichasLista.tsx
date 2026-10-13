import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { userMessageFromError } from '#/lib/api'
import { fechaLarga, ordinal } from '#/services/disciplina'
import { getFichasHijo } from '#/services/portal'
import type { PortalFicha } from '#/services/portal'

function rangoFechas(f: PortalFicha) {
  if (f.fecha_inicio && f.fecha_fin) return `Del ${fechaLarga(f.fecha_inicio)} al ${fechaLarga(f.fecha_fin)}`
  if (f.fecha_inicio) return `Desde ${fechaLarga(f.fecha_inicio)}`
  if (f.fecha_fin) return `Hasta ${fechaLarga(f.fecha_fin)}`
  return ''
}

function FichaCard({ f }: { f: PortalFicha }) {
  const rango = rangoFechas(f)
  return (
    <article className="ficha-disc" data-testid="ficha-disc">
      <header className="ficha-disc__head">
        <span className="ficha-disc__fecha">{fechaLarga(f.fecha)}</span>
        <span className={`nivel-badge${f.nivel > 1 ? ' nivel-badge--alto' : ''}`}>{ordinal(f.nivel)} nivel</span>
      </header>
      <h3 className="ficha-disc__titulo">{f.titulo}</h3>
      <p className="ficha-disc__castigo">
        <strong>Castigo:</strong> {f.castigo}
        {f.dias ? ` (${f.dias} ${f.dias === 1 ? 'día' : 'días'})` : ''}
      </p>
      {rango ? <p className="ficha-disc__meta">{rango}</p> : null}
      {f.descripcion ? <p className="ficha-disc__texto">{f.descripcion}</p> : null}
      {f.observaciones ? (
        <p className="ficha-disc__texto">
          <strong>Observaciones:</strong> {f.observaciones}
        </p>
      ) : null}
    </article>
  )
}

/** Fichas disciplinarias del alumno: por defecto solo el parcial actual; el resto se despliega. */
export function FichasLista({ alumnoId, esAlumno = false }: { alumnoId?: string | null; esAlumno?: boolean }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal-fichas', alumnoId ?? 'self'],
    queryFn: () => getFichasHijo(alumnoId),
  })
  const [mostrarAnteriores, setMostrarAnteriores] = useState(false)

  const { visibles, anteriores } = useMemo(() => {
    const fichas = data?.fichas ?? []
    const actual = data?.parcial_actual
    if (!actual) return { visibles: fichas, anteriores: [] as PortalFicha[] }
    return {
      visibles: fichas.filter((f) => f.parcial_id === actual.id),
      anteriores: fichas.filter((f) => f.parcial_id !== actual.id),
    }
  }, [data])

  if (isLoading) return <div className="empty-state">Cargando fichas…</div>
  if (isError) {
    return (
      <div className="empty-state" role="alert">
        {userMessageFromError(error)}
      </div>
    )
  }

  if ((data?.fichas.length ?? 0) === 0) {
    return (
      <div className="fichas-ok" data-testid="fichas-vacio">
        <ShieldCheck size={104} strokeWidth={1.3} aria-hidden className="fichas-ok__icono" />
        <h2 className="fichas-ok__titulo">¡Todo bien!</h2>
        <p className="fichas-ok__texto">
          {esAlumno
            ? 'No has recibido ninguna ficha disciplinaria.'
            : 'El alumno no ha recibido ninguna ficha disciplinaria.'}
        </p>
      </div>
    )
  }

  return (
    <div className="fichas-disc-lista" data-testid="fichas-lista">
      {data?.parcial_actual ? (
        <h2 className="fichas-disc__parcial" data-testid="fichas-parcial">
          {data.parcial_actual.nombre}
        </h2>
      ) : null}

      {visibles.length === 0 ? (
        <p className="texto-muted" data-testid="fichas-sin-parcial">
          Sin fichas en el parcial actual.
        </p>
      ) : (
        visibles.map((f) => <FichaCard key={f.id} f={f} />)
      )}

      {anteriores.length > 0 && !mostrarAnteriores ? (
        <button
          type="button"
          className="btn btn--ghost fichas-disc__mas"
          data-testid="fichas-mostrar-anteriores"
          onClick={() => setMostrarAnteriores(true)}
        >
          Mostrar fichas anteriores ({anteriores.length})
        </button>
      ) : null}

      {anteriores.length > 0 && mostrarAnteriores ? (
        <>
          <h2 className="fichas-disc__parcial">Fichas anteriores</h2>
          {anteriores.map((f) => (
            <FichaCard key={f.id} f={f} />
          ))}
          <button
            type="button"
            className="btn btn--ghost fichas-disc__mas"
            onClick={() => setMostrarAnteriores(false)}
          >
            Ocultar fichas anteriores
          </button>
        </>
      ) : null}
    </div>
  )
}
