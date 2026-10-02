import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { ACUMULACIONES, createTipoFicha, ordinal, updateTipoFicha } from '#/services/disciplina'
import type { Acumulacion, TipoFicha, TipoFichaInput } from '#/services/disciplina'

type NivelForm = { key: string; castigo: string; requiere_dias: boolean; dias: string }

function Seccion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="expediente__seccion">
      <h3 className="expediente__titulo">{title}</h3>
      {children}
    </section>
  )
}

let nivelSeq = 0
const nuevaKey = () => `nivel-${++nivelSeq}`
const nivelVacio = (): NivelForm => ({ key: nuevaKey(), castigo: '', requiere_dias: false, dias: '' })

export function TipoFichaModal({ tipo, onClose }: { tipo: TipoFicha | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const [acumulacion, setAcumulacion] = useState<Acumulacion>(tipo?.acumulacion ?? 'mes')
  const [titulo, setTitulo] = useState(tipo?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(tipo?.descripcion ?? '')
  const [niveles, setNiveles] = useState<NivelForm[]>(
    tipo?.niveles.length
      ? tipo.niveles.map((n) => ({
          key: nuevaKey(),
          castigo: n.castigo,
          requiere_dias: n.requiere_dias,
          dias: n.dias ? String(n.dias) : '',
        }))
      : [nivelVacio()],
  )
  const [confirmar, setConfirmar] = useState(false)
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const [destino, setDestino] = useState<number | null>(null)

  const mover = (desde: number, hasta: number) => {
    if (desde === hasta || hasta < 0 || hasta >= niveles.length) return
    setNiveles((list) => {
      const copia = [...list]
      const [item] = copia.splice(desde, 1)
      copia.splice(hasta, 0, item)
      return copia
    })
  }
  const finArrastre = () => {
    setArrastrando(null)
    setDestino(null)
  }

  const setNivel = (i: number, patch: Partial<NivelForm>) =>
    setNiveles((list) => list.map((n, j) => (j === i ? { ...n, ...patch } : n)))

  const error = !titulo.trim()
    ? 'Escribe el título.'
    : niveles.some((n) => !n.castigo.trim())
      ? 'Cada nivel necesita su castigo.'
      : niveles.some((n) => n.requiere_dias && !(Number(n.dias) > 0))
        ? 'Indica los días en los niveles que implican días.'
        : ''

  const body = (): TipoFichaInput => ({
    titulo: titulo.trim(),
    descripcion: descripcion.trim(),
    acumulacion,
    status: tipo?.status ?? 'ACTIVE',
    niveles: niveles.map((n, i) => ({
      nivel: i + 1,
      castigo: n.castigo.trim(),
      requiere_dias: n.requiere_dias,
      dias: n.requiere_dias ? Math.floor(Number(n.dias)) : null,
    })),
  })

  const mut = useMutation({
    mutationFn: () => (tipo ? updateTipoFicha(tipo.id, body()) : createTipoFicha(body())),
    onSuccess: () => {
      toast.success(tipo ? 'Tipo de ficha actualizado' : 'Tipo de ficha creado')
      qc.invalidateQueries({ queryKey: ['disciplina-tipos'] })
      setConfirmar(false)
      dismiss()
    },
    onError: (e) => {
      setConfirmar(false)
      toast.error(userMessageFromError(e))
    },
  })

  const ayuda = ACUMULACIONES.find((a) => a.value === acumulacion)?.ayuda

  return (
    <>
      <Modal
        open={open}
        xl
        title={tipo ? 'Editar tipo de ficha' : 'Nuevo tipo de ficha'}
        onClose={dismiss}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="tipo-ficha-guardar"
              disabled={Boolean(error) || mut.isPending}
              onClick={() => setConfirmar(true)}
            >
              Guardar
            </button>
          </>
        }
      >
        <div className="expediente ficha-form" data-testid="tipo-ficha-form">
          <Seccion title="¿Cómo se acumulan las veces?">
            <div className="segmento" role="radiogroup" aria-label="Acumulación">
              {ACUMULACIONES.map((a) => (
                <label
                  key={a.value}
                  className={`segmento__item${acumulacion === a.value ? ' segmento__item--on' : ''}`}
                >
                  <input
                    type="radio"
                    name="tipo-acumulacion"
                    value={a.value}
                    data-testid={`tipo-acumulacion-${a.value}`}
                    checked={acumulacion === a.value}
                    onChange={() => setAcumulacion(a.value)}
                  />
                  {a.label}
                </label>
              ))}
            </div>
            <p className="texto-muted ficha-form__nota">{ayuda}</p>
          </Seccion>

          <Seccion title="Falta">
            <Field label="Título" htmlFor="tipo-titulo">
              <input
                id="tipo-titulo"
                className="field__input"
                data-testid="tipo-titulo"
                placeholder="Ej. Uso de celular en clase"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </Field>
            <Field label="¿Qué hizo el alumno?" htmlFor="tipo-descripcion">
              <textarea
                id="tipo-descripcion"
                className="field__textarea"
                rows={3}
                data-testid="tipo-descripcion"
                placeholder="Describe la conducta que lleva a esta ficha."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </Field>
          </Seccion>

          <Seccion title="Niveles de castigo">
            <div className="niveles">
              {niveles.map((n, i) => (
                <div
                  key={n.key}
                  className={`nivel-fila${arrastrando === i ? ' nivel-fila--arrastrando' : ''}${
                    destino === i && arrastrando !== null && arrastrando !== i
                      ? arrastrando < i
                        ? ' nivel-fila--destino-abajo'
                        : ' nivel-fila--destino-arriba'
                      : ''
                  }`}
                  data-testid={`tipo-nivel-${i + 1}`}
                  onDragOver={(e) => {
                    if (arrastrando === null) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (destino !== i) setDestino(i)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (arrastrando !== null) mover(arrastrando, i)
                    finArrastre()
                  }}
                >
                  <button
                    type="button"
                    className="nivel-fila__grip"
                    draggable
                    data-testid={`tipo-nivel-${i + 1}-grip`}
                    aria-label={`Mover la ${ordinal(i + 1)} vez (Alt + flechas)`}
                    title="Arrastra para reordenar"
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', String(i))
                      const card = e.currentTarget.parentElement
                      if (card) e.dataTransfer.setDragImage(card, 16, 16)
                      setArrastrando(i)
                    }}
                    onDragEnd={finArrastre}
                    onKeyDown={(e) => {
                      if (!e.altKey) return
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        mover(i, i - 1)
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        mover(i, i + 1)
                      }
                    }}
                  >
                    <GripVertical size={18} />
                  </button>

                  <div className="nivel-fila__cuerpo">
                    <span className={`nivel-badge${i > 0 ? ' nivel-badge--alto' : ''}`}>{ordinal(i + 1)} vez</span>
                    <textarea
                      className="field__textarea"
                      rows={2}
                      aria-label={`Castigo de la ${ordinal(i + 1)} vez`}
                      data-testid={`tipo-nivel-${i + 1}-castigo`}
                      placeholder="Ej. Llamado de atención verbal"
                      value={n.castigo}
                      onChange={(e) => setNivel(i, { castigo: e.target.value })}
                    />
                  </div>

                  <div className="nivel-fila__lado">
                    <label className="nivel-fila__check">
                      <input
                        type="checkbox"
                        data-testid={`tipo-nivel-${i + 1}-check`}
                        checked={n.requiere_dias}
                        onChange={(e) =>
                          setNivel(i, { requiere_dias: e.target.checked, dias: e.target.checked ? n.dias : '' })
                        }
                      />
                      Implica días
                    </label>
                    <div className={`nivel-fila__dias${n.requiere_dias ? '' : ' nivel-fila__dias--off'}`}>
                      <input
                        type="number"
                        min={1}
                        className="field__input nivel-fila__input-dias"
                        aria-label={`Días de la ${ordinal(i + 1)} vez`}
                        data-testid={`tipo-nivel-${i + 1}-dias`}
                        placeholder="0"
                        disabled={!n.requiere_dias}
                        value={n.dias}
                        onChange={(e) => setNivel(i, { dias: e.target.value })}
                      />
                      <span>días de clase</span>
                    </div>
                    <button
                      type="button"
                      className="nivel-fila__quitar"
                      aria-label={`Quitar la ${ordinal(i + 1)} vez`}
                      title="Quitar nivel"
                      disabled={niveles.length === 1}
                      onClick={() => setNiveles((list) => list.filter((_, j) => j !== i))}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="niveles__pie">
              <button
                type="button"
                className="btn btn--ghost"
                data-testid="tipo-agregar-nivel"
                onClick={() => setNiveles((list) => [...list, nivelVacio()])}
              >
                <Plus size={16} /> Agregar nivel
              </button>
              <p className="texto-muted ficha-form__nota" style={{ margin: 0 }}>
                Desde la {ordinal(niveles.length + 1)} vez siempre se aplica el último nivel.
              </p>
            </div>
            {error ? <p className="field__error">{error}</p> : null}
          </Seccion>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Guardar tipo de ficha"
        message={`¿Guardar «${titulo.trim()}» con ${niveles.length} nivel${niveles.length === 1 ? '' : 'es'}?`}
        confirmLabel="Guardar"
        onConfirm={() => mut.mutate()}
        onCancel={() => setConfirmar(false)}
      />
    </>
  )
}
