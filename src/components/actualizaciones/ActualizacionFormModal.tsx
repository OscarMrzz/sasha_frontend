import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { ESTADOS_ACTUALIZACION, validarActualizacion } from '#/helpers/actualizaciones'
import { userMessageFromError } from '#/lib/api'
import { actualizarActualizacion, crearActualizacion } from '#/services/actualizaciones'
import type {
  ActualizacionInput,
  ActualizacionSistema,
  EstadoActualizacion,
} from '#/services/actualizaciones'

function hoyISO(): string {
  const ahora = new Date()
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function ActualizacionFormModal({
  actualizacion,
  onClose,
}: {
  actualizacion: ActualizacionSistema | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)

  const inicial: ActualizacionInput = {
    titulo: actualizacion?.titulo ?? '',
    descripcion: actualizacion?.descripcion ?? '',
    estado: actualizacion?.estado ?? 'pendiente',
    fecha: actualizacion?.fecha ?? hoyISO(),
    orden: actualizacion?.orden ?? 0,
    version: actualizacion?.version ?? null,
    modulo: actualizacion?.modulo ?? null,
  }

  const [titulo, setTitulo] = useState(inicial.titulo)
  const [descripcion, setDescripcion] = useState(inicial.descripcion)
  const [estado, setEstado] = useState<EstadoActualizacion>(inicial.estado ?? 'pendiente')
  const [fecha, setFecha] = useState(inicial.fecha ?? hoyISO())
  const [orden, setOrden] = useState(String(inicial.orden ?? 0))
  const [version, setVersion] = useState(inicial.version ?? '')
  const [modulo, setModulo] = useState(inicial.modulo ?? '')
  const [intentado, setIntentado] = useState(false)
  const [descartar, setDescartar] = useState(false)

  const input: ActualizacionInput = {
    titulo,
    descripcion,
    estado,
    fecha,
    orden: Number(orden) || 0,
    version: version.trim() || null,
    modulo: modulo.trim() || null,
  }

  const errores = validarActualizacion(input)
  const hayErrores = Object.keys(errores).length > 0
  const dirty = JSON.stringify(input) !== JSON.stringify(inicial)

  const mut = useMutation({
    mutationFn: () =>
      actualizacion ? actualizarActualizacion(actualizacion.id, input) : crearActualizacion(input),
    onSuccess: () => {
      toast.success(actualizacion ? 'Actualización guardada' : 'Actualización creada')
      qc.invalidateQueries({ queryKey: ['actualizaciones'] })
      setDescartar(false)
      dismiss()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const pedirCerrar = () => {
    if (mut.isPending) return
    if (dirty) {
      setDescartar(true)
      return
    }
    dismiss()
  }

  return (
    <>
      <Modal
        open={open}
        title={actualizacion ? 'Editar actualización' : 'Nueva actualización'}
        onClose={pedirCerrar}
        testId="actualizacion-form"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={pedirCerrar}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="actualizacion-form-guardar"
              disabled={mut.isPending}
              onClick={() => {
                setIntentado(true)
                if (!hayErrores) mut.mutate()
              }}
            >
              Guardar
            </button>
          </>
        }
      >
        <div className="actualizacion-form">
          <Field label="Título" htmlFor="actualizacion-titulo" error={intentado ? errores.titulo : undefined}>
            <input
              id="actualizacion-titulo"
              className="field__input"
              data-testid="actualizacion-form-titulo"
              maxLength={160}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </Field>

          <Field
            label="Descripción"
            htmlFor="actualizacion-descripcion"
            error={intentado ? errores.descripcion : undefined}
          >
            <textarea
              id="actualizacion-descripcion"
              className="field__input"
              data-testid="actualizacion-form-descripcion"
              rows={4}
              maxLength={4000}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>

          <Field label="Estado" htmlFor="actualizacion-estado" error={intentado ? errores.estado : undefined}>
            <select
              id="actualizacion-estado"
              className="field__input"
              data-testid="actualizacion-form-estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoActualizacion)}
            >
              {ESTADOS_ACTUALIZACION.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fecha" htmlFor="actualizacion-fecha">
            <input
              id="actualizacion-fecha"
              type="date"
              className="field__input"
              data-testid="actualizacion-form-fecha"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Field>

          <Field label="Orden" htmlFor="actualizacion-orden" error={intentado ? errores.orden : undefined}>
            <input
              id="actualizacion-orden"
              type="number"
              min={0}
              className="field__input"
              data-testid="actualizacion-form-orden"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
            />
          </Field>

          <Field label="Versión (opcional)" htmlFor="actualizacion-version" error={intentado ? errores.version : undefined}>
            <input
              id="actualizacion-version"
              className="field__input"
              data-testid="actualizacion-form-version"
              maxLength={40}
              placeholder="Ej. 1.5.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </Field>

          <Field label="Módulo (opcional)" htmlFor="actualizacion-modulo" error={intentado ? errores.modulo : undefined}>
            <input
              id="actualizacion-modulo"
              className="field__input"
              data-testid="actualizacion-form-modulo"
              maxLength={80}
              placeholder="Ej. Pagos"
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={descartar}
        title="Descartar cambios"
        message="Vas a cerrar el formulario sin guardar. ¿Descartar los cambios?"
        confirmLabel="Descartar"
        danger
        onConfirm={() => {
          setDescartar(false)
          dismiss()
        }}
        onCancel={() => setDescartar(false)}
      />
    </>
  )
}
