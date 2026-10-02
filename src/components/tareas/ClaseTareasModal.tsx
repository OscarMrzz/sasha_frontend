import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { SearchInput } from '#/components/ui/SearchInput'
import { getClaseTareas, labelCriterioModo } from '#/services/tareas'
import type { ClaseResumen, TareaDetalle } from '#/services/tareas'

type Momento = 'semana' | 'futura' | 'pasada'

function isoLocal(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Lunes y domingo de la semana actual en formato YYYY-MM-DD. */
function semanaActual() {
  const hoy = new Date()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  return { desde: isoLocal(lunes), hasta: isoLocal(domingo) }
}

function momentoDe(t: TareaDetalle, sem: { desde: string; hasta: string }): Momento {
  const f = t.fecha_entrega.slice(0, 10)
  if (f > sem.hasta) return 'futura'
  if (f >= sem.desde) return 'semana'
  return 'pasada'
}

function porcentaje(t: TareaDetalle) {
  if (!t.revisada || t.alumnos_total <= 0) return 0
  return Math.round((t.entregados / t.alumnos_total) * 100)
}

function TareaCard({ t, momento }: { t: TareaDetalle; momento: Momento }) {
  const entregados = t.revisada ? t.entregados : 0
  const pct = porcentaje(t)
  return (
    <article className="tarea-card" data-testid={`tarea-card-${t.id}`}>
      <div className="tarea-card__head">
        <h3 className="tarea-card__titulo">{t.titulo}</h3>
        <div className="tarea-card__badges">
          {momento === 'semana' ? <span className="badge badge--warn">Esta semana</span> : null}
          {momento === 'futura' ? <span className="badge">Futura</span> : null}
          {t.revisada ? (
            <span className="badge badge--ok">Revisada</span>
          ) : (
            <span className="badge badge--muted">Sin revisar</span>
          )}
        </div>
      </div>
      {t.descripcion ? <p className="tarea-card__desc">{t.descripcion}</p> : null}
      <dl className="tarea-card__datos">
        <div>
          <dt>Tipo</dt>
          <dd>{t.tipo_tarea_nombre || '—'}</dd>
        </div>
        <div>
          <dt>Criterio</dt>
          <dd>{labelCriterioModo(t.tipo)}</dd>
        </div>
        <div>
          <dt>Parcial</dt>
          <dd>{t.parcial_nombre || '—'}</dd>
        </div>
        <div>
          <dt>Puntos</dt>
          <dd>{t.puntos}</dd>
        </div>
        <div>
          <dt>Asignada</dt>
          <dd>{t.fecha_asignacion.slice(0, 10)}</dd>
        </div>
        <div>
          <dt>Entrega</dt>
          <dd>{t.fecha_entrega.slice(0, 10)}</dd>
        </div>
      </dl>
      <div className="tarea-card__entregas" data-testid="tarea-card-entregas">
        <div className="tarea-card__entregas-txt">
          <span>Entregaron</span>
          <strong>
            {entregados} / {t.alumnos_total} · {pct} %
          </strong>
        </div>
        <div className="tarea-card__barra" aria-hidden>
          <div className="tarea-card__barra-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </article>
  )
}

export function ClaseTareasModal({
  clase,
  onClose,
}: {
  clase: ClaseResumen
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const { data, isLoading } = useQuery({
    queryKey: ['tareas-clase', clase.asignacion_docente_id],
    queryFn: () => getClaseTareas(clase.asignacion_docente_id),
  })
  const tareas = data?.tareas ?? []

  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [criterio, setCriterio] = useState('')
  const [parcial, setParcial] = useState('')
  const [estado, setEstado] = useState('')

  const sem = useMemo(() => semanaActual(), [])
  const tipos = useMemo(
    () => [...new Set(tareas.map((t) => t.tipo_tarea_nombre).filter(Boolean))].sort() as string[],
    [tareas],
  )
  const parciales = useMemo(
    () => [...new Set(tareas.map((t) => t.parcial_nombre).filter(Boolean))].sort() as string[],
    [tareas],
  )

  const filtradas = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return tareas.filter((t) => {
      if (needle) {
        const hay = `${t.titulo} ${t.descripcion ?? ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (tipo && t.tipo_tarea_nombre !== tipo) return false
      if (criterio && t.tipo !== criterio) return false
      if (parcial && t.parcial_nombre !== parcial) return false
      if (estado) {
        const m = momentoDe(t, sem)
        if (estado === 'revisada' && !t.revisada) return false
        if (estado === 'sin_revisar' && t.revisada) return false
        if ((estado === 'semana' || estado === 'futura') && m !== estado) return false
      }
      return true
    })
  }, [tareas, q, tipo, criterio, parcial, estado, sem])

  const deSemana = filtradas.filter((t) => momentoDe(t, sem) === 'semana')

  const renderLista = (lista: TareaDetalle[], testId: string, vacio: string) =>
    lista.length === 0 ? (
      <div className="empty-state" data-testid={`${testId}-vacio`}>
        {vacio}
      </div>
    ) : (
      <div className="tarea-card__grid" data-testid={testId}>
        {lista.map((t) => (
          <TareaCard key={t.id} t={t} momento={momentoDe(t, sem)} />
        ))}
      </div>
    )

  return (
    <Modal
      open={open}
      title={clase.curso_nombre}
      xl
      onClose={dismiss}
      footer={
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          Cerrar
        </button>
      }
    >
      <p className="clase-tareas__meta" data-testid="clase-tareas-meta">
        {clase.grado_nombre} · Sección {clase.seccion_nombre} · {clase.modalidad_nombre} · Maestro:{' '}
        <strong>{clase.maestro_nombre || '—'}</strong>
      </p>

      <div className="plan-ver__filtros" data-testid="clase-tareas-filtros">
        <Field label="Buscar">
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="clase-tareas-buscar"
          />
        </Field>
        <Field label="Tipo">
          <select
            className="field__input"
            data-testid="clase-tareas-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Criterio">
          <select
            className="field__input"
            value={criterio}
            onChange={(e) => setCriterio(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="simple">Simple</option>
            <option value="manual">Manual</option>
            <option value="criterio">Con criterio</option>
          </select>
        </Field>
        <Field label="Parcial">
          <select
            className="field__input"
            value={parcial}
            onChange={(e) => setParcial(e.target.value)}
          >
            <option value="">Todos</option>
            {parciales.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select
            className="field__input"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="semana">Esta semana</option>
            <option value="futura">Futura</option>
            <option value="revisada">Revisada</option>
            <option value="sin_revisar">Sin revisar</option>
          </select>
        </Field>
      </div>

      {isLoading ? (
        <div className="empty-state">Cargando tareas…</div>
      ) : (
        <>
          <h3 className="portal-home__section-title">Esta semana ({deSemana.length})</h3>
          {renderLista(deSemana, 'clase-tareas-semana', 'No hay tareas con entrega esta semana.')}
          <h3 className="portal-home__section-title">Todas ({filtradas.length})</h3>
          {renderLista(filtradas, 'clase-tareas-todas', 'No hay tareas que coincidan.')}
        </>
      )}
    </Modal>
  )
}
