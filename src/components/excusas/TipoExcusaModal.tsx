import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { createTipoExcusa, updateTipoExcusa } from '#/services/excusas'
import type { TipoExcusa } from '#/services/excusas'

export function TipoExcusaModal({ tipo, onClose }: { tipo: TipoExcusa | null; onClose: () => void }) {
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
        title={tipo ? 'Editar tipo de excusa' : 'Nuevo tipo de excusa'}
        onClose={dismiss}
        footer={
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
        }
      >
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
