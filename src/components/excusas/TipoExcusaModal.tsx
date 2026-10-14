import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { createTipoExcusa, updateTipoExcusa } from '#/services/excusas'
import type { TipoExcusa } from '#/services/excusas'

export function TipoExcusaModal({
  tipo,
  soloVer = false,
  onClose,
}: {
  tipo: TipoExcusa | null
  soloVer?: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const [nombre, setNombre] = useState(tipo?.nombre ?? '')
  const [confirmar, setConfirmar] = useState(false)

  const mut = useMutation({
    mutationFn: () => {
      const body = { nombre: nombre.trim(), status: tipo?.status ?? 'ACTIVE' }
      return tipo ? updateTipoExcusa(tipo.id, body) : createTipoExcusa(body)
    },
    onSuccess: () => {
      toast.success(tipo ? 'Tipo de excusa actualizado' : 'Tipo de excusa creado')
      qc.invalidateQueries({ queryKey: ['excusas-tipos'] })
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
        title={soloVer ? 'Ver tipo de excusa' : tipo ? 'Editar tipo de excusa' : 'Nuevo tipo de excusa'}
        onClose={dismiss}
        footer={
          soloVer ? (
            <button type="button" className="btn btn--primary" onClick={dismiss}>
              Cerrar
            </button>
          ) : (
            <>
              <button type="button" className="btn btn--ghost" onClick={dismiss}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                data-testid="tipo-excusa-guardar"
                disabled={!nombre.trim() || mut.isPending}
                onClick={() => setConfirmar(true)}
              >
                Guardar
              </button>
            </>
          )
        }
      >
        {soloVer ? (
          <div className="expediente" data-testid="tipo-excusa-ver">
            <section className="expediente__seccion">
              <h3 className="expediente__titulo">Nombre</h3>
              <p style={{ margin: 0 }}>{tipo?.nombre ?? nombre}</p>
            </section>
            <section className="expediente__seccion">
              <h3 className="expediente__titulo">Estado</h3>
              <p style={{ margin: 0 }}>
                <span className="badge">{tipo?.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span>
              </p>
            </section>
            <section className="expediente__seccion">
              <h3 className="expediente__titulo">Uso</h3>
              <p className="texto-muted" style={{ margin: 0 }}>
                {tipo?.usos ?? 0} excusa{(tipo?.usos ?? 0) === 1 ? '' : 's'} registrada
                {(tipo?.usos ?? 0) === 1 ? '' : 's'} · código {tipo?.codigo ?? '—'}
              </p>
            </section>
          </div>
        ) : (
          <Field label="Nombre" htmlFor="tipo-excusa-nombre">
            <input
              id="tipo-excusa-nombre"
              className="field__input"
              data-testid="tipo-excusa-nombre"
              placeholder="Ej. Visita al doctor"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Guardar tipo de excusa"
        message={`¿Guardar «${nombre.trim()}»?`}
        confirmLabel="Guardar"
        onConfirm={() => mut.mutate()}
        onCancel={() => setConfirmar(false)}
      />
    </>
  )
}
