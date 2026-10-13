import { useState } from 'react'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { TareaRevisionModal } from '#/components/tareas/TareaRevisionModal'
import type { MonitorClase } from '#/services/monitores'

/** Detalle de las tareas con entrega hoy de una clase; al tocar una se abre la revisión. */
export function MonitorTareasModal({
  clase,
  onClose,
}: {
  clase: MonitorClase
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const [revisarId, setRevisarId] = useState<string | null>(null)

  return (
    <Modal
      open={open}
      title={`Tareas de hoy · ${clase.curso_nombre}`}
      wide
      onClose={dismiss}
      footer={
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          Cerrar
        </button>
      }
    >
      <p className="texto-muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
        {clase.grado_nombre} · sec{clase.seccion_nombre} · {clase.maestro_nombre}
      </p>

      {clase.tareas.items.length === 0 ? (
        <div className="empty-state" data-testid="monitor-tareas-vacio">
          No hay tareas con entrega hoy.
        </div>
      ) : (
        <ul
          data-testid="monitor-tareas-lista"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          {clase.tareas.items.map((t) => (
            <li
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                background: 'var(--sasha-bg-muted)',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontWeight: 600 }}>{t.titulo}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="texto-muted" style={{ fontSize: '0.8rem' }}>
                  {t.revisados}/{t.total}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  data-testid={`monitor-tarea-ver-${t.id}`}
                  onClick={() => setRevisarId(t.id)}
                >
                  Ver
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {revisarId ? (
        <TareaRevisionModal tareaId={revisarId} onClose={() => setRevisarId(null)} />
      ) : null}
    </Modal>
  )
}
