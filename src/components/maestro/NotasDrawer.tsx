import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Extension } from '@tiptap/core'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { Markdown } from '@tiptap/markdown'
import { TextSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { StickyNote, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { userMessageFromError } from '#/lib/api'
import {
  deleteNota,
  listNotas,
  updateNota,
  type Nota,
} from '#/services/notas'

/** Al Enter, convierte `# título` / `---` (estilo Obsidian). No toca listas. */
const MarkdownEnterHeading = Extension.create({
  name: 'markdownEnterHeading',
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor
        const { $from } = state.selection
        if (!$from.parent.isTextblock || $from.parent.type.name !== 'paragraph') return false
        for (let d = $from.depth; d > 0; d -= 1) {
          const name = $from.node(d).type.name
          if (name === 'listItem' || name === 'taskItem') return false
        }
        if ($from.parentOffset !== $from.parent.content.size) return false
        const text = $from.parent.textContent
        const task = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(text)
        if (task) {
          const checked = task[1].toLowerCase() === 'x'
          const title = task[2]
          return editor
            .chain()
            .focus()
            .deleteRange({ from: $from.before(), to: $from.after() })
            .toggleTaskList()
            .command(({ tr, dispatch }) => {
              if (!dispatch) return true
              const { $from: $f } = tr.selection
              let taskPos: number | null = null
              for (let d = $f.depth; d > 0; d -= 1) {
                if ($f.node(d).type.name === 'taskItem') {
                  taskPos = $f.before(d)
                  break
                }
              }
              if (taskPos != null) {
                tr.setNodeMarkup(taskPos, undefined, { checked })
              }
              if (title) {
                const para = $f.parent
                if (para.isTextblock && para.content.size === 0) {
                  tr.insertText(title)
                }
              }
              return true
            })
            .run()
        }
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(text.trim())) {
          const from = $from.before()
          const to = $from.after()
          const hr = editor.schema.nodes.horizontalRule.create()
          const tr = state.tr.replaceWith(from, to, hr)
          tr.setSelection(TextSelection.near(tr.doc.resolve(from + hr.nodeSize)))
          editor.view.dispatch(tr)
          return editor.commands.splitBlock()
        }
        const m = /^(#{1,3})\s+(.+)$/.exec(text)
        if (!m) return false
        const level = m[1].length as 1 | 2 | 3
        const title = m[2]
        const from = $from.before()
        const to = $from.after()
        const heading = editor.schema.nodes.heading.create(
          { level },
          title ? editor.schema.text(title) : undefined,
        )
        const tr = state.tr.replaceWith(from, to, heading)
        tr.setSelection(TextSelection.near(tr.doc.resolve(from + heading.nodeSize)))
        editor.view.dispatch(tr)
        return editor.commands.splitBlock()
      },
    }
  },
})

function formatFechaNota(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-HN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

export function NotasDrawer({
  open,
  onClose,
  asignacionDocenteId,
  focusNotaId = null,
}: {
  open: boolean
  onClose: () => void
  asignacionDocenteId: string
  focusNotaId?: string | null
}) {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [saving, setSaving] = useState(false)
  const loadedNotaIdRef = useRef<string | null>(null)

  const { data: notas = [] } = useQuery({
    queryKey: ['notas', asignacionDocenteId],
    queryFn: () => listNotas(asignacionDocenteId),
    enabled: open,
  })

  const selected = notas.find((n) => n.id === selectedId) ?? null

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown,
      MarkdownEnterHeading,
    ],
    content: '',
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'notas-md-editor',
        'data-testid': 'notas-contenido',
        'aria-label': 'Contenido de la nota',
      },
    },
  })

  useEffect(() => {
    if (!open) return
    if (focusNotaId) {
      setSelectedId(focusNotaId)
      return
    }
    if (notas.length && !selectedId) {
      setSelectedId(notas[0].id)
    }
  }, [open, focusNotaId, notas, selectedId])

  useEffect(() => {
    if (!editor) return
    if (!selected) {
      loadedNotaIdRef.current = null
      setTitulo('')
      if (!editor.isEmpty) {
        editor.commands.setContent('', { contentType: 'markdown' })
      }
      return
    }
    if (loadedNotaIdRef.current === selected.id) return
    loadedNotaIdRef.current = selected.id
    setTitulo(selected.titulo ?? '')
    editor.commands.setContent(selected.contenido || '', { contentType: 'markdown' })
  }, [editor, selected?.id])

  const saveAndClose = useCallback(async () => {
    if (!selected || !editor || saving) {
      onClose()
      return
    }
    const contenido = editor.getMarkdown()
    if (contenido.length > 8000) {
      toast.error('Máximo 8000 caracteres por nota')
      return
    }
    const sameTitulo = (titulo ?? '') === (selected.titulo ?? '')
    const sameContenido = contenido === (selected.contenido ?? '')
    if (sameTitulo && sameContenido) {
      onClose()
      return
    }
    setSaving(true)
    try {
      const updated = await updateNota(selected.id, {
        titulo,
        contenido,
      })
      qc.setQueryData<Nota[]>(['notas', asignacionDocenteId], (prev) => {
        if (!prev) return prev
        return prev.map((n) => (n.id === updated.id ? updated : n))
      })
      onClose()
    } catch (e) {
      toast.error(userMessageFromError(e))
    } finally {
      setSaving(false)
    }
  }, [selected, editor, saving, titulo, qc, asignacionDocenteId, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void saveAndClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, saveAndClose])

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNota(id),
    onSuccess: (_data, id) => {
      loadedNotaIdRef.current = null
      setSelectedId(null)
      qc.setQueryData<Nota[]>(['notas', asignacionDocenteId], (prev) =>
        prev ? prev.filter((n) => n.id !== id) : prev,
      )
      toast.success('Nota eliminada')
      onClose()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  if (!open) return null

  return (
    <div className="notas-drawer-root" data-testid="notas-drawer">
      <button
        type="button"
        className="notas-drawer__backdrop"
        aria-label="Cerrar"
        onClick={() => void saveAndClose()}
      />
      <aside className="notas-drawer notas-drawer--right" aria-label="Nota">
        <header className="notas-drawer__head">
          <div>
            <h2 className="notas-drawer__title">
              <StickyNote size={18} /> Nota
            </h2>
            {selected ? (
              <p className="texto-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.75rem' }}>
                {formatFechaNota(selected.created_at)} · se borra a los 14 días
              </p>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {selected ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                data-testid="notas-eliminar"
                onClick={() => deleteMut.mutate(selected.id)}
              >
                <Trash2 size={14} />
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void saveAndClose()}
              aria-label="Cerrar panel"
              disabled={saving}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="notas-drawer__editor notas-drawer__editor--solo">
          {selected ? (
            <>
              <input
                className="field__input"
                placeholder="Titulo"
                value={titulo}
                data-testid="notas-titulo"
                onChange={(e) => setTitulo(e.target.value)}
              />
              <EditorContent editor={editor} className="notas-drawer__md" />
            </>
          ) : (
            <div className="empty-state">Cargando nota…</div>
          )}
        </div>

        <footer className="notas-drawer__foot">
          <button
            type="button"
            className="btn btn--primary"
            data-testid="notas-listo"
            disabled={saving}
            onClick={() => void saveAndClose()}
          >
            {saving ? 'Guardando…' : 'Listo'}
          </button>
        </footer>
      </aside>
    </div>
  )
}
