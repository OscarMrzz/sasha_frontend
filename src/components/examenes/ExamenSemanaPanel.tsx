import { useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { Combobox } from '#/components/ui/Combobox'
import { Modal } from '#/components/ui/Modal'
import { useEsMovil } from '#/hooks/use-media-query'
import {
  fechaLarga,
  horaRango,
  labelGradoSeccion,
  normalizarHora,
  soloFecha,
} from '#/lib/examenes'
import type {
  ExamenAsignacion,
  ExamenGradoOpcion,
  ExamenSeccionOpcion,
  ExamenSemanaHorario,
} from '#/services/examenes'

type ExamenSemanaPanelProps = {
  horarios: ExamenSemanaHorario[]
  grados?: ExamenGradoOpcion[]
  secciones?: ExamenSeccionOpcion[]
  codigoMaestro?: string
  todas?: boolean
  onTodasChange?: (value: boolean) => void
}

type Entrada = {
  key: string
  asignacion: ExamenAsignacion
  fecha: string
  horaInicio: string
  horaFin: string
  supervisa: boolean
}

function bloqueKey(inicio: string, fin: string) {
  return `${normalizarHora(inicio)}|${normalizarHora(fin)}`
}

/** Semana de exámenes del maestro: grilla por fecha y bloque, resaltando lo supervisado. */
export function ExamenSemanaPanel({
  horarios,
  grados = [],
  secciones = [],
  codigoMaestro,
  todas = false,
  onTodasChange,
}: ExamenSemanaPanelProps) {
  const [filtroGrado, setFiltroGrado] = useState('')
  const [filtroSeccion, setFiltroSeccion] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtrosOpen, setFiltrosOpen] = useState(false)
  const esMovil = useEsMovil()
  const filtrosActivos = [filtroGrado, filtroSeccion, filtroFecha].filter(Boolean).length
  const limpiarFiltros = () => {
    setFiltroGrado('')
    setFiltroSeccion('')
    setFiltroFecha('')
  }

  const supervisados = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const horario of horarios) {
      const set = new Set<string>()
      for (const supervisor of horario.supervisores) {
        if (codigoMaestro && supervisor.maestro_codigo === codigoMaestro) {
          set.add(supervisor.seccion_id)
        }
      }
      map.set(horario.id, set)
    }
    return map
  }, [horarios, codigoMaestro])

  const entradas = useMemo<Entrada[]>(() => {
    const out: Entrada[] = []
    for (const horario of horarios) {
      const set = supervisados.get(horario.id) ?? new Set<string>()
      for (const asignacion of horario.asignaciones) {
        const fecha = soloFecha(asignacion.fecha)
        if (!fecha) continue
        out.push({
          key: `${horario.id}-${asignacion.id || `${asignacion.seccion_id}-${asignacion.curso_id}`}`,
          asignacion,
          fecha,
          horaInicio: normalizarHora(asignacion.hora_inicio),
          horaFin: normalizarHora(asignacion.hora_fin),
          supervisa: set.has(asignacion.seccion_id),
        })
      }
    }
    return out
  }, [horarios, supervisados])

  const gradoOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const grado of grados) map.set(grado.id, grado.nombre)
    for (const entrada of entradas) {
      if (entrada.asignacion.grado_id) {
        map.set(
          entrada.asignacion.grado_id,
          entrada.asignacion.grado_nombre || entrada.asignacion.grado_id,
        )
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }))
  }, [grados, entradas])

  const seccionOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const seccion of secciones) {
      if (filtroGrado && seccion.grado_id !== filtroGrado) continue
      map.set(seccion.id, labelGradoSeccion(seccion.grado_nombre, seccion.nombre))
    }
    for (const entrada of entradas) {
      if (filtroGrado && entrada.asignacion.grado_id !== filtroGrado) continue
      map.set(
        entrada.asignacion.seccion_id,
        labelGradoSeccion(
          entrada.asignacion.grado_nombre,
          entrada.asignacion.seccion_nombre,
        ),
      )
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }))
  }, [secciones, entradas, filtroGrado])

  const visibles = useMemo(
    () =>
      entradas.filter((entrada) => {
        if (filtroGrado && entrada.asignacion.grado_id !== filtroGrado) return false
        if (filtroSeccion && entrada.asignacion.seccion_id !== filtroSeccion) return false
        if (filtroFecha && entrada.fecha !== filtroFecha) return false
        return true
      }),
    [entradas, filtroGrado, filtroSeccion, filtroFecha],
  )

  const porFecha = useMemo(() => {
    const fechas = new Map<string, Map<string, Entrada[]>>()
    for (const entrada of visibles) {
      const bloques = fechas.get(entrada.fecha) ?? new Map<string, Entrada[]>()
      const key = bloqueKey(entrada.horaInicio, entrada.horaFin)
      const lista = bloques.get(key) ?? []
      lista.push(entrada)
      bloques.set(key, lista)
      fechas.set(entrada.fecha, bloques)
    }
    return [...fechas.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fecha, bloques]) => ({
        fecha,
        bloques: [...bloques.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([key, items]) => ({
            key,
            items: [...items].sort((a, b) =>
              labelGradoSeccion(
                a.asignacion.grado_nombre,
                a.asignacion.seccion_nombre,
              ).localeCompare(
                labelGradoSeccion(
                  b.asignacion.grado_nombre,
                  b.asignacion.seccion_nombre,
                ),
                'es',
              ),
            ),
          })),
      }))
  }, [visibles])

  const filtros = (
    <>
      <div className="horario-board__filter">
        <span className="horario-board__filter-label">Grado</span>
        <Combobox
          value={filtroGrado}
          onChange={(value) => {
            setFiltroGrado(value)
            setFiltroSeccion('')
          }}
          options={[{ value: '', label: 'Todos' }, ...gradoOptions]}
          placeholder="Grado…"
          data-testid="examen-semana-filtro-grado"
        />
      </div>
      <div className="horario-board__filter">
        <span className="horario-board__filter-label">Grado / sección</span>
        <Combobox
          value={filtroSeccion}
          onChange={setFiltroSeccion}
          options={[{ value: '', label: 'Todas' }, ...seccionOptions]}
          placeholder="Sección…"
          data-testid="examen-semana-filtro-seccion"
        />
      </div>
      <div className="horario-board__filter">
        <span className="horario-board__filter-label">Fecha</span>
        <input
          type="date"
          className="field__input"
          value={filtroFecha}
          onChange={(event) => setFiltroFecha(event.target.value)}
          data-testid="examen-semana-filtro-fecha"
        />
      </div>
      <label className="horario-board__filter examen-semana__todas">
        <input
          type="checkbox"
          checked={todas}
          onChange={(event) => onTodasChange?.(event.target.checked)}
          data-testid="examen-semana-ver-todo"
        />
        <span>Ver todos los exámenes</span>
      </label>
    </>
  )

  return (
    <div className="examen-semana" data-testid="examen-semana-panel">
      {esMovil ? (
        <>
          <button
            type="button"
            className="btn btn--ghost examen-semana__filtrar"
            onClick={() => setFiltrosOpen(true)}
            data-testid="examen-semana-filtrar"
          >
            <Filter size={16} aria-hidden />
            Filtrar{filtrosActivos > 0 ? ` (${filtrosActivos})` : ''}
          </button>
          <Modal
            open={filtrosOpen}
            title="Filtrar exámenes"
            onClose={() => setFiltrosOpen(false)}
            testId="examen-semana-filtros-modal"
            footer={
              <>
                <button type="button" className="btn btn--ghost" onClick={limpiarFiltros}>
                  Limpiar
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setFiltrosOpen(false)}
                >
                  Aplicar
                </button>
              </>
            }
          >
            <div className="examen-semana__filtros examen-semana__filtros--modal">
              {filtros}
            </div>
          </Modal>
        </>
      ) : (
        <div className="horario-board__filters examen-semana__filtros">{filtros}</div>
      )}

      {porFecha.length === 0 ? (
        <div className="empty-state" data-testid="examen-semana-vacio">
          {horarios.length === 0
            ? 'No hay exámenes publicados en este periodo.'
            : 'No hay exámenes con estos filtros.'}
        </div>
      ) : (
        <div className="examen-semana__lista">
          {porFecha.map((dia) => (
            <section key={dia.fecha} className="examen-semana__dia" data-testid={`examen-dia-${dia.fecha}`}>
              <header className="examen-semana__dia-head">
                <h2 className="examen-semana__dia-title">{fechaLarga(dia.fecha)}</h2>
                <span className="texto-muted examen-semana__dia-count">
                  {dia.bloques.reduce((n, b) => n + b.items.length, 0)} exámenes
                </span>
              </header>

              <div className="examen-semana__bloques">
                {dia.bloques.map((bloque) => {
                  const first = bloque.items[0]
                  return (
                    <div key={bloque.key} className="examen-semana__bloque">
                      <div className="examen-semana__bloque-head">
                        {horaRango(first.horaInicio, first.horaFin)}
                      </div>
                      <div className="examen-semana__pills">
                        {bloque.items.map((entrada) => (
                          <article
                            key={entrada.key}
                            className={`examen-semana__pill${
                              entrada.supervisa ? ' examen-semana__pill--supervisa' : ''
                            }`}
                            data-testid={`examen-semana-pill-${entrada.asignacion.id || entrada.key}`}
                          >
                            <span className="examen-semana__pill-curso">
                              {entrada.asignacion.curso_nombre || 'Materia'}
                            </span>
                            <span className="examen-semana__pill-meta">
                              {labelGradoSeccion(
                                entrada.asignacion.grado_nombre,
                                entrada.asignacion.seccion_nombre,
                              )}
                            </span>
                            {entrada.asignacion.modalidad_nombre ? (
                              <span className="examen-semana__pill-modalidad">
                                {entrada.asignacion.modalidad_nombre}
                              </span>
                            ) : null}
                            {entrada.supervisa ? (
                              <span className="examen-semana__pill-badge">
                                Supervisas
                              </span>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
