import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { DestinosTipoPago } from '#/components/pagos/DestinosTipoPago'
import { MesesCobro } from '#/components/pagos/MesesCobro'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { SegmentedToggle } from '#/components/ui/SegmentedToggle'
import { claveMes } from '#/helpers/configuracion-pagos'
import { validarTipoAdicional } from '#/helpers/tipos-pago'
import type { OpcionesDestino } from '#/helpers/tipos-pago'
import { userMessageFromError } from '#/lib/api'
import { actualizarTipoPago, crearTipoPago } from '#/services/pagos-tipos'
import type {
  MesesCobroConfig,
  ModoDesglose,
  TipoPagoDetalle,
  TipoPagoReglaInput,
} from '#/services/pagos-tipos'

type Props = {
  periodoId: string
  meses: MesesCobroConfig
  opciones: OpcionesDestino
  /** basico = sin filtros, con desglose por grado; avanzado = general + destinos. */
  modo?: 'basico' | 'avanzado'
  /** Día de pago del periodo (default de los periódicos). */
  diaPagoPeriodo: number
  /** null/undefined = crear. */
  tipo?: TipoPagoDetalle | null
  onClose: () => void
  onSaved: () => void
}

type Form = {
  nombre: string
  descripcion: string
  monto: string
  esPeriodico: boolean
  diaPago: string
  fechaVencimiento: string
  bloqueaNotas: boolean
  reglas: TipoPagoReglaInput[]
  desglose: ModoDesglose
  mesesModo: ModoDesglose
  montos: Record<string, string>
  mesesGrado: Record<string, string[]>
  mesesGenerales: string[]
}

const MODOS: [
  { value: ModoDesglose; label: string },
  { value: ModoDesglose; label: string },
] = [
  { value: 'general', label: 'General' },
  { value: 'por_grado', label: 'Por grado' },
]

const num = (v: string) => Number(v.replace(',', '.'))

const reglasDe = (tipo?: TipoPagoDetalle | null): TipoPagoReglaInput[] =>
  (tipo?.reglas ?? []).map((r) => ({
    modalidad_id: r.modalidad_id,
    grado_id: r.grado_id,
    seccion_id: r.seccion_id,
    alumno_id: r.alumno_id,
    curso_id: r.curso_id,
  }))

function formInicial(
  tipo: TipoPagoDetalle | null | undefined,
  meses: MesesCobroConfig,
  opciones: OpcionesDestino,
  diaPagoPeriodo: number,
): Form {
  const generales = meses.seleccionados.map(claveMes)
  const montos: Record<string, string> = {}
  const mesesGrado: Record<string, string[]> = {}
  const porGradoMeses = new Map(
    (tipo?.meses_por_grado ?? []).map((m) => [m.grado_id, m.meses.map(claveMes)]),
  )
  const porGradoMontos = new Map(
    (tipo?.montos_por_grado ?? []).map((m) => [m.grado_id, m.monto]),
  )
  for (const g of opciones.grados) {
    montos[g.id] = porGradoMontos.has(g.id) ? String(porGradoMontos.get(g.id)) : ''
    mesesGrado[g.id] = porGradoMeses.get(g.id) ?? generales
  }
  if (!tipo) {
    return {
      nombre: '',
      descripcion: '',
      monto: '',
      esPeriodico: false,
      diaPago: String(diaPagoPeriodo),
      fechaVencimiento: '',
      bloqueaNotas: true,
      reglas: [],
      desglose: 'general',
      mesesModo: 'general',
      montos,
      mesesGrado,
      mesesGenerales: generales,
    }
  }
  return {
    nombre: tipo.nombre,
    descripcion: tipo.descripcion,
    monto: tipo.monto != null ? String(tipo.monto) : '',
    esPeriodico: tipo.es_periodico,
    diaPago: String(tipo.dia_pago ?? diaPagoPeriodo),
    fechaVencimiento: tipo.fecha_vencimiento ?? '',
    bloqueaNotas: tipo.bloquea_notas,
    reglas: reglasDe(tipo),
    desglose: tipo.desglose,
    mesesModo: tipo.es_periodico ? tipo.meses_modo : 'general',
    montos,
    mesesGrado,
    mesesGenerales:
      tipo.meses_generales.length > 0 ? tipo.meses_generales.map(claveMes) : generales,
  }
}

