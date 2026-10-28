import { BloqueaNotasBadge } from '#/components/pagos/BloqueaNotasBadge'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { etiquetaRegla, resumenReglas } from '#/helpers/tipos-pago'
import type { OpcionesDestino } from '#/helpers/tipos-pago'
import type { TipoPagoDetalle } from '#/services/pagos-tipos'

const money = (v: number) =>
  new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(v)

/** Vista de solo lectura de un tipo de pago del periodo. */
export function TipoPagoVerModal({
  tipo,
  opciones,
  onClose,
}: {
  tipo: TipoPagoDetalle
  opciones?: OpcionesDestino
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  return (
    <Modal
      open={open}
      title={`${tipo.nombre} · ${tipo.es_fijo ? 'fijo' : 'adicional'}`}
      onClose={dismiss}
      wide
      testId="tipo-pago-ver-modal"
      footer={
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          Cerrar
        </button>
      }
    >
      <div data-testid="tipo-pago-ver">
        <dl className="ficha__grid">
          <div>
            <dt className="field__label">Nombre</dt>
            <dd>{tipo.nombre}</dd>
          </div>
          <div>
            <dt className="field__label">Clase</dt>
            <dd>{tipo.es_fijo ? 'Fijo' : 'Adicional'}</dd>
          </div>
          <div>
            <dt className="field__label">Periodicidad</dt>
            <dd>{tipo.es_periodico ? 'Periódico' : 'Único'}</dd>
          </div>
          <div>
            <dt className="field__label">Monto</dt>
            <dd>{tipo.es_fijo ? 'Se define por grado' : money(tipo.monto ?? 0)}</dd>
          </div>
          {tipo.fecha_vencimiento ? (
            <div>
              <dt className="field__label">Vence</dt>
              <dd>{tipo.fecha_vencimiento}</dd>
            </div>
          ) : null}
          <div>
            <dt className="field__label">Bloquea notas</dt>
            <dd>
              <BloqueaNotasBadge bloquea={tipo.bloquea_notas} />
            </dd>
          </div>
          <div>
            <dt className="field__label">Obligaciones</dt>
            <dd>
              {tipo.resumen.obligaciones} · {tipo.resumen.pendientes} pendientes ·{' '}
              {tipo.resumen.mora} en mora · {tipo.resumen.pagadas} pagadas
            </dd>
          </div>
          <div>
            <dt className="field__label">Pendiente de cobro</dt>
            <dd>{money(tipo.resumen.monto_pendiente)}</dd>
          </div>
          {tipo.descripcion ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <dt className="field__label">Descripción</dt>
              <dd>{tipo.descripcion}</dd>
            </div>
          ) : null}
        </dl>

        <section className="expediente__seccion">
          <h3 className="expediente__titulo">Destinos</h3>
          <p className="texto-muted ficha-form__nota" style={{ marginTop: 0 }}>
            {resumenReglas(tipo.reglas)}
          </p>
          {tipo.reglas.length > 0 ? (
            <ul className="liberacion__meses-lista">
              {tipo.reglas.map((r, i) => (
                <li key={r.id ?? i}>
                  {opciones ? etiquetaRegla(r, opciones) : `Regla ${i + 1}`}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {tipo.montos_por_grado.length > 0 ? (
          <section className="expediente__seccion">
            <h3 className="expediente__titulo">Montos por grado</h3>
            <ul className="liberacion__meses-lista">
              {tipo.montos_por_grado.map((m) => (
                <li key={m.grado_id}>
                  {m.grado_nombre}:{' '}
                  {money(tipo.codigo === 'matricula' ? m.monto_matricula : m.monto)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Modal>
  )
}
