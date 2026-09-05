import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '#/hooks/use-session'
import { roleLabel } from '#/helpers/permissions'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { session } = useSession()
  return (
    <div>
      <h1 className="page-title">Inicio</h1>
      <div
        style={{
          background: 'var(--sasha-bg-raised)',
          border: '1px solid var(--sasha-border-suave)',
          borderRadius: '8px',
          padding: '1.5rem',
          maxWidth: '640px',
        }}
      >
        <h2 className="texto-title" style={{ marginTop: 0, fontSize: '1.5rem' }}>
          Bienvenido a Sasha
        </h2>
        <p className="texto-muted">
          Código <strong className="texto-emphasis">{session?.code}</strong> · Rol activo{' '}
          <strong className="texto-emphasis">
            {session ? roleLabel(session.activeRole) : '—'}
          </strong>
        </p>
        <p className="texto-primary" style={{ marginBottom: 0 }}>
          Usa el menú lateral para navegar. Solo verás paneles permitidos por tu rol activo.
        </p>
      </div>
    </div>
  )
}