/** Formulario de alta/edición de un tipo de pago adicional. */
export function TipoPagoAdicionalModal({
  periodoId,
  meses,
  opciones,
  modo = 'basico',
  diaPagoPeriodo,
  tipo,
  onClose,
  onSaved,
}: Props) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const [form, setForm] = useState<Form>(() => formInicial(tipo, meses, opciones, diaPagoPeriodo))
  const [confirmar, setConfirmar] = useState(false)

  const editando = Boolean(tipo)
  const avanzado = modo === 'avanzado'
  const error = validarTipoAdicional(form)
  const montoInvalido =
    form.desglose === 'por_grado' &&
    opciones.grados.some((g) => {
      const v = num(form.montos[g.id] ?? '')
      return !Number.isFinite(v) || v < 0
    })
  const porGradoVisible =
    !avanzado &&
    (form.desglose === 'por_grado' || (form.esPeriodico && form.mesesModo === 'por_grado'))
  const mesesInvalido =
    form.esPeriodico && form.mesesModo === 'general' && form.mesesGenerales.length === 0

  const base = tipo?.editables
  const puede = (campo: keyof NonNullable<typeof base>) => !editando || !base || base[campo]

  const saveMut = useMutation({
    mutationFn: () => {
      if (montoInvalido) throw new Error('Ningún monto por grado puede ser negativo.')
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        monto: num(form.monto) || 0,
        es_periodico: form.esPeriodico,
        dia_pago: form.esPeriodico ? Number(form.diaPago) : null,
        fecha_vencimiento: form.esPeriodico ? null : form.fechaVencimiento || null,
        bloquea_notas: form.bloqueaNotas,
        reglas: form.reglas,
        desglose: avanzado ? ('general' as ModoDesglose) : form.desglose,
        meses_modo: !avanzado && form.esPeriodico ? form.mesesModo : ('general' as ModoDesglose),
        montos_por_grado:
          !avanzado && form.desglose === 'por_grado'
            ? opciones.grados.map((g) => ({
                grado_id: g.id,
                monto: num(form.montos[g.id] ?? '0') || 0,
              }))
            : undefined,
        meses:
          form.esPeriodico && form.mesesModo === 'general'
            ? form.mesesGenerales.map((clave) => {
                const [anio, mes] = clave.split('-').map(Number)
                return { anio, mes }
              })
            : undefined,
        meses_por_grado:
          !avanzado && form.esPeriodico && form.mesesModo === 'por_grado'
            ? opciones.grados.map((g) => ({
                grado_id: g.id,
                meses: (form.mesesGrado[g.id] ?? []).map((clave) => {
                  const [anio, mes] = clave.split('-').map(Number)
                  return { anio, mes }
                }),
              }))
            : undefined,
      }
      return tipo
        ? actualizarTipoPago(periodoId, tipo.id, payload)
        : crearTipoPago(periodoId, payload)
    },
    onSuccess: (r) => {
      toast.success(editando ? 'Tipo de pago actualizado' : 'Tipo de pago creado')
      const gen = r.generacion
      if (gen && (gen.obligaciones_creadas > 0 || gen.obligaciones_reactivadas > 0)) {
        toast.message(
          `Se generaron ${gen.obligaciones_creadas} obligaciones y se reactivaron ${gen.obligaciones_reactivadas}.`,
        )
      }
      void qc.invalidateQueries({ queryKey: ['pagos-tipos', periodoId] })
      onSaved()
    },
    onError: (e) => {
      setConfirmar(false)
      toast.error(userMessageFromError(e))
    },
  })

  const set = <TField extends keyof Form>(k: TField, v: Form[TField]) =>
    setForm((f) => ({ ...f, [k]: v }))

  return (
    <>
      <Modal
        open={open}
        xl
        title={editando ? 'Editar tipo de pago' : 'Nuevo tipo de pago'}
        onClose={dismiss}
        testId="tipo-pago-form-modal"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="tipo-pago-guardar"
              disabled={Boolean(error) || montoInvalido || mesesInvalido || saveMut.isPending}
              onClick={() => setConfirmar(true)}
            >
              Guardar
            </button>
          </>
        }
      >
        <div className="ficha-form" data-testid="tipo-pago-form">
          <section className="expediente__seccion">
            <h3 className="expediente__titulo">Datos</h3>
            <Field label="Nombre" htmlFor="tipo-pago-nombre">
              <input
                id="tipo-pago-nombre"
                className="field__input"
                data-testid="tipo-pago-nombre"
                value={form.nombre}
                maxLength={100}
                disabled={!puede('nombre')}
                onChange={(e) => set('nombre', e.target.value)}
              />
            </Field>
            <Field label="Descripción" htmlFor="tipo-pago-descripcion">
              <input
                id="tipo-pago-descripcion"
                className="field__input"
                data-testid="tipo-pago-descripcion"
                value={form.descripcion}
                disabled={!puede('descripcion')}
                onChange={(e) => set('descripcion', e.target.value)}
              />
            </Field>

            <h4 className="expediente__titulo">Monto</h4>
            {avanzado ? null : (
              <SegmentedToggle
                value={form.desglose}
                options={MODOS}
                onChange={(v) => set('desglose', v)}
                disabled={!puede('monto')}
                testId="tipo-pago-monto-modo"
                ariaLabel="Modo del monto"
              />
            )}
            {avanzado || form.desglose === 'general' ? (
              <Field label="Monto (L)" htmlFor="tipo-pago-monto">
                <input
                  id="tipo-pago-monto"
                  type="number"
                  min={0}
                  className="field__input"
                  data-testid="tipo-pago-monto"
                  value={form.monto}
                  disabled={!puede('monto')}
                  onChange={(e) => set('monto', e.target.value)}
                />
              </Field>
            ) : (
              <p className="texto-muted ficha-form__nota" style={{ margin: 0 }}>
                Los montos por grado se editan en la tarjeta de cada grado (más abajo).
              </p>
            )}

            <Field label="Periodicidad">
              <div className="pagos-config__modo" role="radiogroup">
                <label className="pagos-config__modo-opcion">
                  <input
                    type="radio"
                    name="tipo-pago-periodicidad"
                    data-testid="tipo-pago-periodicidad-periodico"
                    checked={form.esPeriodico}
                    disabled={!puede('periodicidad')}
                    onChange={() => set('esPeriodico', true)}
                  />
                  <span>Periódico</span>
                </label>
                <label className="pagos-config__modo-opcion">
                  <input
                    type="radio"
                    name="tipo-pago-periodicidad"
                    data-testid="tipo-pago-periodicidad-unico"
                    checked={!form.esPeriodico}
                    disabled={!puede('periodicidad')}
                    onChange={() => set('esPeriodico', false)}
                  />
                  <span>Único</span>
                </label>
              </div>
            </Field>

            {form.esPeriodico ? (
              <>
                <Field label="Día de pago (1–31)" htmlFor="tipo-pago-dia-pago">
                  <select
                    id="tipo-pago-dia-pago"
                    className="field__select"
                    data-testid="tipo-pago-dia-pago"
                    value={form.diaPago}
                    onChange={(e) => set('diaPago', e.target.value)}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <h4 className="expediente__titulo">Meses</h4>
                {avanzado ? null : (
                  <SegmentedToggle
                    value={form.mesesModo}
                    options={MODOS}
                    onChange={(v) => set('mesesModo', v)}
                    disabled={saveMut.isPending}
                    testId="tipo-pago-meses-modo"
                    ariaLabel="Modo de los meses"
                  />
                )}
                {avanzado || form.mesesModo === 'general' ? (
                  <>
                    <MesesCobro
                      opciones={meses.opciones}
                      seleccionados={form.mesesGenerales}
                      onChange={(v) => set('mesesGenerales', v)}
                      disabled={saveMut.isPending}
                    />
                    {mesesInvalido ? (
                      <p className="field__error" data-testid="tipo-pago-meses-error">
                        Marca al menos un mes.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="texto-muted ficha-form__nota" style={{ margin: 0 }}>
                    Los meses por grado se eligen en la tarjeta de cada grado (1 al 12).
                  </p>
                )}
              </>
            ) : (
              <Field label="Fecha de vencimiento" htmlFor="tipo-pago-fecha">
                <input
                  id="tipo-pago-fecha"
                  type="date"
                  className="field__input"
                  data-testid="tipo-pago-fecha"
                  value={form.fechaVencimiento}
                  disabled={!puede('fecha_vencimiento')}
                  onChange={(e) => set('fechaVencimiento', e.target.value)}
                />
              </Field>
            )}
          </section>

          {porGradoVisible ? (
            <section className="expediente__seccion">
              <h3 className="expediente__titulo">Por grado</h3>
              <div className="pagos-config">
                {opciones.grados.map((g) => (
                  <div key={g.id} className="meses-cobro__fila-grado">
                    <div className="meses-cobro__fila-cabecera">
                      <h4 className="pagos-config__grado-titulo">{g.nombre}</h4>
                      {form.desglose === 'por_grado' ? (
                        <Field label="Monto (L)">
                          <input
                            type="number"
                            min={0}
                            className="field__input"
                            data-testid={`tipo-pago-monto-grado-${g.id}`}
                            value={form.montos[g.id] ?? ''}
                            disabled={!puede('monto') || saveMut.isPending}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                montos: { ...f.montos, [g.id]: e.target.value },
                              }))
                            }
                          />
                        </Field>
                      ) : null}
                    </div>
                    {form.esPeriodico && form.mesesModo === 'por_grado' ? (
                      <MesesCobro
                        opciones={meses.opciones}
                        seleccionados={form.mesesGrado[g.id] ?? []}
                        onChange={(claves) =>
                          setForm((f) => ({
                            ...f,
                            mesesGrado: { ...f.mesesGrado, [g.id]: claves },
                          }))
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
                data-testid="tipo-pago-bloquea"
                checked={form.bloqueaNotas}
                onChange={(e) => set('bloqueaNotas', e.target.checked)}
              />
              <span>Bloquea las notas mientras esté impago y vencido</span>
            </label>
            <p className="texto-muted ficha-form__nota">
              El bloqueo lo decide el backend con la obligación vencida; el formulario solo guarda
              la bandera.
            </p>
          </section>

          {avanzado ? (
            <section className="expediente__seccion">
              <h3 className="expediente__titulo">Destinos</h3>
              <DestinosTipoPago
                opciones={opciones}
                reglas={form.reglas}
                onChange={(reglas) => set('reglas', reglas)}
                disabled={!puede('reglas')}
              />
            </section>
          ) : null}

          {error ? (
            <p className="field__error" data-testid="tipo-pago-error">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title={editando ? 'Guardar cambios' : 'Crear tipo de pago'}
        message={`${form.nombre || 'Tipo de pago'} · ${form.esPeriodico ? 'periódico' : 'único'} · ${
          form.desglose === 'general' ? `L ${Number(form.monto) || 0}` : 'monto por grado'
        }`}
        confirmLabel={editando ? 'Guardar' : 'Crear'}
        testId="tipo-pago-confirmar"
        confirmDisabled={saveMut.isPending}
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmar(false)}
      />
    </>
  )
}
