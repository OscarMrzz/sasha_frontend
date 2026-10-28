import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MesesCobro } from '#/components/pagos/MesesCobro'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { SegmentedToggle } from '#/components/ui/SegmentedToggle'
import { claveMes } from '#/helpers/configuracion-pagos'
import { userMessageFromError } from '#/lib/api'
import {
  getConfiguracionPagos,
  updateConfiguracionPagos,
} from '#/services/pagos-config'
import { actualizarTipoPago } from '#/services/pagos-tipos'
import type {
  MesesCobroConfig,
  ModoDesglose,
  TipoPagoDetalle,
} from '#/services/pagos-tipos'

type Props = {
  periodoId: string
  tipo: TipoPagoDetalle
  meses: MesesCobroConfig
  onClose: () => void
  onSaved: () => void
}

const MODOS: [
  { value: ModoDesglose; label: string },
  { value: ModoDesglose; label: string },
] = [
  { value: 'general', label: 'General' },
  { value: 'por_grado', label: 'Por grado' },
]

const num = (v: string) => Number(v.replace(',', '.'))

/**
 * Edición de un tipo fijo. El monto y (en la mensualidad) los meses pueden ser
 * generales o por grado; el nombre y la periodicidad no se tocan.
 */
export function TipoPagoFijoModal({ periodoId, tipo, meses, onClose, onSaved }: Props) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const esMensualidad = tipo.codigo === 'mensualidad'

  const [bloquea, setBloquea] = useState(tipo.bloquea_notas)
  const [desglose, setDesglose] = useState<ModoDesglose>(tipo.desglose)
  const [montoGeneral, setMontoGeneral] = useState(String(tipo.monto ?? 0))
  const [mesesModo, setMesesModo] = useState<ModoDesglose>(
    esMensualidad ? tipo.meses_modo : 'general',
  )
  const [seleccion, setSeleccion] = useState<string[]>(meses.seleccionados.map(claveMes))
  const [montos, setMontos] = useState<Record<string, string>>({})
  const [mesesGrado, setMesesGrado] = useState<Record<string, string[]>>({})
  const [retroactivo, setRetroactivo] = useState(false)

  const configQuery = useQuery({
    queryKey: ['pagos-config', periodoId],
    queryFn: () => getConfiguracionPagos(periodoId),
    enabled: open && Boolean(periodoId),
    retry: false,
  })

  useEffect(() => {
    if (!configQuery.data) return
    const inicialMontos: Record<string, string> = {}
    const inicialMeses: Record<string, string[]> = {}
    const porGrado = new Map(tipo.meses_por_grado.map((m) => [m.grado_id, m.meses.map(claveMes)]))
    const generales = meses.seleccionados.map(claveMes)
    for (const g of configQuery.data.grados) {
      inicialMontos[g.grado_id] = String(esMensualidad ? g.monto : g.monto_matricula)
      inicialMeses[g.grado_id] = porGrado.get(g.grado_id) ?? generales
    }
    setMontos(inicialMontos)
    setMesesGrado(inicialMeses)
  }, [configQuery.data, esMensualidad, meses.seleccionados, tipo.meses_por_grado])

  const grados = configQuery.data?.grados ?? []
  const porGradoVisible = desglose === 'por_grado' || (esMensualidad && mesesModo === 'por_grado')
  const montoInvalido = grados.some((g) => {
    if (desglose !== 'por_grado') return false
    const v = num(montos[g.grado_id] ?? '')
    return !Number.isFinite(v) || v < 0
  })
  const generalInvalido = desglose === 'general' && (!Number.isFinite(num(montoGeneral)) || num(montoGeneral) < 0)
  const sinMeses = esMensualidad && mesesModo === 'general' && seleccion.length === 0

  const mesesPayload = useMemo(
    () => (esMensualidad && mesesModo === 'por_grado'
      ? grados.map((g) => ({
          grado_id: g.grado_id,
          meses: (mesesGrado[g.grado_id] ?? []).map((clave) => {
            const [anio, mes] = clave.split('-').map(Number)
            return { anio, mes }
          }),
        }))
      : undefined),
    [esMensualidad, mesesModo, grados, mesesGrado],
  )

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!configQuery.data) throw new Error('No se pudo cargar la configuración del periodo.')
      if (sinMeses) throw new Error('Marca al menos un mes.')
      await updateConfiguracionPagos(periodoId, {
        dia_pago: configQuery.data.dia_pago,
        retroactivo,
        grados: configQuery.data.grados.map((g) => ({
          grado_id: g.grado_id,
          monto: esMensualidad && desglose === 'por_grado' ? num(montos[g.grado_id] ?? '0') : g.monto,
          monto_matricula:
            esMensualidad
              ? g.monto_matricula
              : desglose === 'por_grado'
                ? num(montos[g.grado_id] ?? '0')
                : g.monto_matricula,
          reglas_mora: g.reglas_mora,
        })),
        ...(esMensualidad && mesesModo === 'general'
          ? {
              meses_modo: 'manual' as const,
              meses: seleccion.map((clave) => {
                const [anio, mes] = clave.split('-').map(Number)
                return { anio, mes }
              }),
            }
          : {}),
      })
      return actualizarTipoPago(periodoId, tipo.id, {
        bloquea_notas: bloquea,
        desglose,
        monto: desglose === 'general' ? num(montoGeneral) : undefined,
        meses_modo: esMensualidad ? mesesModo : undefined,
        meses_por_grado: mesesPayload,
        retroactivo,
      })
    },
    onSuccess: () => {
      toast.success(esMensualidad ? 'Mensualidad actualizada' : 'Matrícula actualizada')
      void qc.invalidateQueries({ queryKey: ['pagos-tipos', periodoId] })
      void qc.invalidateQueries({ queryKey: ['pagos-config', periodoId] })
      onSaved()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  return (
    <Modal
      open={open}
      xl
      title={esMensualidad ? 'Editar mensualidad' : 'Editar matrícula'}
      onClose={dismiss}
      testId="tipo-pago-fijo-modal"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="tipo-pago-fijo-guardar"
            disabled={
              saveMut.isPending ||
              sinMeses ||
              montoInvalido ||
              generalInvalido ||
              configQuery.isLoading ||
              configQuery.isError
            }
            onClick={() => saveMut.mutate()}
          >
            Guardar
          </button>
        </>
      }
    >
      <div className="ficha-form" data-testid="tipo-pago-fijo-form">
        <section className="expediente__seccion">
          <h3 className="expediente__titulo">Monto</h3>
          <SegmentedToggle
            value={desglose}
            options={MODOS}
            onChange={setDesglose}
            disabled={saveMut.isPending}
            testId="tipo-pago-fijo-monto-modo"
            ariaLabel="Modo del monto"
          />
          {desglose === 'general' ? (
            <Field label="Monto para todos los grados (L)" htmlFor="tipo-pago-fijo-monto-general">
              <input
                id="tipo-pago-fijo-monto-general"
                type="number"
                min={0}
                className="field__input"
                data-testid="tipo-pago-fijo-monto-general"
                value={montoGeneral}
                disabled={saveMut.isPending}
                onChange={(e) => setMontoGeneral(e.target.value)}
              />
            </Field>
          ) : (
            <p className="texto-muted ficha-form__nota" style={{ marginBottom: 0 }}>
              Los montos por grado se editan abajo, en la tarjeta de cada grado.
            </p>
          )}
        </section>

        {esMensualidad ? (
          <section className="expediente__seccion">
            <h3 className="expediente__titulo">Meses</h3>
            <SegmentedToggle
              value={mesesModo}
              options={MODOS}
              onChange={setMesesModo}
              disabled={saveMut.isPending}
              testId="tipo-pago-fijo-meses-modo"
              ariaLabel="Modo de los meses"
            />
            {mesesModo === 'general' ? (
              <>
                <MesesCobro
                  opciones={meses.opciones}
                  seleccionados={seleccion}
                  onChange={setSeleccion}
                  disabled={saveMut.isPending}
                />
                {sinMeses ? (
                  <p className="field__error" data-testid="tipo-pago-fijo-error">
                    Marca al menos un mes.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="texto-muted ficha-form__nota" style={{ marginBottom: 0 }}>
                Los meses por grado se eligen en la tarjeta de cada grado.
              </p>
            )}
          </section>
        ) : null}

        {porGradoVisible ? (
          <section className="expediente__seccion">
            <h3 className="expediente__titulo">Por grado</h3>
            <div className="pagos-config">
              {grados.map((g) => (
                <div key={g.grado_id} className="meses-cobro__fila-grado">
                  <div className="meses-cobro__fila-cabecera">
                    <h4 className="pagos-config__grado-titulo">{g.grado_nombre}</h4>
                    {desglose === 'por_grado' ? (
                      <Field label={esMensualidad ? 'Mensualidad (L)' : 'Matrícula (L)'}>
                        <input
                          type="number"
                          min={0}
                          className="field__input"
                          data-testid={`tipo-pago-fijo-monto-${g.grado_id}`}
                          value={montos[g.grado_id] ?? ''}
                          disabled={saveMut.isPending}
                          onChange={(e) =>
                            setMontos((m) => ({ ...m, [g.grado_id]: e.target.value }))
                          }
                        />
                      </Field>
                    ) : null}
                  </div>
                  {esMensualidad && mesesModo === 'por_grado' ? (
                    <MesesCobro
                      opciones={meses.opciones}
                      seleccionados={mesesGrado[g.grado_id] ?? []}
                      onChange={(claves) =>
                        setMesesGrado((m) => ({ ...m, [g.grado_id]: claves }))
                      }
                      disabled={saveMut.isPending}
                      compacto
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="expediente__seccion">
          <h3 className="expediente__titulo">Bloqueo de notas</h3>
          <label className="pagos-config__modo-opcion">
            <input
              type="checkbox"
              data-testid="tipo-pago-fijo-bloquea"
              checked={bloquea}
              onChange={(e) => setBloquea(e.target.checked)}
            />
            <span>Bloquea las notas mientras esté impago y vencido</span>
          </label>
          <label className="pagos-config__modo-opcion" style={{ marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              data-testid="tipo-pago-fijo-retroactivo"
              checked={retroactivo}
              onChange={(e) => setRetroactivo(e.target.checked)}
            />
            <span>Aplicar los montos a las obligaciones pendientes ya generadas</span>
          </label>
        </section>
      </div>
    </Modal>
  )
}
