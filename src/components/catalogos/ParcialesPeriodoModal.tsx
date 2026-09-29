import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { createParcial, listParciales, updateParcial } from '#/services/catalogos'
import type { Parcial, ParcialInput, Periodo } from '#/services/catalogos'

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** Meses que toca el rango (un mes cuenta aunque el parcial solo cubra parte de él). */
export function mesesDelRango(inicio: string, fin: string): string[] {
  const [yi, mi] = inicio.split('-').map(Number)
  const [yf, mf] = fin.split('-').map(Number)
  if (!yi || !mi || !yf || !mf || yf * 12 + mf < yi * 12 + mi) return []
  const out: string[] = []
  for (let k = yi * 12 + (mi - 1); k <= yf * 12 + (mf - 1); k++) {
    out.push(`${MESES[k % 12]} ${Math.floor(k / 12)}`)
  }
  return out
}

type Props = {
  periodo: Periodo | null
  onClose: () => void
}

export function ParcialesPeriodoModal({ periodo, onClose }: Props) {
  const qc = useQueryClient()
  const periodoId = periodo?.id ?? ''
  const { data: parciales = [] } = useQuery({
    queryKey: ['parciales', periodoId],
    queryFn: () => listParciales(periodoId),
    enabled: Boolean(periodoId),
  })

  const [editing, setEditing] = useState<Parcial | 'nuevo' | null>(null)
  const [form, setForm] = useState<ParcialInput | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)

  const abrir = (p: Parcial | 'nuevo') => {
    setEditing(p)
    if (p === 'nuevo') {
      const siguiente = parciales.reduce((m, x) => Math.max(m, x.numero), 0) + 1
      setForm({ periodo_academico_id: periodoId, numero: siguiente, nombre: `Parcial ${siguiente}`, fecha_inicio: '', fecha_fin: '' })
    } else {
      setForm({
        periodo_academico_id: periodoId,
        numero: p.numero,
        nombre: p.nombre,
        fecha_inicio: p.fecha_inicio.slice(0, 10),
        fecha_fin: p.fecha_fin.slice(0, 10),
      })
    }
  }

  const cerrarForm = () => {
    setEditing(null)
    setForm(null)
  }

  const saveMut = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('Formulario vacío')
      return editing && editing !== 'nuevo' ? updateParcial(editing.id, form) : createParcial(form)
    },
    onSuccess: () => {
      toast.success(editing === 'nuevo' ? 'Parcial creado' : 'Parcial actualizado')
      qc.invalidateQueries({ queryKey: ['parciales', periodoId] })
      qc.invalidateQueries({ queryKey: ['liberacion-estado'] })
      setConfirmSave(false)
      cerrarForm()
    },
    onError: (e) => {
      setConfirmSave(false)
      toast.error(userMessageFromError(e))
    },
  })

  const mesesForm = form ? mesesDelRango(form.fecha_inicio, form.fecha_fin) : []

  return (
    <>
      <Modal
        open={periodo != null}
        title={`Parciales · ${periodo?.nombre ?? ''}`}
        wide
        onClose={() => {
          cerrarForm()
          onClose()
        }}
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                cerrarForm()
                onClose()
              }}
            >
              Cerrar
            </button>
            {form ? (
              <Can permission={editing === 'nuevo' ? 'catalogos:post' : 'catalogos:put'}>
                <button
                  type="button"
                  className="btn btn--primary"
                  data-testid="parcial-guardar"
                  disabled={!form.fecha_inicio || !form.fecha_fin || !form.nombre.trim()}
                  onClick={() => setConfirmSave(true)}
                >
                  Guardar parcial
                </button>
              </Can>
            ) : (
              <Can permission="catalogos:post">
                <button type="button" className="btn btn--primary" data-testid="parcial-nuevo" onClick={() => abrir('nuevo')}>
                  Nuevo parcial
                </button>
              </Can>
            )}
          </>
        }
      >
        <p className="texto-muted" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
          Las fechas definen qué mensualidades cuentan para liberar la nota de cada parcial. Si un mes toca dos
          parciales, cuenta para ambos.
        </p>
        <table className="data-table" data-testid="parciales-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Meses</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {parciales.map((p) => (
              <tr key={p.id} data-testid={`parcial-fila-${p.numero}`}>
                <td>{p.numero}</td>
                <td>{p.nombre}</td>
                <td>{p.fecha_inicio.slice(0, 10)}</td>
                <td>{p.fecha_fin.slice(0, 10)}</td>
                <td style={{ textTransform: 'capitalize' }}>
                  {mesesDelRango(p.fecha_inicio.slice(0, 10), p.fecha_fin.slice(0, 10)).join(', ')}
                </td>
                <td>
                  <Can permission="catalogos:put">
                    <button type="button" className="btn btn--ghost" onClick={() => abrir(p)}>
                      Editar
                    </button>
                  </Can>
                </td>
              </tr>
            ))}
            {parciales.length === 0 ? (
              <tr>
                <td colSpan={6} className="texto-muted">
                  Este periodo aún no tiene parciales.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {form ? (
          <div className="pagos-card" style={{ maxWidth: 'none', marginTop: '1rem' }} data-testid="parcial-form">
            <h3 className="mdash__tile-title">{editing === 'nuevo' ? 'Nuevo parcial' : `Editar ${form.nombre}`}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '0.75rem' }}>
              <Field label="Número">
                <input
                  type="number"
                  min={1}
                  className="field__input"
                  data-testid="parcial-numero-input"
                  value={form.numero}
                  onChange={(e) => setForm((f) => (f ? { ...f, numero: Number(e.target.value) } : f))}
                />
              </Field>
              <Field label="Nombre">
                <input
                  className="field__input"
                  data-testid="parcial-nombre-input"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => (f ? { ...f, nombre: e.target.value } : f))}
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field label="Fecha inicio">
                <input
                  type="date"
                  className="field__input"
                  data-testid="parcial-inicio-input"
                  min={periodo?.fecha_inicio.slice(0, 10)}
                  max={periodo?.fecha_fin.slice(0, 10)}
                  value={form.fecha_inicio}
                  onChange={(e) => setForm((f) => (f ? { ...f, fecha_inicio: e.target.value } : f))}
                />
              </Field>
              <Field label="Fecha fin">
                <input
                  type="date"
                  className="field__input"
                  data-testid="parcial-fin-input"
                  min={form.fecha_inicio || periodo?.fecha_inicio.slice(0, 10)}
                  max={periodo?.fecha_fin.slice(0, 10)}
                  value={form.fecha_fin}
                  onChange={(e) => setForm((f) => (f ? { ...f, fecha_fin: e.target.value } : f))}
                />
              </Field>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem' }} data-testid="parcial-meses-preview">
              Abarca:{' '}
              <strong style={{ textTransform: 'capitalize' }}>
                {mesesForm.length ? mesesForm.join(', ') : 'elige las fechas'}
              </strong>
            </p>
            <button type="button" className="btn btn--ghost" style={{ marginTop: '0.75rem' }} onClick={cerrarForm}>
              Cancelar edición
            </button>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Guardar parcial"
        message={`¿Guardar ${form?.nombre ?? 'el parcial'}? Abarcará: ${mesesForm.join(', ')}.`}
        onConfirm={() => saveMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </>
  )
}
