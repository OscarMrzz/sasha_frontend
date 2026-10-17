import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AdjuntoIcono } from '#/components/archivos/AdjuntoIcono'
import { AdjuntoVista } from '#/components/archivos/AdjuntoVista'
import { AdjuntoPicker } from '#/components/tareas/AdjuntoPicker'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { useCan } from '#/components/gates/Can'
import { VisorImagen } from '#/components/portal/VisorImagen'
import {
  esImagenAdjunto,
  etiquetaCategoria,
  categoriaAdjunto,
  formatoPeso,
  MAX_ADJUNTOS_TAREA_DEFAULT,
  MAX_PESO_ARCHIVO_MB_DEFAULT,
  previsualizaAdjunto,
} from '#/helpers/adjuntos'
import { userMessageFromError } from '#/lib/api'
import {
  adjuntoArchivoPath,
  deleteAdjunto,
  descargarAdjunto,
  listAdjuntos,
  subirAdjunto,
} from '#/services/tareas'
import type { TareaAdjunto } from '#/services/tareas'

/**
 * Sección **Archivos** de una tarea para el maestro y los roles con permisos:
 * lista con ícono y peso, previsualización (imagen/PDF), descarga, borrado y
 * subida (cámara o archivo). Respeta el máximo de archivos del periodo.
 */
export function AdjuntosTarea({
  tareaId,
  maxArchivos = MAX_ADJUNTOS_TAREA_DEFAULT,
  maxPesoMB = MAX_PESO_ARCHIVO_MB_DEFAULT,
}: {
  tareaId: string
  maxArchivos?: number
  maxPesoMB?: number
}) {
  const qc = useQueryClient()
  const { can } = useCan()
  const editable = can('tareas:put')
  const [ver, setVer] = useState<string | null>(null)
  const [porBorrar, setPorBorrar] = useState<TareaAdjunto | null>(null)
  const [ampliada, setAmpliada] = useState<{ src: string; alt: string } | null>(null)

  const { data: adjuntos = [], isLoading, isError } = useQuery({
    queryKey: ['tarea-adjuntos', tareaId],
    queryFn: () => listAdjuntos(tareaId),
    enabled: Boolean(tareaId),
  })

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ['tarea-adjuntos', tareaId] })
  }

  const subir = useMutation({
    mutationFn: (file: File) => subirAdjunto(tareaId, file),
    onSuccess: (a) => {
      toast.success(`Archivo "${a.nombre_original}" cargado`)
      invalidar()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const borrar = useMutation({
    mutationFn: (id: string) => deleteAdjunto(tareaId, id),
    onSuccess: () => {
      toast.success('Archivo eliminado')
      invalidar()
      setPorBorrar(null)
    },
    onError: (e) => {
      toast.error(userMessageFromError(e))
      setPorBorrar(null)
    },
  })

  const alTope = adjuntos.length >= maxArchivos

  return (
    <section className="adjunto-seccion" data-testid="tarea-archivos">
      <h4 className="ficha__section-title" style={{ marginBottom: '0.35rem' }}>
        Archivos ({adjuntos.length}/{maxArchivos})
      </h4>

      {isLoading ? (
        <p className="texto-muted">Cargando archivos…</p>
      ) : isError ? (
        <p className="texto-muted" data-testid="tarea-archivos-error">
          No se pudieron cargar los archivos.
        </p>
      ) : adjuntos.length === 0 ? (
        <p className="texto-muted" data-testid="tarea-archivos-vacio">
          Sin archivos.
        </p>
      ) : (
        <ul className="app-list" data-testid="tarea-archivos-lista">
          {adjuntos.map((a) => {
            const cat = categoriaAdjunto(a.content_type, a.nombre_original)
            const puedeVer = previsualizaAdjunto(a.content_type, a.nombre_original)
            const abierto = ver === a.id
            return (
              <li key={a.id} className="adjunto-item" data-testid={`tarea-adjunto-item-${a.id}`}>
                <div className="adjunto-item__fila">
                  <span className="adjunto-item__icono">
                    <AdjuntoIcono contentType={a.content_type} nombre={a.nombre_original} />
                  </span>
                  <div className="adjunto-item__cuerpo">
                    <span className="adjunto-item__titulo">{a.nombre_original}</span>
                    <span className="app-list__sub">
                      {etiquetaCategoria(cat)} · {formatoPeso(a.size_bytes)}
                    </span>
                  </div>
                  <div className="adjunto-item__acciones">
                    {puedeVer ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        data-testid={`tarea-adjunto-ver-${a.id}`}
                        onClick={() => setVer(abierto ? null : a.id)}
                      >
                        {abierto ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                        <span>{abierto ? 'Ocultar' : 'Ver'}</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      data-testid={`tarea-adjunto-descargar-${a.id}`}
                      onClick={() => {
                        void descargarAdjunto(tareaId, a).catch((e) =>
                          toast.error(userMessageFromError(e)),
                        )
                      }}
                    >
                      <Download size={16} aria-hidden />
                      <span>Descargar</span>
                    </button>
                    {editable ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        aria-label={`Eliminar ${a.nombre_original}`}
                        data-testid={`tarea-adjunto-eliminar-${a.id}`}
                        onClick={() => setPorBorrar(a)}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
                {abierto ? (
                  <AdjuntoVista
                    path={adjuntoArchivoPath(tareaId, a.id)}
                    contentType={a.content_type}
                    nombre={a.nombre_original}
                    onAmpliar={
                      esImagenAdjunto(a.content_type, a.nombre_original)
                        ? (src, alt) => setAmpliada({ src, alt })
                        : undefined
                    }
                    testId={`tarea-adjunto-vista-${a.id}`}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {editable ? (
        <div style={{ marginTop: '0.75rem' }}>
          {alTope ? (
            <p className="texto-muted" data-testid="tarea-archivos-tope">
              Se alcanzó el máximo de {maxArchivos} archivos por tarea.
            </p>
          ) : (
            <AdjuntoPicker
              onFile={(file) => subir.mutate(file)}
              maxMB={maxPesoMB}
              busy={subir.isPending}
            />
          )}
          <p className="texto-muted" style={{ fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
            Hasta {maxArchivos} archivos · {maxPesoMB} MB por archivo · imágenes, PDF, Word o Excel.
          </p>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(porBorrar)}
        testId="confirm-eliminar-adjunto"
        title="Eliminar archivo"
        message={`¿Eliminar "${porBorrar?.nombre_original ?? ''}"?`}
        danger
        confirmLabel="Eliminar"
        confirmDisabled={borrar.isPending}
        onConfirm={() => porBorrar && borrar.mutate(porBorrar.id)}
        onCancel={() => setPorBorrar(null)}
      />

      {ampliada ? (
        <VisorImagen
          src={ampliada.src}
          alt={ampliada.alt}
          onClose={() => setAmpliada(null)}
        />
      ) : null}
    </section>
  )
}
