import { Download, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AdjuntoIcono } from '#/components/archivos/AdjuntoIcono'
import { AdjuntoVista } from '#/components/archivos/AdjuntoVista'
import { VisorImagen } from '#/components/portal/VisorImagen'
import { Modal } from '#/components/ui/Modal'
import {
  categoriaAdjunto,
  esImagenAdjunto,
  etiquetaCategoria,
  formatoPeso,
} from '#/helpers/adjuntos'
import { userMessageFromError } from '#/lib/api'
import { fechaLarga } from '#/services/disciplina'
import {
  adjuntoPortalArchivoPath,
  descargarAdjuntoPortal,
} from '#/services/portal'
import type { PortalAdjunto, PortalTarea } from '#/services/portal'

function estadoLabel(e: PortalTarea['estado']) {
  return e === 'revisada' ? 'Revisada' : 'Pendiente'
}

/** Fila de un adjunto en el portal: ícono, título, peso, descargar y previsualización diferida. */
function AdjuntoItem({
  adjunto,
  onAmpliar,
}: {
  adjunto: PortalAdjunto
  onAmpliar: (img: { src: string; alt: string }) => void
}) {
  // La previsualización es diferida: no monta el fetch hasta que se pulsa «Ver»
  // (evita lanzar un fetch por cada adjunto al abrir la tarea).
  const [ver, setVer] = useState(false)
  const cat = categoriaAdjunto(adjunto.content_type, adjunto.nombre_original)
  const imagen = esImagenAdjunto(adjunto.content_type, adjunto.nombre_original)
  const previsualiza = imagen || cat === 'pdf'

  return (
    <li className="adjunto-item" data-testid={`portal-adjunto-${adjunto.id}`}>
      <div className="adjunto-item__fila">
        <span className="adjunto-item__icono">
          <AdjuntoIcono contentType={adjunto.content_type} nombre={adjunto.nombre_original} />
        </span>
        <div className="adjunto-item__cuerpo">
          <span className="adjunto-item__titulo">{adjunto.nombre_original}</span>
          <span className="app-list__sub">
            {etiquetaCategoria(cat)} · {formatoPeso(adjunto.size_bytes)}
          </span>
        </div>
        <div className="adjunto-item__acciones">
          {previsualiza ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              data-testid={`portal-adjunto-ver-${adjunto.id}`}
              onClick={() => setVer((v) => !v)}
            >
              {ver ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              <span>{ver ? 'Ocultar' : 'Ver'}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            data-testid={`portal-adjunto-descargar-${adjunto.id}`}
            onClick={() => {
              void descargarAdjuntoPortal(adjunto).catch((e) =>
                toast.error(userMessageFromError(e)),
              )
            }}
          >
            <Download size={16} aria-hidden /> Descargar
          </button>
        </div>
      </div>
      {previsualiza && ver ? (
        <AdjuntoVista
          path={adjuntoPortalArchivoPath(adjunto.id)}
          contentType={adjunto.content_type}
          nombre={adjunto.nombre_original}
          onAmpliar={imagen ? (src, alt) => onAmpliar({ src, alt }) : undefined}
          testId={`portal-adjunto-vista-${adjunto.id}`}
        />
      ) : null}
    </li>
  )
}

/** Detalle de una tarea para el portal (padre/alumno). No muestra los puntos. */
export function TareaPortalVerModal({ tarea, onClose }: { tarea: PortalTarea | null; onClose: () => void }) {
  const [ampliada, setAmpliada] = useState<{ src: string; alt: string } | null>(null)

  const filas: [string, string][] = tarea
    ? [
        ['Clase', tarea.curso_nombre || '—'],
        ['Tipo', tarea.tipo_tarea_nombre || '—'],
        ['Fecha de entrega', fechaLarga(tarea.fecha_entrega)],
        ['Estado', estadoLabel(tarea.estado)],
      ]
    : []

  const adjuntos = tarea?.adjuntos ?? []

  return (
    <>
      <Modal
        open={Boolean(tarea)}
        title="Detalle de la tarea"
        onClose={onClose}
        testId="portal-tarea-ver-modal"
        footer={
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Entendido
          </button>
        }
      >
        {tarea ? (
          <>
            <h3 className="ficha__section-title" style={{ marginTop: 0 }}>
              {tarea.titulo}
            </h3>
            <table className="ficha-table" data-testid="portal-tarea-ver-detalle">
              <tbody>
                {filas.map(([k, v]) => (
                  <tr key={k}>
                    <th style={{ width: '44%' }}>{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h4 className="ficha__section-title" style={{ marginTop: '0.85rem', marginBottom: '0.35rem' }}>
              Detalle
            </h4>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{tarea.descripcion || 'Sin detalle.'}</p>

            <section
              className="adjunto-seccion"
              data-testid="portal-tarea-archivos-seccion"
              style={{ marginTop: '0.85rem' }}
            >
              <h4 className="ficha__section-title" style={{ marginBottom: '0.35rem' }}>
                Archivos ({adjuntos.length})
              </h4>
              {adjuntos.length === 0 ? (
                <p className="texto-muted" data-testid="portal-tarea-archivos-vacio">
                  Esta tarea no tiene archivos.
                </p>
              ) : (
                <ul className="app-list" data-testid="portal-tarea-archivos">
                  {adjuntos.map((a) => (
                    <AdjuntoItem key={a.id} adjunto={a} onAmpliar={setAmpliada} />
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </Modal>

      {ampliada ? (
        <VisorImagen
          src={ampliada.src}
          alt={ampliada.alt}
          onClose={() => setAmpliada(null)}
        />
      ) : null}
    </>
  )
}
