import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Can } from '#/components/gates/Can'
import { ReglasMoraGrado } from '#/components/pagos/ReglasMoraGrado'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import {
  configToForm,
  configuracionFormVacia,
  diasOptions,
  formToPayload,
  validarConfiguracion,
} from '#/helpers/configuracion-pagos'
import type { ConfiguracionPagosForm, ReglaMoraForm } from '#/helpers/configuracion-pagos'
import { userMessageFromError } from '#/lib/api'
import {
  getConfiguracionPagos,
  updateConfiguracionPagos,
} from '#/services/pagos-config'
import type { PeriodoConfigLista } from '#/services/pagos-config'

type Props = {
  /** Periodo que se está configurando. */
  periodo: PeriodoConfigLista
  onClose: () => void
}

const DIAS = diasOptions()

const snapshot = (form: ConfiguracionPagosForm) => JSON.stringify(form)

export function ConfiguracionPagosModal({ periodo, onClose }: Props) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const periodoId = periodo.id

  const [form, setForm] = useState<ConfiguracionPagosForm>(configuracionFormVacia)
  const [baseline, setBaseline] = useState('')
  const [yaConfigurado, setYaConfigurado] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmRetroactivo, setConfirmRetroactivo] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const configQuery = useQuery({
    queryKey: ['pagos-config', periodoId],
    queryFn: () => getConfiguracionPagos(periodoId),
    enabled: open && Boolean(periodoId),
    retry: false,
  })

  useEffect(() => {
    if (!configQuery.data) return
    const next = configToForm(configQuery.data, [])
    setForm(next)
    setBaseline(snapshot(next))
    setYaConfigurado(configQuery.data.existe)
  }, [configQuery.data])

  useEffect(() => {
    if (configQuery.isError) toast.error(userMessageFromError(configQuery.error))
  }, [configQuery.isError, configQuery.error])

  const saveMut = useMutation({
    mutationFn: (retroactivo: boolean) =>
      updateConfiguracionPagos(periodoId, formToPayload(form, retroactivo)),
    onSuccess: () => {
      toast.success('Configuración de pagos guardada')
      void qc.invalidateQueries({ queryKey: ['pagos-config', periodoId] })
      setConfirmSave(false)
      setConfirmRetroactivo(false)
      dismiss()
    },
    onError: (e) => {
      setConfirmSave(false)
      setConfirmRetroactivo(false)
      toast.error(userMessageFromError(e))
    },
  })

  const error = validarConfiguracion(form)
  const dirty = snapshot(form) !== baseline
  const saving = saveMut.isPending
  const cargando = configQuery.isLoading
  const fallo = configQuery.isError

  const setDia = (key: 'dia_pago' | 'dia_mora', value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const setGradoMonto = (gradoId: string, monto: string) =>
    setForm((f) => ({
      ...f,
      grados: f.grados.map((g) => (g.grado_id === gradoId ? { ...g, monto } : g)),
    }))

  const setGradoReglas = (gradoId: string, reglas_mora: ReglaMoraForm[]) =>
    setForm((f) => ({
      ...f,
      grados: f.grados.map((g) => (g.grado_id === gradoId ? { ...g, reglas_mora } : g)),
    }))

  const handleClose = () => {
    if (confirmSave || confirmRetroactivo || confirmDiscard) return
    if (saving) return
    if (dirty) {
      setConfirmDiscard(true)
      return
    }
    dismiss()
  }

  const confirmarGuardado = () => {
    if (yaConfigurado) {
      setConfirmSave(false)
      setConfirmRetroactivo(true)
    } else {
      saveMut.mutate(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        xl
        title="Configurar pagos"
        onClose={handleClose}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={handleClose} disabled={saving}>
              Cancelar
            </button>
            <Can permission="pagos_config:put">
              <button
                type="button"
                className="btn btn--primary"
                data-testid="pagos-config-save-button"
                disabled={Boolean(error) || !dirty || saving || cargando || fallo}
                onClick={() => setConfirmSave(true)}
              >
                Guardar
              </button>
            </Can>
          </>
        }
      >
        <div className="expediente ficha-form" data-testid="pagos-config-modal">
          {cargando ? <p className="texto-muted">Cargando configuración…</p> : null}

          {fallo ? (
            <div>
              <p className="field__error" data-testid="pagos-config-load-error">
                No se pudo cargar la configuración: {userMessageFromError(configQuery.error)}
              </p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void configQuery.refetch()}
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {!cargando && !fallo ? (
            <>
              <section className="expediente__seccion">
                <h3 className="expediente__titulo">Vencimientos</h3>
                <div className="pagos-config__dias">
                  <Field label="Día de pago" htmlFor="pagos-config-dia-pago">
                    <select
                      id="pagos-config-dia-pago"
                      className="field__select"
                      data-testid="pagos-config-dia-pago"
                      disabled={saving}
                      value={form.dia_pago}
                      onChange={(e) => setDia('dia_pago', e.target.value)}
                    >
                      {DIAS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Día de mora" htmlFor="pagos-config-dia-mora">
                    <select
                      id="pagos-config-dia-mora"
                      className="field__select"
                      data-testid="pagos-config-dia-mora"
                      disabled={saving}
                      value={form.dia_mora}
                      onChange={(e) => setDia('dia_mora', e.target.value)}
                    >
                      {DIAS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>

              <section className="expediente__seccion">
                <h3 className="expediente__titulo">Montos por grado y reglas de mora</h3>
                <p className="texto-muted ficha-form__nota">
                  El recargo por mora es acumulativo: se suman los montos de todas las reglas cuyo
                  «N días» ya se alcanzó con el retraso. Una sola regla «1 día → L 100» cobra L 100
                  aunque el retraso sea de 5 días.
                </p>
                <div className="pagos-config">
                  {form.grados.length === 0 ? (
                    <p className="texto-muted">No hay grados en el catálogo.</p>
                  ) : (
                    form.grados.map((grado) => (
                      <div
                        key={grado.grado_id}
                        className="pagos-config__grado"
                        data-testid={`pagos-config-grado-${grado.grado_id}`}
                      >
                        <h4 className="pagos-config__grado-titulo">{grado.grado_nombre}</h4>
                        <Field label="Monto a pagar">
                          <input
                            type="number"
                            min={0}
                            className="field__input"
                            data-testid={`pagos-config-monto-${grado.grado_id}`}
                            placeholder="0"
                            disabled={saving}
                            value={grado.monto}
                            onChange={(e) => setGradoMonto(grado.grado_id, e.target.value)}
                          />
                        </Field>
                        <ReglasMoraGrado
                          gradoId={grado.grado_id}
                          value={grado.reglas_mora}
                          onChange={(reglas) => setGradoReglas(grado.grado_id, reglas)}
                          disabled={saving}
                        />
                      </div>
                    ))
                  )}
                </div>
              </section>

              {error ? (
                <p className="field__error" data-testid="pagos-config-error">
                  {error}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Guardar configuración de pagos"
        message="¿Guardar la configuración de pagos de este periodo?"
        confirmLabel="Guardar"
        testId="pagos-config-confirm"
        confirmDisabled={saving}
        onConfirm={confirmarGuardado}
        onCancel={() => setConfirmSave(false)}
      />

      <Modal
        open={confirmRetroactivo}
        title="¿Aplicar retroactivamente?"
        onClose={() => setConfirmRetroactivo(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              data-testid="pagos-config-retroactivo-no"
              disabled={saving}
              onClick={() => saveMut.mutate(false)}
            >
              No
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="pagos-config-retroactivo-si"
              disabled={saving}
              onClick={() => saveMut.mutate(true)}
            >
              Sí, retroactivo
            </button>
          </>
        }
      >
        <div data-testid="pagos-config-retroactivo">
          <p className="texto-primary" style={{ margin: 0 }}>
            ¿El cambio debe aplicar retroactivamente a las obligaciones ya generadas de este periodo?
          </p>
          <p className="texto-muted" style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            Si eliges «No», los cambios aplican solo a las obligaciones nuevas.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        title="Descartar cambios"
        message="¿Descartar los cambios sin guardar?"
        danger
        confirmLabel="Descartar"
        onConfirm={() => {
          setConfirmDiscard(false)
          dismiss()
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  )
}
