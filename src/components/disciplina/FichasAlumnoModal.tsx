import { useQuery } from '@tanstack/react-query'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { fechaLarga, listFichasAlumno } from '#/services/disciplina'
import type { AlumnoConFichas, FichaDisciplinaria } from '#/services/disciplina'

export function FichaCard({ f }: { f: FichaDisciplinaria }) {
  return (
    <article className="ficha-disc" data-testid="ficha-disc-card">
      <header className="ficha-disc__head">
        <div>
          <p className="ficha-disc__titulo">{f.titulo}</p>
          <p className="texto-muted ficha-disc__meta">
            {fechaLarga(f.fecha)}
            {f.parcial ? ` · ${f.parcial}` : ''}
            {f.registrado_por ? ` · registró ${f.registrado_por}` : ''}
          </p>
        </div>
        <span className="nivel-badge">Nivel {f.nivel}</span>
      </header>
      <p className="ficha-disc__castigo">{f.castigo}</p>
      {f.dias ? (
        <p className="ficha-disc__rango">
          {f.dias} día{f.dias === 1 ? '' : 's'} · del {fechaLarga(f.fecha_inicio)} al {fechaLarga(f.fecha_fin)}
        </p>
      ) : null}
      {f.observaciones ? <p className="texto-muted ficha-disc__obs">{f.observaciones}</p> : null}
    </article>
  )
}

export function FichasAlumnoModal({ alumno, onClose }: { alumno: AlumnoConFichas; onClose: () => void }) {
  const { open, dismiss } = useDismiss(onClose)
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['disciplina-fichas', alumno.codigo],
    queryFn: () => listFichasAlumno(alumno.codigo),
  })

  return (
    <Modal
      open={open}
      wide
      title={`Fichas · ${alumno.nombre}`}
      onClose={dismiss}
      footer={
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          Cerrar
        </button>
      }
    >
      <div className="expediente" data-testid="fichas-alumno-modal">
        <div className="expediente__cifras">
          <div className="expediente__cifra">
            <span className="expediente__cifra-valor">{alumno.total_parcial}</span>
            <span className="expediente__cifra-label">En este parcial</span>
          </div>
          <div className="expediente__cifra">
            <span className="expediente__cifra-valor">{alumno.total_periodo}</span>
            <span className="expediente__cifra-label">En el periodo</span>
          </div>
          <div className="expediente__cifra">
            <span className="expediente__cifra-valor">
              {alumno.sancionado_hasta ? fechaLarga(alumno.sancionado_hasta) : '—'}
            </span>
            <span className="expediente__cifra-label">Sancionado hasta</span>
          </div>
        </div>
        {isLoading ? <p className="texto-muted">Cargando fichas…</p> : null}
        {error ? (
          <p className="texto-muted" role="alert">
            No se pudieron cargar las fichas: {userMessageFromError(error)}
          </p>
        ) : null}
        <div className="ficha-disc__lista">
          {data.map((f) => (
            <FichaCard key={f.id} f={f} />
          ))}
        </div>
        {!isLoading && !error && data.length === 0 ? <p className="texto-muted">Sin fichas.</p> : null}
        {data.length ? (
          <p className="texto-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
            {data.length} ficha{data.length === 1 ? '' : 's'} en total · la más reciente primero
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
