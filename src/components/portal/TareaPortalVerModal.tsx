import { Download } from 'lucide-react'
import { useState } from 'react'
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
import { toastApiError } from '#/lib/api'
import { fechaLarga } from '#/services/disciplina'
import {
  adjuntoPortalArchivoPath,
  descargarAdjuntoPortal,
} from '#/services/portal'
import type { PortalAdjunto, PortalTarea } from '#/services/portal'

function estadoLabel(e: PortalTarea['estado']) {
  return e === 'revisada' ? 'Revisada' : 'Pendiente'
}

/**
 * Adjunto en el portal. Las imágenes se ven solas (solo imagen + descarga).
 * Los documentos muestran el ícono arriba, el nombre en su fila y solo se descargan
 * (sin vista previa).
 */
function AdjuntoItem({
  adjunto,
  alumnoId,
  onAmpliar,
}: {
  adjunto: PortalAdjunto
  /** Obligatorio para el rol `responsable`: el backend exige el hijo en el binario. */
  alumnoId?: string | null
  onAmpliar: (img: { src: string; alt: string }) => void
}) {
  const cat = categoriaAdjunto(adjunto.content_type, adjunto.nombre_original)
  const imagen = esImagenAdjunto(adjunto.content_type, adjunto.nombre_original)

  const descargar = () => {
    void descargarAdjuntoPortal(adjunto, alumnoId).catch((e) =>
      toastApiError(e, {
        method: 'GET',
        path: adjuntoPortalArchivoPath(adjunto.id, alumnoId),
        contexto: `Descargar adjunto "${adjunto.nombre_original}"`,
      }),
    )
  }

  // Imagen: sin ícono, nombre ni peso. Solo la imagen y el botón de descarga a todo el ancho.
  if (imagen) {
    return (
      <li
        className="adjunto-item adjunto-item--imagen"
        data-testid={`portal-adjunto-${adjunto.id}`}
      >
        <AdjuntoVista
          path={adjuntoPortalArchivoPath(adjunto.id, alumnoId)}
          contentType={adjunto.content_type}
          nombre={adjunto.nombre_original}
          onAmpliar={(src, alt) => onAmpliar({ src, alt })}
          testId={`portal-adjunto-vista-${adjunto.id}`}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm adjunto-item__descargar-ancho"
          data-testid={`portal-adjunto-descargar-${adjunto.id}`}
          aria-label={`Descargar ${adjunto.nombre_original}`}
          onClick={descargar}
        >
          <Download size={16} aria-hidden /> Descargar
        </button>
      </li>
    )
  }

  // Documentos (PDF/Word/Excel): ícono arriba, nombre en su propia fila y solo descarga.
  return (
    <li
      className="adjunto-item adjunto-item--doc"
      data-testid={`portal-adjunto-${adjunto.id}`}
    >
      <div className="adjunto-item__doc">
        <span className="adjunto-item__icono">
          <AdjuntoIcono contentType={adjunto.content_type} nombre={adjunto.nombre_original} />
        </span>
        <span className="adjunto-item__titulo">{adjunto.nombre_original}</span>
        <span className="app-list__sub">
          {etiquetaCategoria(cat)} · {formatoPeso(adjunto.size_bytes)}
        </span>
      </div>
      <button
        type="button"
        className="btn btn--ghost btn--sm adjunto-item__descargar-ancho"
        data-testid={`portal-adjunto-descargar-${adjunto.id}`}
        onClick={descargar}
      >
        <Download size={16} aria-hidden /> Descargar
      </button>
    </li>
  )
}

/** Detalle de una tarea para el portal (padre/alumno). No muestra los puntos. */
export function TareaPortalVerModal({
  tarea,
  alumnoId,
  onClose,
}: {
  tarea: PortalTarea | null
  /** Hijo elegido por el responsable; `null`/vacío = el propio alumno. */
  alumnoId?: string | null
  onClose: () => void
}) {
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
                    <AdjuntoItem
                      key={a.id}
                      adjunto={a}
                      alumnoId={alumnoId}
                      onAmpliar={setAmpliada}
                    />
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
