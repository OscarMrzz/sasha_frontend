import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MoreVertical } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AsistenciaGridModal } from '#/components/asistencia/AsistenciaGridModal'
import { MaestroHorarioView } from '#/components/horarios/MaestroHorarioView'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { AvisoBanner } from '#/components/layout/AvisoBanner'
import { Modal } from '#/components/ui/Modal'
import { TareaCreateModal } from '#/components/tareas/TareaCreateModal'
import { listMateriasAsistencia, type AsistenciaMateria } from '#/services/asistencia'

export const Route = createFileRoute('/_app/maestro/')({
  component: () => (
    <RequirePermission permission="asistencia:get">
      <MaestroHubPage />
    </RequirePermission>
  ),
})

type CtxState = { x: number; y: number; row: AsistenciaMateria }

function claseLabel(m: AsistenciaMateria) {
  return `${m.curso_nombre} · ${m.grado_nombre} sec${m.seccion_nombre}`
}

function MaestroHubPage() {
  const navigate = useNavigate()
  const { can } = useCan()
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['asistencia-materias'],
    queryFn: listMateriasAsistencia,
  })
  const [ctx, setCtx] = useState<CtxState | null>(null)
  const [ver, setVer] = useState<AsistenciaMateria | null>(null)
  const [pasar, setPasar] = useState<AsistenciaMateria | null>(null)
  const [tarea, setTarea] = useState<AsistenciaMateria | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const goIr = (row: AsistenciaMateria) => {
    void navigate({
      to: '/maestro/clases/$asignacionId',
      params: { asignacionId: row.asignacion_docente_id },
    })
  }

  return (
    <div className="maestro-hub" data-testid="maestro-hub">
      <AvisoBanner />
      <header className="maestro-hub__header">
        <h1 className="page-title" style={{ margin: 0 }}>
          Mis clases
        </h1>
        <p className="texto-muted" style={{ margin: '0.35rem 0 0' }}>
          Elige una clase para entrar, o usa el horario de abajo.
        </p>
      </header>

      {isLoading ? (
        <div className="empty-state">Cargando clases…</div>
      ) : isError ? (
        <div className="empty-state" data-testid="maestro-hub-error">
          Hay problemas de conexión.
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state" data-testid="maestro-hub-empty">
          No hay clases en el periodo activo con horario publicado.
        </div>
      ) : (
        <div className="maestro-hub__cards" data-testid="maestro-hub-cards">
          {data.map((m) => (
            <article
              key={m.asignacion_docente_id}
              className="maestro-hub__card"
              data-testid={`maestro-hub-card-${m.asignacion_docente_id}`}
              onContextMenu={(e) => {
                e.preventDefault()
                setCtx({ x: e.clientX, y: e.clientY, row: m })
              }}
            >
              <div className="maestro-hub__card-top">
                <h2 className="maestro-hub__card-title">{m.curso_nombre}</h2>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm maestro-hub__card-menu"
                  aria-label="Menú de clase"
                  data-testid={`maestro-hub-card-menu-${m.asignacion_docente_id}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setCtx({ x: r.right - 8, y: r.bottom + 4, row: m })
                  }}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
              <p className="maestro-hub__card-meta">
                {m.grado_nombre} · sec{m.seccion_nombre}
              </p>
              <p className="maestro-hub__card-meta texto-muted">{m.modalidad_nombre}</p>
              <button
                type="button"
                className="btn btn--primary btn--sm maestro-hub__card-ir"
                data-testid={`maestro-hub-ir-${m.asignacion_docente_id}`}
                onClick={() => goIr(m)}
              >
                Ir
              </button>
            </article>
          ))}
        </div>
      )}

      <section className="maestro-hub__horario" data-testid="maestro-hub-horario">
        <MaestroHorarioView title="Mi horario" />
      </section>

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          role="menu"
          data-testid="maestro-hub-ctx"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="ctx-menu__item"
            role="menuitem"
            data-testid="maestro-hub-ctx-ver"
            onClick={() => {
              setVer(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
          {can('asistencia:post') ? (
            <button
              type="button"
              className="ctx-menu__item"
              role="menuitem"
              data-testid="maestro-hub-ctx-asistencia"
              onClick={() => {
                setPasar(ctx.row)
                closeCtx()
              }}
            >
              Pasar lista
            </button>
          ) : null}
          {can('tareas:post') ? (
            <button
              type="button"
              className="ctx-menu__item"
              role="menuitem"
              data-testid="maestro-hub-ctx-tareas"
              onClick={() => {
                setTarea(ctx.row)
                closeCtx()
              }}
            >
              Agregar tarea
            </button>
          ) : null}
        </div>
      ) : null}

      <Modal open={Boolean(ver)} title="Clase" onClose={() => setVer(null)}>
        {ver ? (
          <div data-testid="maestro-hub-ver">
            <p>
              <strong>Curso:</strong> {ver.curso_nombre}
            </p>
            <p>
              <strong>Grado / sección:</strong> {ver.grado_nombre} · sec{ver.seccion_nombre}
            </p>
            <p>
              <strong>Modalidad:</strong> {ver.modalidad_nombre}
            </p>
            <p>
              <strong>Periodo:</strong> {ver.periodo_nombre}
            </p>
          </div>
        ) : null}
      </Modal>

      {pasar ? (
        <AsistenciaGridModal materia={pasar} mode="pasar" onClose={() => setPasar(null)} />
      ) : null}

      {tarea ? (
        <TareaCreateModal
          asignacionDocenteId={tarea.asignacion_docente_id}
          periodoAcademicoId={tarea.periodo_academico_id}
          claseLabel={claseLabel(tarea)}
          onClose={() => setTarea(null)}
        />
      ) : null}
    </div>
  )
}
