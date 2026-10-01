import { lempiras } from '#/lib/fechas-padre'
import type { DeudaCartera, EstadoPagoCartera } from '#/services/pagos'

const BADGE: Record<EstadoPagoCartera, string> = {
  al_dia: 'badge badge--ok',
  debe: 'badge badge--warn',
  mora: 'badge badge--danger',
}

export function etiquetaEstadoPago(d: DeudaCartera) {
  if (d.estado_pago === 'al_dia') return 'Al día'
  if (d.estado_pago === 'debe') return 'Debe 1 mes'
  return `En mora · ${d.meses_vencidos} meses`
}

/** Estado de pago de la cartera con el aviso de recibos por revisar. */
export function EstadoPago({ deuda }: { deuda: DeudaCartera }) {
  return (
    <span className="estado-pago">
      <span className={BADGE[deuda.estado_pago]}>{etiquetaEstadoPago(deuda)}</span>
      {deuda.recibos_sin_revisar > 0 ? (
        <span className="estado-pago__recibo" title="Recibos enviados por el padre sin revisar">
          {deuda.recibos_sin_revisar === 1 ? '1 recibo por revisar' : `${deuda.recibos_sin_revisar} recibos por revisar`}
        </span>
      ) : null}
    </span>
  )
}

export function MontoVencido({ monto }: { monto: number }) {
  return monto > 0 ? (
    <strong className="monto-vencido">{lempiras(monto)}</strong>
  ) : (
    <span className="texto-muted">—</span>
  )
}
