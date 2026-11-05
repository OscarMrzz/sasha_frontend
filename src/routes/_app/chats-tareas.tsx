import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronRight, MessageCircle, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { TareaChatModal } from '#/components/comentarios/TareaChatModal'
import { RequirePermission } from '#/components/gates/Can'
import { useSseSignal } from '#/hooks/use-sse-signal'
import { listarChatsTareas } from '#/services/comentarios-tarea'
import type { ChatTareaResumen } from '#/services/comentarios-tarea'

export const Route = createFileRoute('/_app/chats-tareas')({
  component: ChatsTareasPage,
})

function fechaCorta(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function ChatsTareasPage() {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState<ChatTareaResumen | null>(null)
  const { data = [], isLoading } = useQuery({
    queryKey: ['chats-tareas'],
    queryFn: listarChatsTareas,
    refetchInterval: 15_000,
  })

  useSseSignal(() => qc.invalidateQueries({ queryKey: ['chats-tareas'] }))

  const totalNoLeidos = data.reduce((n, c) => n + c.no_leidos, 0)

  return (
    <RequirePermission permission="comentarios_tarea:get">
      <div className="chats-tareas" data-testid="chats-tareas-page">
        <header className="actualizaciones__toolbar">
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>
              Chats de tareas
            </h1>
            <p className="texto-muted" style={{ margin: 0 }}>
              {totalNoLeidos > 0
                ? `${totalNoLeidos} mensaje${totalNoLeidos === 1 ? '' : 's'} sin leer`
                : 'Dudas y consultas de tus tareas'}
            </p>
          </div>
        </header>

        {isLoading ? (
          <p className="texto-muted">Cargando chats…</p>
        ) : data.length === 0 ? (
          <div className="empty-state" data-testid="chats-tareas-vacio">
            Todavía no hay chats de tareas.
          </div>
        ) : (
          <div className="chats-tareas__lista">
            {data.map((c) => (
              <button
                key={c.tarea_id}
                type="button"
                className="chats-tareas__item"
                data-testid={`chat-tarea-${c.tarea_id}`}
                onClick={() => setAbierto(c)}
              >
                <span className="chats-tareas__icono" aria-hidden>
                  <MessageCircle size={22} />
                </span>
                <span className="chats-tareas__cuerpo">
                  <span className="chats-tareas__titulo">
                    {c.titulo}
                    {c.silenciado ? <VolumeX size={14} aria-label="Chat silenciado" /> : null}
                  </span>
                  <span className="texto-muted">
                    {c.clase} · {c.seccion}
                  </span>
                  <span className="chats-tareas__ultimo">
                    {c.ultimo_mensaje
                      ? `${c.ultimo_autor}: ${c.ultimo_mensaje}`
                      : 'Todavía no hay mensajes.'}
                  </span>
                </span>
                <span className="chats-tareas__lado">
                  <span className="texto-muted">{fechaCorta(c.ultimo_en)}</span>
                  {c.no_leidos > 0 ? (
                    <span
                      className="chats-tareas__badge"
                      data-testid={`chat-tarea-no-leidos-${c.tarea_id}`}
                    >
                      {c.no_leidos}
                    </span>
                  ) : null}
                </span>
                <ChevronRight size={18} aria-hidden className="texto-muted" />
              </button>
            ))}
          </div>
        )}
      </div>

      {abierto ? (
        <TareaChatModal
          tareaId={abierto.tarea_id}
          titulo={abierto.titulo}
          onClose={() => setAbierto(null)}
        />
      ) : null}
    </RequirePermission>
  )
}
