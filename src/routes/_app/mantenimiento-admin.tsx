import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { userMessageFromError } from '#/lib/api'
import { getEstadoMantenimiento, setMantenimiento } from '#/services/mantenimiento'

export const Route = createFileRoute('/_app/mantenimiento-admin')({
  component: MantenimientoAdminPage,
})

const ESTADO_KEY = ['mantenimiento-estado'] as const

function Switch({
  on,
  disabled,
  label,
  onToggle,
  testId,
}: {
  on: boolean
  disabled?: boolean
  label: string
  onToggle: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      className={`switch${on ? ' switch--on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      data-testid={testId}
      onClick={onToggle}
    >
      <span className="switch__thumb" />
    </button>
  )
}

function MantenimientoAdminPage() {
  const qc = useQueryClient()
  const estadoQuery = useQuery({ queryKey: ESTADO_KEY, queryFn: getEstadoMantenimiento })

  const [activo, setActivo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [confirmar, setConfirmar] = useState(false)

  const estado = estadoQuery.data

  useEffect(() => {
    if (!estado) return
    setActivo(estado.activo)
    setMotivo(estado.motivo)
    setMensaje(estado.mensaje)
  }, [estado])

  const mut = useMutation({
    mutationFn: () =>
      setMantenimiento({ activo, motivo: motivo.trim(), mensaje: mensaje.trim() }),
    onSuccess: (res) => {
      toast.success(res.activo ? 'Modo mantenimiento activado' : 'Modo mantenimiento desactivado')
      qc.invalidateQueries({ queryKey: ESTADO_KEY })
      setConfirmar(false)
    },
    onError: (e) => {
      toast.error(userMessageFromError(e))
      setConfirmar(false)
    },
  })

  const cambiando = Boolean(estado) && estado?.activo !== activo

  const dirty =
    Boolean(estado) &&
    (cambiando ||
      (estado?.motivo ?? '') !== motivo.trim() ||
      (estado?.mensaje ?? '') !== mensaje.trim())

  if (estadoQuery.isLoading) {
    return (
      <RequirePermission permission="mantenimiento:put">
        <h1 className="page-title">Mantenimiento</h1>
        <div className="empty-state">Cargando estado…</div>
      </RequirePermission>
    )
  }

  if (estadoQuery.isError) {
    return (
      <RequirePermission permission="mantenimiento:put">
        <h1 className="page-title">Mantenimiento</h1>
        <div className="empty-state" role="alert">
          {userMessageFromError(estadoQuery.error)}
        </div>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="mantenimiento:put">
      <h1 className="page-title">Mantenimiento</h1>

      <section className="ctrl-section" data-testid="mantenimiento-section">
        <h2 className="ctrl-section__title">Modo mantenimiento</h2>
        <p className="ctrl-section__hint texto-muted">
          Al activarlo, <strong>todos</strong> los usuarios (incluido admin) son enviados a la pantalla de
          mantenimiento y no pueden usar el sistema. Solo el rol <strong>developer</strong> puede entrar
          aquí para desactivarlo.
        </p>
        <p className="texto-muted" style={{ fontSize: '0.85rem', margin: '0 0 1rem' }}>
          El apagado <strong>global</strong> de todos los clientes se hace con el script del servidor
          (<code>mantenimiento on --all</code>); este botón solo afecta a este despliegue.
        </p>

        <div className="ctrl-roles">
          <div className="ctrl-roles__row">
            <span className="ctrl-roles__name">
              Estado actual:{' '}
              <span className={`badge ${estado?.activo ? 'badge--danger' : 'badge--ok'}`}>
                {estado?.activo ? 'En mantenimiento' : 'Disponible'}
              </span>
            </span>
            <Switch
              on={activo}
              disabled={mut.isPending}
              label={activo ? 'Desactivar modo mantenimiento' : 'Activar modo mantenimiento'}
              testId="mantenimiento-switch"
              onToggle={() => setActivo((v) => !v)}
            />
          </div>
        </div>
      </section>

      <form
        className="panel-form"
        style={{ maxWidth: 720 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (dirty) setConfirmar(true)
        }}
      >
        <Field label="Motivo (interno)" htmlFor="mant-motivo">
          <input
            id="mant-motivo"
            className="field__input"
            data-testid="mantenimiento-motivo"
            placeholder="Ej. Migración de base de datos"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Field>
        <Field label="Mensaje para los usuarios" htmlFor="mant-mensaje">
          <textarea
            id="mant-mensaje"
            className="field__textarea"
            rows={3}
            data-testid="mantenimiento-mensaje"
            placeholder="Ej. Estamos actualizando la plataforma. Volveremos en breve."
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
          />
        </Field>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="submit"
            className={`btn ${cambiando ? (activo ? 'btn--danger' : 'btn--primary') : 'btn--primary'}`}
            data-testid="mantenimiento-guardar"
            disabled={!dirty || mut.isPending}
          >
            {mut.isPending
              ? 'Guardando…'
              : cambiando
                ? activo
                  ? 'Activar mantenimiento'
                  : 'Desactivar mantenimiento'
                : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmar}
        title={
          cambiando
            ? activo
              ? 'Activar modo mantenimiento'
              : 'Desactivar modo mantenimiento'
            : 'Guardar cambios'
        }
        message={
          cambiando
            ? activo
              ? 'Esto bloqueará a TODOS los usuarios (incluido admin): serán enviados a la pantalla de mantenimiento y no podrán usar el sistema hasta que lo desactives. El apagado GLOBAL de todos los clientes se hace con el script del servidor («mantenimiento on --all»). ¿Confirmas activar el mantenimiento?'
              : 'El sistema volverá a estar disponible para todos los usuarios. ¿Confirmas desactivar el mantenimiento?'
            : 'Se guardarán el motivo y el mensaje de la pantalla de mantenimiento. No cambia el estado (seguirá igual). ¿Confirmas guardar?'
        }
        danger={cambiando && activo}
        confirmLabel={cambiando ? (activo ? 'Activar' : 'Desactivar') : 'Guardar'}
        confirmDisabled={mut.isPending}
        testId="mantenimiento-confirm"
        onConfirm={() => mut.mutate()}
        onCancel={() => setConfirmar(false)}
      />
    </RequirePermission>
  )
}
