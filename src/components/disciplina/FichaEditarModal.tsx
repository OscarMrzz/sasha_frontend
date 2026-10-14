import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { editarFicha, listTiposFicha } from '#/services/disciplina'
import type { EditarFichaInput, FichaFila } from '#/services/disciplina'

function Seccion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="expediente__seccion">
      <h3 className="expediente__titulo">{title}</h3>
      {children}
    </section>
  )
}

export function FichaEditarModal({ ficha, onClose }: { ficha: FichaFila; onClose: () => void }) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const [fecha, setFecha] = useState(ficha.fecha)
  const [tipoId, setTipoId] = useState(ficha.tipo_ficha_id)
  const [dias, setDias] = useState<number | ''>(ficha.dias ?? '')
  const [desde, setDesde] = useState(ficha.fecha_inicio)
  const [hasta, setHasta] = useState(ficha.fecha_fin)
  const [obs, setObs] = useState(ficha.observaciones)
  const [confirmar, setConfirmar] = useState(false)

  const tipos = useQuery({ queryKey: ['disciplina-tipos', 'activos'], queryFn: () => listTiposFicha() })

  const tipoOptions = useMemo(() => {
    const list = (tipos.data ?? []).map((t) => ({ value: t.id, label: t.titulo }))
    if (ficha.tipo_ficha_id && !list.some((o) => o.value === ficha.tipo_ficha_id)) {
      list.unshift({ value: ficha.tipo_ficha_id, label: `${ficha.titulo} (inactivo)` })
    }
    return list
  }, [tipos.data, ficha.tipo_ficha_id, ficha.titulo])

  const errorRango =
    dias !== '' && desde && hasta && hasta < desde ? 'La fecha final no puede ser antes de la inicial.' : ''
  const error = !tipoId ? 'Elige el tipo de ficha.' : !fecha ? 'Indica la fecha.' : errorRango
  const listo = !error

  const body = (): EditarFichaInput => ({
    tipo_ficha_id: tipoId,
    fecha,
    dias: dias === '' ? null : dias,
    fecha_inicio: desde,
    fecha_fin: hasta,
    observaciones: obs,
  })

  const mut = useMutation({
    mutationFn: () => editarFicha(ficha.id, body()),
    onSuccess: () => {
      toast.success('Ficha actualizada')
      qc.invalidateQueries({ queryKey: ['disciplina-fichas-lista'] })
      qc.invalidateQueries({ queryKey: ['disciplina-fichas'] })
      setConfirmar(false)
      dismiss()
    },
    onError: (e) => {
      setConfirmar(false)
      toast.error(userMessageFromError(e))
    },
  })

  return (
    <>
      <Modal
        open={open}
        xl
        title="Editar ficha"
        onClose={dismiss}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="ficha-editar-guardar"
              disabled={!listo || mut.isPending}
              onClick={() => setConfirmar(true)}
            >
              Guardar
            </button>
          </>
        }
      >
        <div className="expediente ficha-form" data-testid="ficha-editar-modal">
          <Seccion title="Alumno">
            <div className="ficha-alumno" data-testid="ficha-editar-alumno">
              <span className="ficha-alumno__avatar">{ficha.alumno_nombre.slice(0, 1)}</span>
              <div>
                <p className="ficha-alumno__nombre">{ficha.alumno_nombre}</p>
                <p className="texto-muted ficha-alumno__meta">
                  {ficha.alumno_codigo}
                  {ficha.grado ? ` · ${ficha.grado} sec ${ficha.seccion} · ${ficha.modalidad}` : ''}
                </p>
              </div>
            </div>
          </Seccion>

          <Seccion title="Ficha">
            <div className="ficha-form__fila">
              <Field label="Fecha de la ficha" htmlFor="ficha-editar-fecha">
                <input
                  id="ficha-editar-fecha"
                  type="date"
                  className="field__input"
                  data-testid="ficha-editar-fecha"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </Field>
              <Field label="Tipo de ficha" htmlFor="ficha-editar-tipo">
                <Combobox
                  id="ficha-editar-tipo"
                  data-testid="ficha-editar-tipo"
                  value={tipoId}
                  onChange={setTipoId}
                  options={tipoOptions}
                  placeholder="Buscar tipo…"
                  emptyLabel="No hay tipos"
                />
              </Field>
            </div>
            {error ? <p className="field__error">{error}</p> : null}
            <p className="texto-muted ficha-form__nota">
              Nivel {ficha.nivel} · {ficha.castigo}
            </p>
          </Seccion>

          <Seccion title="Días de castigo">
            <div className="ficha-form__fila ficha-form__fila--3">
              <Field label="Días" htmlFor="ficha-editar-dias">
                <input
                  id="ficha-editar-dias"
                  type="number"
                  min={1}
                  className="field__input"
                  data-testid="ficha-editar-dias"
                  value={dias}
                  onChange={(e) => setDias(e.target.value === '' ? '' : Math.max(1, Math.floor(Number(e.target.value))))}
                />
              </Field>
              <Field label="Desde" htmlFor="ficha-editar-desde">
                <input
                  id="ficha-editar-desde"
                  type="date"
                  className="field__input"
                  data-testid="ficha-editar-desde"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                />
              </Field>
              <Field label="Hasta" htmlFor="ficha-editar-hasta">
                <input
                  id="ficha-editar-hasta"
                  type="date"
                  className="field__input"
                  data-testid="ficha-editar-hasta"
                  value={hasta}
                  min={desde}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </Field>
            </div>
          </Seccion>

          <Seccion title="Observaciones">
            <textarea
              className="field__textarea ficha-form__obs"
              rows={4}
              data-testid="ficha-editar-observaciones"
              placeholder="Detalles de lo ocurrido, testigos, acuerdos con el responsable…"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </Seccion>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Guardar cambios"
        message={`¿Guardar los cambios de la ficha de ${ficha.alumno_nombre}?`}
        confirmLabel="Guardar"
        onConfirm={() => mut.mutate()}
        onCancel={() => setConfirmar(false)}
      />
    </>
  )
}
