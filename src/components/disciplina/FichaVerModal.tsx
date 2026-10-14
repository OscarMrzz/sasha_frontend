import type { ReactNode } from 'react'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { fechaLarga } from '#/services/disciplina'
import type { FichaFila } from '#/services/disciplina'

function Seccion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="expediente__seccion">
      <h3 className="expediente__titulo">{title}</h3>
      {children}
    </section>
  )
}

export function FichaVerModal({ ficha, onClose }: { ficha: FichaFila; onClose: () => void }) {
  const { open, dismiss } = useDismiss(onClose)

  return (
    <Modal
      open={open}
      wide
      title={`Ficha · ${ficha.alumno_nombre}`}
      onClose={dismiss}
      footer={
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          Cerrar
        </button>
      }
    >
      <div className="expediente" data-testid="ficha-ver-modal">
        <Seccion title="Alumno">
          <p style={{ margin: 0 }}>{ficha.alumno_nombre}</p>
          <p className="texto-muted" style={{ margin: '0.25rem 0 0' }}>
            {ficha.alumno_codigo}
            {ficha.grado ? ` · ${ficha.grado} sec ${ficha.seccion} · ${ficha.modalidad}` : ''}
          </p>
        </Seccion>

        <Seccion title="Ficha">
          <div className="ficha-disc__head">
            <div>
              <p style={{ margin: 0 }}>{ficha.titulo}</p>
              {ficha.descripcion ? (
                <p className="texto-muted" style={{ margin: '0.25rem 0 0' }}>
                  {ficha.descripcion}
                </p>
              ) : null}
            </div>
            <span className="nivel-badge">Nivel {ficha.nivel}</span>
          </div>
          <p className="texto-muted ficha-form__nota">
            {fechaLarga(ficha.fecha)}
            {ficha.parcial ? ` · ${ficha.parcial}` : ''}
          </p>
        </Seccion>

        <Seccion title="Castigo">
          <p style={{ margin: 0 }}>{ficha.castigo}</p>
          {ficha.dias ? (
            <p className="texto-muted" style={{ margin: '0.25rem 0 0' }}>
              {ficha.dias} día{ficha.dias === 1 ? '' : 's'}
              {ficha.fecha_inicio && ficha.fecha_fin
                ? ` · del ${fechaLarga(ficha.fecha_inicio)} al ${fechaLarga(ficha.fecha_fin)}`
                : ''}
            </p>
          ) : null}
        </Seccion>

        <Seccion title="Observaciones">
          <p style={{ margin: 0 }}>
            {ficha.observaciones ? ficha.observaciones : <span className="texto-muted">Sin observaciones.</span>}
          </p>
        </Seccion>

        <Seccion title="Registro">
          <p style={{ margin: 0 }}>
            {ficha.registrado_por || <span className="texto-muted">—</span>}
            {ficha.registrado_por_codigo ? (
              <span className="texto-muted"> · {ficha.registrado_por_codigo}</span>
            ) : null}
          </p>
        </Seccion>
      </div>
    </Modal>
  )
}
