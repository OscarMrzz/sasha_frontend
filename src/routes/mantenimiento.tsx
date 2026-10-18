import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getEstadoMantenimiento, type EstadoMantenimiento } from '#/services/mantenimiento'

export const Route = createFileRoute('/mantenimiento')({
  ssr: false,
  component: MantenimientoPage,
})

/** Mismo intervalo que el sondeo global del provider. */
const POLL_MS = 15_000

function formatDesde(desde: string | null): string | null {
  if (!desde) return null
  const date = new Date(desde)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('es-HN', { dateStyle: 'long', timeStyle: 'short' })
}

function MantenimientoPage() {
  const [estado, setEstado] = useState<EstadoMantenimiento | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let vigente = true
    async function consultar() {
      try {
        const next = await getEstadoMantenimiento()
        if (!vigente) return
        setError(false)
        setEstado(next)
        // Cuando el sistema vuelve, se regresa al login.
        if (!next.activo) {
          window.location.assign('/login')
        }
      } catch {
        if (!vigente) return
        setError(true)
      }
    }
    void consultar()
    const id = window.setInterval(() => void consultar(), POLL_MS)
    return () => {
      vigente = false
      window.clearInterval(id)
    }
  }, [])

  const mensaje = estado?.mensaje?.trim() || estado?.motivo?.trim() || ''
  const mostrarMotivo =
    Boolean(estado?.motivo?.trim()) &&
    Boolean(estado?.mensaje?.trim()) &&
    estado?.motivo?.trim() !== estado?.mensaje?.trim()
  const desde = formatDesde(estado?.desde ?? null)

  return (
    <div className="login-page" data-theme="dark" data-testid="mantenimiento-page">
      <div className="login-card" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card-right" style={{ padding: '40px 48px' }}>
          <div className="login-header">
            <img src="/images/logo/gato.png" alt="" className="login-header__cat" />
            <h2>Sistema en mantenimiento</h2>
          </div>

          <p className="texto-muted" role="alert" style={{ textAlign: 'center', margin: '0 0 1rem' }}>
            {mensaje || 'Estamos realizando tareas de mantenimiento. Volveremos en breve.'}
          </p>

          {mostrarMotivo ? (
            <p
              className="texto-muted"
              style={{ textAlign: 'center', fontSize: '0.85rem', margin: '0 0 1rem' }}
            >
              {estado?.motivo}
            </p>
          ) : null}

          {desde ? (
            <p className="texto-muted" style={{ textAlign: 'center', fontSize: '0.85rem', margin: 0 }}>
              Desde el {desde}.
            </p>
          ) : null}

          {error ? (
            <p className="login-form__error" role="status" style={{ marginTop: '1rem' }}>
              No se pudo consultar el estado. Reintentando…
            </p>
          ) : (
            <p
              className="texto-muted"
              style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: '1rem' }}
            >
              La página volverá sola cuando el sistema esté disponible.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
