import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { RequirePermission } from '#/components/gates/Can'
import {
  getCounts,
  getPanelAsistencia,
  getPanelCursoGrado,
  getPanelMaestros,
} from '#/services/estadisticas'

export const Route = createFileRoute('/_app/estadisticas')({ component: EstadisticasPage })

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: 'var(--sasha-bg-raised)',
        border: '1px solid var(--sasha-border-suave)',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        minWidth: 140,
      }}
    >
      <p className="texto-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
        {label}
      </p>
      <p className="texto-title" style={{ margin: '0.35rem 0 0', fontSize: '1.75rem' }}>
        {value}
      </p>
    </div>
  )
}

function JsonSection({ title, data }: { title: string; data: unknown }) {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h3 className="texto-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <pre
        style={{
          background: 'var(--sasha-bg-raised)',
          border: '1px solid var(--sasha-border-suave)',
          borderRadius: '8px',
          padding: '1rem',
          overflow: 'auto',
          fontSize: '0.8rem',
          maxHeight: 320,
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  )
}

function EstadisticasPage() {
  const counts = useQuery({ queryKey: ['stats-counts'], queryFn: getCounts })
  const cursoGrado = useQuery({ queryKey: ['stats-curso-grado'], queryFn: getPanelCursoGrado })
  const asistencia = useQuery({ queryKey: ['stats-asistencia'], queryFn: getPanelAsistencia })
  const maestros = useQuery({ queryKey: ['stats-maestros'], queryFn: getPanelMaestros })

  const loading = counts.isLoading || cursoGrado.isLoading

  if (loading) return <div className="empty-state">Cargando estadísticas…</div>

  const c = counts.data

  return (
    <RequirePermission permission="estadisticas:get">
      <h1 className="page-title">Estadísticas</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }} data-testid="stats-counts">
        <StatCard label="Alumnos" value={c?.alumnos ?? 0} />
        <StatCard label="Maestros" value={c?.maestros ?? 0} />
        <StatCard label="Matrículas" value={c?.matriculas ?? 0} />
        <StatCard label="Obligaciones en mora" value={c?.obligaciones_mora ?? 0} />
        <StatCard label="Tareas" value={c?.tareas ?? 0} />
      </div>

      <JsonSection title="Panel curso por grado" data={cursoGrado.data ?? []} />
      <JsonSection title="Panel asistencia" data={asistencia.data ?? []} />
      <JsonSection title="Panel maestros" data={maestros.data ?? []} />
    </RequirePermission>
  )
}
