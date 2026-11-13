import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { CreditCard, RefreshCw } from 'lucide-react'
import { useCan } from '#/components/gates/Can'
import { RegistrarPagoModal } from '#/components/pagos/RegistrarPagoModal'
import {
  ValidarReciboModal,
  VerReciboModal,
} from '#/components/pagos/ReciboModales'
import { DataTable } from '#/components/ui/DataTable'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { lempiras } from '#/lib/fechas-padre'
import { listMensualidades, listRecibos } from '#/services/pagos'
import type { Recibo } from '#/services/pagos'

const col = createColumnHelper<Recibo>()

export function ExamenPagosButton({ onSaved }: { onSaved?: () => void }) {
  const { roles, can } = useCan()
  const admin = roles.includes('admin')
  const puedeRevisar = admin && can('pagos:put')
  const puedeRegistrar = admin && can('pagos:post') && can('pagos:get')
  const [pantalla, setPantalla] = useState<
    'opciones' | 'recibos' | 'registrar' | null
  >(null)
  const [ver, setVer] = useState<Recibo | null>(null)
  const [validar, setValidar] = useState<Recibo | null>(null)
  const recibos = useQuery({
    queryKey: ['recibos', 'sin_revisar'],
    queryFn: () => listRecibos('sin_revisar'),
    enabled: puedeRevisar,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })
  const pagos = useQuery({
    queryKey: ['mensualidades'],
    queryFn: () => listMensualidades(),
    enabled: pantalla === 'registrar' && puedeRegistrar,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  if (!admin || (!puedeRevisar && !puedeRegistrar)) return null
  const acciones = (r: Recibo) => [
    { label: 'Ver', onClick: () => setVer(r) },
    { label: 'Revisar', onClick: () => setValidar(r) },
  ]
  const columns = [
    col.accessor((r) => `${r.alumno_nombre} ${r.alumno_codigo}`, {
      id: 'alumno',
      header: 'Alumno',
    }),
    col.accessor('responsable_nombre', { header: 'Responsable' }),
    col.accessor('etiqueta', { header: 'Concepto' }),
    col.accessor('monto', {
      header: 'Cantidad',
      cell: (i) => lempiras(i.getValue()),
    }),
    col.display({
      id: 'acciones',
      header: 'Acciones',
      cell: (i) => (
        <div className="maestro-examenes__acciones">
          {acciones(i.row.original).map((a) => (
            <button
              key={a.label}
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      ),
    }),
  ]
  return (
    <>
      <button
        type="button"
        className="btn btn--ghost examen-pagos__boton"
        data-testid="examen-pagos"
        onClick={() => {
          setPantalla('opciones')
          if (puedeRevisar) void recibos.refetch()
        }}
      >
        <CreditCard size={18} aria-hidden /> Pagos
        {puedeRevisar ? (
          <span
            className="examen-pagos__contador"
            aria-label={
              recibos.isError
                ? 'No se pudo consultar recibos pendientes'
                : `${recibos.data?.length ?? 0} recibos sin revisar`
            }
            data-testid="examen-pagos-contador"
          >
            {recibos.isLoading
              ? '…'
              : recibos.isError
                ? '!'
                : (recibos.data?.length ?? 0)}
          </span>
        ) : null}
      </button>
      <Modal
        open={pantalla === 'opciones'}
        title="Pagos"
        onClose={() => setPantalla(null)}
        testId="examen-pagos-opciones"
        footer={
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setPantalla(null)}
          >
            Cerrar
          </button>
        }
      >
        <div className="examen-pagos__opciones">
          {puedeRevisar ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setPantalla('recibos')}
              data-testid="examen-pagos-revisar"
            >
              Revisar recibo de pago
            </button>
          ) : null}
          {puedeRegistrar ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setPantalla('registrar')}
              data-testid="examen-pagos-registrar"
            >
              Registrar pago
            </button>
          ) : null}
        </div>
      </Modal>
      <Modal
        open={pantalla === 'recibos' && !ver && !validar}
        title="Recibos sin revisar"
        onClose={() => setPantalla(null)}
        xl
        testId="examen-recibos-pendientes"
        footer={
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setPantalla(null)}
          >
            Cerrar
          </button>
        }
      >
        {recibos.isError ? (
          <p role="alert">{userMessageFromError(recibos.error)}</p>
        ) : null}
        {recibos.isLoading ? (
          <div className="empty-state">Cargando recibos…</div>
        ) : (
          <DataTable
            title="Recibos pendientes"
            data={recibos.data ?? []}
            columns={columns}
            canAdd={false}
            exportFilename="recibos-pendientes"
            exportRows={(recibos.data ?? []).map((r) => ({
              alumno: r.alumno_nombre,
              codigo: r.alumno_codigo,
              responsable: r.responsable_nombre,
              concepto: r.etiqueta,
              monto: r.monto,
            }))}
            toolbarExtra={
              <button
                type="button"
                className="btn btn--ghost"
                disabled={recibos.isFetching}
                onClick={() => void recibos.refetch()}
                data-testid="examen-recibos-actualizar"
              >
                <RefreshCw size={16} aria-hidden />
                Actualizar
              </button>
            }
            card={{
              title: (r) => r.alumno_nombre,
              fields: (r) => [
                { label: 'Código', value: r.alumno_codigo },
                { label: 'Responsable', value: r.responsable_nombre },
                { label: 'Concepto', value: r.etiqueta },
                { label: 'Cantidad', value: lempiras(r.monto) },
              ],
            }}
            rowActions={acciones}
            onRowDoubleClick={(r) => setValidar(r)}
          />
        )}
      </Modal>
      {pantalla === 'registrar' ? (
        pagos.isLoading ? (
          <Modal open title="Registrar pago" onClose={() => setPantalla(null)}>
            <div className="empty-state">Cargando pagos…</div>
          </Modal>
        ) : pagos.isError ? (
          <Modal open title="Registrar pago" onClose={() => setPantalla(null)}>
            <p role="alert">{userMessageFromError(pagos.error)}</p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void pagos.refetch()}
            >
              Reintentar
            </button>
          </Modal>
        ) : (
          <RegistrarPagoModal
            filas={pagos.data ?? []}
            onClose={() => setPantalla(null)}
            onSaved={onSaved}
          />
        )
      ) : null}
      {ver ? (
        <VerReciboModal recibo={ver} onClose={() => setVer(null)} />
      ) : null}
      {validar ? (
        <ValidarReciboModal
          recibo={validar}
          onClose={() => setValidar(null)}
          onSaved={onSaved}
        />
      ) : null}
    </>
  )
}
