import { forwardRef, memo, useImperativeHandle, useRef } from 'react'

/**
 * Carnet estudiantil réplica del ejemplo `notas/EJEMPLOS/carnet_estudiantil.html`.
 * Renderiza dos SVG inline (frente y reverso) con `viewBox="0 0 380 600"` y expone
 * las referencias a ambos SVG para poder exportarlos (PDF, PNG, SVG).
 */

export interface CarnetAlumno {
  nombre: string
  codigo: string
  dni: string
  grado: string
  jornada: string
  vigencia: string
}

export interface CarnetRef {
  front: SVGSVGElement | null
  back: SVGSVGElement | null
}

export interface CarnetEstudiantilProps {
  alumno?: CarnetAlumno | null
  institucion?: string
  /** Fecha de emisión en formato `dd/mm/aaaa`. Por defecto, la fecha de hoy. */
  fechaEmision?: string
  /** Escala visual del carnet (1 = 380 px de ancho). No afecta la exportación. */
  scale?: number
  className?: string
}

/** Formatea una fecha como `dd/mm/aaaa` con ceros a la izquierda. */
function formatearFecha(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${fecha.getFullYear()}`
}

/**
 * Logo placeholder del ejemplo. Se conserva el diseño, pero embebido como
 * data-URI base64 para que rasterice de forma fiable al exportar PNG/PDF.
 */
const LOGO_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAyNCAyNCcgZmlsbD0nbm9uZScgc3Ryb2tlPSd3aGl0ZScgc3Ryb2tlLXdpZHRoPScxLjUnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcgc3Ryb2tlLWxpbmVqb2luPSdyb3VuZCc+PHJlY3Qgd2lkdGg9JzE4JyBoZWlnaHQ9JzE4JyB4PSczJyB5PSczJyByeD0nMicgcnk9JzInLz48Y2lyY2xlIGN4PSc5JyBjeT0nOScgcj0nMicvPjxwYXRoIGQ9J20yMSAxNS0zLjA4Ni0zLjA4NmEyIDIgMCAwIDAtMi44MjggMEw2IDIxJy8+PC9zdmc+'

/**
 * Clases de etiqueta/valor compartidas por el frente y el reverso. Todas usan el
 * prefijo `carnet-` para no filtrar estilos globales al resto de la app.
 */
const CARNET_LABEL_STYLE = `
  .carnet-label { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; fill: #64748b; }
  .carnet-value { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; fill: #0f172a; }
`

const FRONT_STYLE = `
  .carnet-card-title { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 800; fill: #ffffff; text-anchor: middle; letter-spacing: 1px; }
  .carnet-card-subtitle { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; fill: #ffffff; opacity: 0.9; text-anchor: middle; letter-spacing: 2px; }
  .carnet-student-name { font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 800; fill: #0f172a; text-anchor: middle; }
  .carnet-student-role { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; fill: #e11d48; text-anchor: middle; letter-spacing: 2px; }
${CARNET_LABEL_STYLE}
`

const BACK_STYLE = `
  .carnet-back-title { font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 800; fill: #ffffff; text-anchor: middle; letter-spacing: 1px; }
  .carnet-back-subtitle { font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 600; fill: #ffffff; opacity: 0.8; text-anchor: middle; letter-spacing: 1px; }
  .carnet-back-text { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 500; fill: #475569; }
  .carnet-back-brand { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 800; fill: #ffffff; text-anchor: middle; letter-spacing: 4px; opacity: 0.92; }
${CARNET_LABEL_STYLE}
`

function limpiar(v: string | undefined, fallback: string) {
  const t = v?.trim()
  return t ? t : fallback
}

export const CarnetEstudiantil = memo(
  forwardRef<CarnetRef, CarnetEstudiantilProps>(function CarnetEstudiantil(
    { alumno, institucion, fechaEmision, scale = 1, className },
    ref,
  ) {
    const frontRef = useRef<SVGSVGElement>(null)
    const backRef = useRef<SVGSVGElement>(null)

    useImperativeHandle(
      ref,
      () => ({
        get front() {
          return frontRef.current
        },
        get back() {
          return backRef.current
        },
      }),
      [],
    )

    const nombre = limpiar(alumno?.nombre, 'NOMBRE ESTUDIANTE')
    const codigo = limpiar(alumno?.codigo, '-')
    const dni = limpiar(alumno?.dni, '-')
    const grado = limpiar(alumno?.grado, '—')
    const jornada = limpiar(alumno?.jornada, '—')
    const vigencia = limpiar(alumno?.vigencia, '—')

    const instNombre = (institucion ?? '').trim()
    const tituloInstitucion = instNombre || 'INSTITUCIÓN EDUCATIVA'
    const lineaInstitucion = instNombre
      ? `Inst. Educativa ${instNombre}`
      : 'institución'

    const fecha = (fechaEmision ?? '').trim() || formatearFecha(new Date())

    const ancho = 380 * scale

    return (
      <div
        className={`carnet-par${className ? ` ${className}` : ''}`}
        data-testid="carnet-estudiantil"
      >
        <div className="carnet-par__lado">
          <span className="carnet-par__etiqueta">Frente</span>
          <div className="carnet-tarjeta" style={{ width: ancho }}>
            <svg
              ref={frontRef}
              id="carnet-svg-front"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 380 600"
              width="380"
              height="600"
              role="img"
              aria-label={`Carnet de ${nombre}`}
            >
              <defs>
                <style>{FRONT_STYLE}</style>
                <clipPath id="avatar-clip">
                  <circle cx="190" cy="200" r="68" />
                </clipPath>
              </defs>

              {/* Fondo Blanco Base del Carnet */}
              <rect width="380" height="600" fill="#ffffff" rx="16" />

              {/* Zona Superior Roja Solicitada */}
              <path
                d="M 0 0 L 380 0 L 380 200 L 220 280 L 0 160 Z"
                fill="#e11d48"
              />

              {/* Elemento Azul Oscuro Superior Esquina Izquierda */}
              <path d="M 0 0 L 160 0 L 0 230 Z" fill="#1e293b" />

              {/* Curva Azul Oscuro Inferior de la cabecera */}
              <path
                d="M 0 200 C 120 280, 260 320, 380 180 L 380 220 C 260 350, 120 300, 0 220 Z"
                fill="#1e293b"
              />

              {/* Encabezado / Contenedor del Logo */}
              <g transform="translate(190, 22)">
                <image
                  id="front-logo-img"
                  x="-24"
                  y="0"
                  width="48"
                  height="48"
                  href={LOGO_PLACEHOLDER}
                />
                <text y="66" className="carnet-card-title">
                  {tituloInstitucion}
                </text>
                <text y="82" className="carnet-card-subtitle">
                  INSTITUCIÓN EDUCATIVA
                </text>
              </g>

              {/* Anillos de la Foto de Perfil */}
              <circle cx="190" cy="200" r="77" fill="#e11d48" />
              <circle cx="190" cy="200" r="72" fill="#ffffff" />
              <circle cx="190" cy="200" r="68" fill="#e2e8f0" />

              {/* Avatar Ilustrado de Muestra (se conserva tal cual) */}
              <g clipPath="url(#avatar-clip)">
                <circle cx="190" cy="180" r="28" fill="#475569" />
                <path
                  d="M 140 240 C 140 200, 240 200, 240 240 Z"
                  fill="#334155"
                />
              </g>

              {/* Información del Estudiante */}
              <text
                x="190"
                y="318"
                id="svg-txt-name"
                className="carnet-student-name"
              >
                {nombre}
              </text>
              <text x="190" y="338" className="carnet-student-role">
                ESTUDIANTE
              </text>

              <line
                x1="40"
                y1="358"
                x2="340"
                y2="358"
                stroke="#f1f5f9"
                strokeWidth="2"
              />

              <g transform="translate(50, 395)">
                <text x="0" y="0" className="carnet-label">
                  CÓDIGO:
                </text>
                <text x="110" y="0" id="svg-txt-code" className="carnet-value">
                  {codigo}
                </text>

                <text x="0" y="36" className="carnet-label">
                  DNI / NO. ID:
                </text>
                <text x="110" y="36" id="svg-txt-dni" className="carnet-value">
                  {dni}
                </text>

                <text x="0" y="72" className="carnet-label">
                  GRADO:
                </text>
                <text
                  x="110"
                  y="72"
                  id="svg-txt-grade"
                  className="carnet-value"
                >
                  {grado}
                </text>

                <text x="0" y="108" className="carnet-label">
                  JORNADA:
                </text>
                <text x="110" y="108" className="carnet-value">
                  {jornada}
                </text>
              </g>

              {/* Decoración Onda Inferior */}
              <path
                d="M 0 560 Q 190 600 380 550 L 380 600 L 0 600 Z"
                fill="#1e293b"
              />
              <path
                d="M 0 575 Q 190 605 380 565 L 380 600 L 0 600 Z"
                fill="#e11d48"
              />
            </svg>
          </div>
        </div>

        <div className="carnet-par__lado">
          <span className="carnet-par__etiqueta">Reverso</span>
          <div className="carnet-tarjeta" style={{ width: ancho }}>
            <svg
              ref={backRef}
              id="carnet-svg-back"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 380 600"
              width="380"
              height="600"
              role="img"
              aria-label={`Reverso del carnet de ${nombre}`}
            >
              <defs>
                <style>{BACK_STYLE}</style>
              </defs>

              {/* Fondo Blanco Base */}
              <rect width="380" height="600" fill="#ffffff" rx="16" />

              {/* Encabezado Curvo Azul Oscuro y Rojo */}
              <path
                d="M 0 0 L 380 0 L 380 120 C 250 160, 130 60, 0 110 Z"
                fill="#1e293b"
              />
              <path
                d="M 100 0 L 380 0 L 380 100 C 260 130, 180 30, 100 0 Z"
                fill="#e11d48"
              />

              <g transform="translate(250, 28)">
                <image
                  id="back-logo-img"
                  x="-18"
                  y="0"
                  width="36"
                  height="36"
                  href={LOGO_PLACEHOLDER}
                />
                <text x="0" y="52" className="carnet-back-title">
                  {tituloInstitucion}
                </text>
                <text x="0" y="66" className="carnet-back-subtitle">
                  CARNET OFICIAL
                </text>
              </g>

              {/* Normativa y Datos de la Institución */}
              <g transform="translate(40, 180)">
                <text x="0" y="0" className="carnet-label" fill="#e11d48">
                  CONDICIONES DE USO
                </text>
                <text x="0" y="24" className="carnet-back-text">
                  • Este carnet es personal e intransferible.
                </text>
                <text x="0" y="46" className="carnet-back-text">
                  • Acredita al portador como estudiante activo
                </text>
                <text x="0" y="64" className="carnet-back-text">
                  {`  de la ${lineaInstitucion}.`}
                </text>
                <text x="0" y="86" className="carnet-back-text">
                  • En caso de extravío, notificar a secretaría.
                </text>
              </g>

              {/* Bloque de Vigencia de 1 Año */}
              <g transform="translate(40, 340)">
                <rect
                  x="0"
                  y="0"
                  width="300"
                  height="70"
                  rx="10"
                  fill="#f8fafc"
                  stroke="#e2e8f0"
                  strokeWidth="1.5"
                />

                <text x="16" y="28" className="carnet-label">
                  FECHA DE EMISIÓN:
                </text>
                <text x="150" y="28" className="carnet-value">
                  {fecha}
                </text>

                <text x="16" y="52" className="carnet-label">
                  VIGENCIA (1 AÑO):
                </text>
                <text
                  x="150"
                  y="52"
                  id="svg-txt-validity"
                  className="carnet-value"
                  fill="#e11d48"
                >
                  {vigencia}
                </text>
              </g>

              {/* Decoración Inferior */}
              <path
                d="M 0 540 C 120 490, 280 580, 380 510 L 380 600 L 0 600 Z"
                fill="#1e293b"
              />
              <path
                d="M 0 555 C 120 510, 280 595, 380 530 L 380 600 L 0 600 Z"
                fill="#e11d48"
              />

              {/* Marca de la plataforma (último nodo, sobre la decoración) */}
              <text x="190" y="585" className="carnet-back-brand">
                SASHA
              </text>
            </svg>
          </div>
        </div>
      </div>
    )
  }),
)

CarnetEstudiantil.displayName = 'CarnetEstudiantil'
