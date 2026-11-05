import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Trash2, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Modal } from '#/components/ui/Modal'
import { useSseSignal } from '#/hooks/use-sse-signal'
import { userMessageFromError } from '#/lib/api'
import {
  borrarComentario,
  enviarComentario,
  getHiloComentarios,
  marcarComentariosLeidos,
  silenciarChatTarea,
} from '#/services/comentarios-tarea'
import type { ComentarioTarea } from '#/services/comentarios-tarea'

const ROL_LABEL: Record<string, string> = {
  maestro: 'Maestro',
  alumno: 'Alumno',
  responsable: 'Responsable',
  admin: 'Admin',
  admin_temporal: 'Admin',
}

function dia(fecha: string) {
  const d = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(d.getTime())) return fecha
  return new Intl.DateTimeFormat('es-HN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(d)
}

function hora(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-HN', { hour: '2-digit', minute: '2-digit' }).format(d)
}

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}

function Avatar({ comentario }: { comentario: ComentarioTarea }) {
  return (
    <span
      className={`tarea-chat__avatar tarea-chat__avatar--${comentario.autor_rol}`}
      aria-hidden
    >
      {iniciales(comentario.autor_nombre || 'Usuario')}
    </span>
  )
}

export function TareaChatModal({
  tareaId,
  titulo,
  onClose,
}: {
  tareaId: string
  titulo: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { can } = useCan()
  const [texto, setTexto] = useState('')
  const [borrar, setBorrar] = useState<ComentarioTarea | null>(null)
  const listaRef = useRef<HTMLDivElement>(null)

  const { data: hilo, isLoading } = useQuery({
    queryKey: ['tarea-comentarios', tareaId],
    queryFn: () => getHiloComentarios(tareaId),
    refetchInterval: 10_000,
  })

  useSseSignal(() => {
    qc.invalidateQueries({ queryKey: ['tarea-comentarios', tareaId] })
    qc.invalidateQueries({ queryKey: ['chats-tareas'] })
  })

  const enviar = useMutation({
    mutationFn: () => enviarComentario(tareaId, texto),
    onSuccess: () => {
      setTexto('')
      qc.invalidateQueries({ queryKey: ['tarea-comentarios', tareaId] })
      qc.invalidateQueries({ queryKey: ['chats-tareas'] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const borrarMut = useMutation({
    mutationFn: (id: string) => borrarComentario(id),
    onSuccess: () => {
      toast.success('Mensaje borrado')
      qc.invalidateQueries({ queryKey: ['tarea-comentarios', tareaId] })
      qc.invalidateQueries({ queryKey: ['chats-tareas'] })
      setBorrar(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const silenciarMut = useMutation({
    mutationFn: (silenciado: boolean) => silenciarChatTarea(tareaId, silenciado),
    onSuccess: (r) => {
      toast.success(r.silenciado ? 'Chat silenciado' : 'Chat activado')
      qc.invalidateQueries({ queryKey: ['tarea-comentarios', tareaId] })
      qc.invalidateQueries({ queryKey: ['chats-tareas'] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const total = hilo?.total ?? 0
  useEffect(() => {
    if (!hilo) return
    void marcarComentariosLeidos(tareaId)
      .then(() => {
        qc.invalidateQueries({ queryKey: ['chats-tareas'] })
        qc.invalidateQueries({ queryKey: ['portal-tareas'] })
        qc.invalidateQueries({ queryKey: ['portal-tareas-lista'] })
      })
      .catch(() => undefined)
  }, [tareaId, total, hilo, qc])

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight })
  }, [total])

  const grupos = useMemo(() => {
    const out: { fecha: string; items: ComentarioTarea[] }[] = []
    for (const c of hilo?.comentarios ?? []) {
      const fecha = c.creado_en.slice(0, 10)
      if (out.length > 0 && out[out.length - 1].fecha === fecha) {
        out[out.length - 1].items.push(c)
      } else {
        out.push({ fecha, items: [c] })
      }
    }
    return out
  }, [hilo?.comentarios])

  const puedeBorrar = can('comentarios_tarea:delete')
  const puedeSilenciar = can('comentarios_tarea:mute')
  const puedeEscribir = hilo?.puede_escribir ?? true

  return (
    <>
      <Modal
        open
        title="Comentarios"
        wide
        testId="tarea-chat"
        onClose={onClose}
        footer={
          <form
            className="tarea-chat__form"
            onSubmit={(e) => {
              e.preventDefault()
              if (texto.trim() && puedeEscribir) enviar.mutate()
            }}
          >
            <textarea
              className="field__input tarea-chat__campo"
              rows={2}
              maxLength={2000}
              data-testid="tarea-chat-texto"
              placeholder={puedeEscribir ? 'Escribe un mensaje…' : 'El chat está silenciado'}
              disabled={!puedeEscribir}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn--primary tarea-chat__enviar"
              data-testid="tarea-chat-enviar"
              disabled={!texto.trim() || !puedeEscribir || enviar.isPending}
            >
              <Send size={18} aria-hidden />
            </button>
          </form>
        }
      >
        <div className="tarea-chat tarea-chat--v2">
          <header className="tarea-chat__cabecera">
            <div className="tarea-chat__titulo">
              <strong>{titulo}</strong>
              <span>{hilo?.silenciado ? 'Chat silenciado por el admin' : 'Dudas y consultas de la tarea'}</span>
            </div>
            <div className="tarea-chat__acciones">
              {puedeSilenciar ? (
                <button
                  type="button"
                  className="tarea-chat__accion"
                  data-testid="tarea-chat-silenciar"
                  disabled={silenciarMut.isPending}
                  onClick={() => silenciarMut.mutate(!hilo?.silenciado)}
                >
                  {hilo?.silenciado ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
                  <span>{hilo?.silenciado ? 'Activar' : 'Silenciar'}</span>
                </button>
              ) : null}
              <button
                type="button"
                className="tarea-chat__cerrar"
                data-testid="tarea-chat-cerrar"
                aria-label="Cerrar chat"
                onClick={onClose}
              >
                <X size={18} aria-hidden />
                <span>Cerrar</span>
              </button>
            </div>
          </header>

          <div className="tarea-chat__lista" ref={listaRef} data-testid="tarea-chat-lista">
            {isLoading ? <p className="texto-muted">Cargando…</p> : null}
            {!isLoading && grupos.length === 0 ? (
              <p className="texto-muted">Todavía no hay mensajes. Escribe el primero.</p>
            ) : null}
            {grupos.map((g) => (
              <div key={g.fecha} className="tarea-chat__grupo">
                <div className="tarea-chat__dia">{dia(g.fecha)}</div>
                {g.items.map((c) => (
                  <div
                    key={c.id}
                    className={`tarea-chat__fila${c.es_propio ? ' tarea-chat__fila--propia' : ''}`}
                  >
                    {!c.es_propio ? <Avatar comentario={c} /> : null}
                    <article
                      className={[
                        'tarea-chat__burbuja',
                        c.es_propio ? 'tarea-chat__burbuja--propia' : '',
                        c.autor_rol === 'maestro' ? 'tarea-chat__burbuja--maestro' : '',
                        c.eliminado ? 'tarea-chat__burbuja--eliminado' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="tarea-chat__meta">
                        <span className="tarea-chat__autor">{c.autor_nombre || 'Usuario'}</span>
                        <span className="tarea-chat__rol">{ROL_LABEL[c.autor_rol] ?? c.autor_rol}</span>
                        <span className="tarea-chat__hora">{hora(c.creado_en)}</span>
                        {puedeBorrar && !c.eliminado ? (
                          <button
                            type="button"
                            className="tarea-chat__borrar"
                            data-testid={`tarea-chat-borrar-${c.id}`}
                            onClick={() => setBorrar(c)}
                            aria-label="Borrar mensaje"
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        ) : null}
                      </div>
                      <p className="tarea-chat__texto">
                        {c.eliminado ? 'Mensaje eliminado' : c.texto}
                      </p>
                    </article>
                    {c.es_propio ? <Avatar comentario={c} /> : null}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(borrar)}
        title="Borrar mensaje"
        message="El mensaje dejará de verse en el chat."
        confirmLabel="Borrar"
        danger
        testId="tarea-chat-confirmar-borrar"
        onConfirm={() => borrar && borrarMut.mutate(borrar.id)}
        onCancel={() => setBorrar(null)}
      />
    </>
  )
}
