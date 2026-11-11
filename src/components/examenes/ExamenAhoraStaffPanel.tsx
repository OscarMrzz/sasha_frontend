import { ExamenAhoraPanel } from '#/components/examenes/ExamenAhoraPanel'
import { agruparExamenesSupervision } from '#/lib/examenes-supervision'
import type { ExamenAhoraResponse } from '#/services/examenes'

export function ExamenAhoraStaffPanel({ data }: { data: ExamenAhoraResponse }) {
  const grupos = agruparExamenesSupervision(data.examenes)
  if (grupos.length === 0) return <ExamenAhoraPanel data={data} readOnly />
  return (
    <div className="examen-ahora" data-testid="examen-supervision-grupos">
      {grupos.map((grupo) => (
        <section key={grupo.key} data-testid="examen-supervision-grupo">
          <header className="maestro-examenes__header">
            <div>
              <h2 className="page-title" style={{ margin: '1rem 0 0.35rem' }}>
                {grupo.responsables.length
                  ? grupo.responsables.join(' · ')
                  : 'Sin maestro responsable asignado'}
              </h2>
              <p className="texto-muted" style={{ margin: '0 0 1rem' }}>
                {grupo.secciones.join(' · ')}
              </p>
            </div>
          </header>
          <ExamenAhoraPanel
            data={{ ...data, examenes: grupo.examenes, siguiente: undefined }}
            readOnly
          />
        </section>
      ))}
    </div>
  )
}
