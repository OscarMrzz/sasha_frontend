import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  getCandidatos,
  guardarRecuperaciones,
  notaParcialEfectiva,
  notaPeriodoEfectiva,
} from '#/services/recuperaciones'
import type { CandidatoRecuperacion, ListaRecuperaciones, TipoRecuperacion } from '#/services/recuperaciones'

function parseNota(v: string): number | null | undefined {
  const t = v.trim()
  if (t === '') return null
  const n = Number(t.replace(',', '.'))
  return Number.isNaN(n) ? undefined : n
}

export function RecuperacionModal({
  asignacionId,
  lista,
  claseLabel,
  onClose,
}: {
  asignacionId: string
  lista: ListaRecuperaciones
  claseLabel: string
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const qc = useQueryClient()
  const terminados = lista.parciales.filter((p) => p.terminado)
  const [tipo, setTipo] = useState<TipoRecuperacion>('parcial')
  const [parcialId, setParcialId] = useState(() => (terminados.at(-1) ?? lista.parciales.at(0))?.id ?? '')
  const [numero, setNumero] = useState(1)
  const [drafts, setDrafts] = useState<Partial<Record<string, string>>>({})
  const [confirm, setConfirm] = useState(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['recuperaciones-candidatos', asignacionId, tipo, parcialId, numero],
    queryFn: () => getCandidatos(asignacionId, tipo, tipo === 'parcial' ? parcialId : undefined, tipo === 'periodo' ? numero : undefined),
    enabled: tipo === 'periodo' || Boolean(parcialId),
  })

  const soloLectura = lista.finalizado || !data?.disponible

  const cambiar = (fn: () => void) => {
    fn()
    setDrafts({})
  }

  const valor = (a: CandidatoRecuperacion) => drafts[a.alumno_id] ?? (a.nota != null ? String(a.nota) : '')

  const cambios = (data?.alumnos ?? []).flatMap((a) => {
    const d = drafts[a.alumno_id]
    if (d === undefined) return []
    const n = parseNota(d)
    if (n === undefined || n === a.nota) return []
    return [{ alumno_id: a.alumno_id, nota: n }]
  })
  const invalidos = (data?.alumnos ?? []).filter((a) => {
    const d = drafts[a.alumno_id]
    if (d === undefined) return false
    const n = parseNota(d)
    return n === undefined || (n != null && (n < 0 || n > 100))
  })

  const guardarMut = useMutation({
    mutationFn: () =>
      guardarRecuperaciones({
        asignacion_docente_id: asignacionId,
        tipo,
        parcial_id: tipo === 'parcial' ? parcialId : undefined,
        numero: tipo === 'periodo' ? numero : undefined,
        items: cambios,
      }),
    onSuccess: (res) => {
      toast.success('Recuperaciones guardadas')
      qc.setQueryData(['recuperaciones-candidatos', asignacionId, tipo, parcialId, numero], res)
      void qc.invalidateQueries({ queryKey: ['recuperaciones', asignacionId] })
      setDrafts({})
      setConfirm(false)
    },
    onError: (e) => {
      toast.error(userMessageFromError(e))
      setConfirm(false)
    },
  })

  const cuenta = (a: CandidatoRecuperacion) => {
    if (!data) return a.nota_original
    const n = parseNota(valor(a))
    const rec = n === undefined ? null : n
    return tipo === 'parcial'
      ? notaParcialEfectiva(a.nota_original, rec, data.tope)
      : notaPeriodoEfectiva(a.nota_original, rec, data.tope, data.nota_minima)
  }

  const numeros = Array.from({ length: lista.config.recuperaciones_periodo }, (_, i) => i + 1)

  return (
    <Modal
      open={open}
      title="Recuperaciones"
      onClose={dismiss}
      wide
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            {soloLectura ? 'Cerrar' : 'Cancelar'}
          </button>
          {soloLectura ? null : (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="recuperacion-guardar"
              disabled={cambios.length === 0 || invalidos.length > 0 || guardarMut.isPending}
              onClick={() => setConfirm(true)}
            >
              Guardar
            </button>
          )}
        </>
      }
    >
      <div data-testid="recuperacion-modal">
        <p className="texto-muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
          {claseLabel} · nota mínima {lista.config.nota_minima}
        </p>
        {lista.finalizado ? (
          <p className="recuperacion-aviso" data-testid="recuperacion-finalizado">
            El periodo está finalizado: las recuperaciones son de solo lectura.
          </p>
        ) : null}
        <div className="recuperacion-tipo">
          <Field label="Tipo">
            <select
              className="field__select"
              data-testid="recuperacion-tipo"
              value={tipo}
              onChange={(e) => cambiar(() => setTipo(e.target.value as TipoRecuperacion))}
            >
              <option value="parcial">Recuperación de parcial</option>
              {numeros.length > 0 ? <option value="periodo">Recuperación de periodo</option> : null}
            </select>
          </Field>
          {tipo === 'parcial' ? (
            <Field label="Parcial">
              <select
                className="field__select"
                data-testid="recuperacion-parcial"
                value={parcialId}
                onChange={(e) => cambiar(() => setParcialId(e.target.value))}
              >
                {lista.parciales.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.etiqueta}
                    {p.terminado ? '' : ' (en curso)'}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Recuperación">
              <select
                className="field__select"
                data-testid="recuperacion-numero"
                value={numero}
                onChange={(e) => cambiar(() => setNumero(Number(e.target.value)))}
              >
                {numeros.map((n) => (
                  <option key={n} value={n}>
                    Recuperación {n}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {isLoading ? (
          <div className="empty-state">Cargando alumnos…</div>
        ) : isError || !data ? (
          <div className="empty-state">{userMessageFromError(error)}</div>
        ) : !data.disponible ? (
          <div className="empty-state" data-testid="recuperacion-no-disponible">
            {data.mensaje}
          </div>
        ) : data.alumnos.length === 0 ? (
          <div className="empty-state" data-testid="recuperacion-sin-alumnos">
            {data.mensaje ?? 'Ningún alumno necesita esta recuperación.'}
          </div>
        ) : (
          <>
            <p className="texto-muted" style={{ fontSize: '0.8rem', marginTop: 0 }}>
              {tipo === 'parcial'
                ? `Cuenta la nota más alta entre el parcial y la recuperación (tope ${data.tope}). Vacío quita la recuperación.`
                : `Si la recuperación llega a ${data.nota_minima}, es la nota final (tope ${data.tope}). Vacío quita la recuperación.`}
            </p>
            <div className="tarea-revision-table-wrap">
              <table className="tarea-revision-table" data-testid="recuperacion-table">
                <thead>
                  <tr>
                    <th>Cuenta</th>
                    <th>Nombre</th>
                    <th>{tipo === 'parcial' ? 'Nota del parcial' : 'Promedio'}</th>
                    <th>Recuperación (0–100)</th>
                    <th>Nota que cuenta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.alumnos.map((a) => {
                    const c = cuenta(a)
                    return (
                      <tr key={a.alumno_id} data-testid={`recuperacion-fila-${a.alumno_id}`}>
                        <td>{a.codigo}</td>
                        <td>{a.nombre}</td>
                        <td>{a.nota_original}</td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            className="field__input tarea-rev-manual"
                            data-testid={`recuperacion-nota-${a.alumno_id}`}
                            disabled={soloLectura}
                            placeholder="—"
                            value={valor(a)}
                            onChange={(e) => setDrafts((d) => ({ ...d, [a.alumno_id]: e.target.value }))}
                          />
                        </td>
                        <td
                          className={c >= data.nota_minima ? 'recuperacion-cuenta--ok' : 'recuperacion-cuenta--mal'}
                          data-testid={`recuperacion-cuenta-${a.alumno_id}`}
                        >
                          {c}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        title="Guardar recuperaciones"
        message={`¿Guardar ${cambios.length} ${cambios.length === 1 ? 'nota' : 'notas'} de la ${data?.etiqueta ?? 'recuperación'}?`}
        onConfirm={() => guardarMut.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </Modal>
  )
}
