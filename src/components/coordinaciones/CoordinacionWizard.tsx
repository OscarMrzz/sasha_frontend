import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { WizardSteps } from '#/components/ui/WizardSteps'
import { userMessageFromError } from '#/lib/api'
import {
  createCoordinacion,
  getOpcionesCoordinacion,
  previaCoordinacion,
  reglaLabel,
  updateCoordinacion,
} from '#/services/coordinaciones'
import type { Coordinacion, CoordinacionInput, OpcionesCoordinacion, ReglaCoordinacion } from '#/services/coordinaciones'

type Regla = Pick<ReglaCoordinacion, 'curso_id' | 'grado_id' | 'seccion_id'>
type Pestana = 'materia' | 'grado' | 'avanzado'

const PASOS = [
  { id: 'datos', label: 'Datos' },
  { id: 'alcance', label: 'Alcance' },
]

const PESTANAS: { value: Pestana; label: string; ayuda: string }[] = [
  { value: 'materia', label: 'Por materia', ayuda: 'Cada materia marcada entra en todos los grados.' },
  {
    value: 'grado',
    label: 'Por grado',
    ayuda: 'Marca un grado completo, o ábrelo para elegir solo algunas secciones.',
  },
  {
    value: 'avanzado',
    label: 'Avanzado',
    ayuda: 'Abre un grado para elegir una materia en todo el grado, o una sección para elegir clases sueltas.',
  },
]

const clave = (r: Regla) => `${r.curso_id ?? ''}|${r.grado_id ?? ''}|${r.seccion_id ?? ''}`

function Seccion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="expediente__seccion">
      <h3 className="expediente__titulo">{title}</h3>
      {children}
    </section>
  )
}

export function CoordinacionWizard({ coordinacion, onClose }: { coordinacion: Coordinacion | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const [paso, setPaso] = useState(0)
  const [pestana, setPestana] = useState<Pestana>('materia')
  const [titulo, setTitulo] = useState(coordinacion?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(coordinacion?.descripcion ?? '')
  const [reglas, setReglas] = useState<Regla[]>(
    coordinacion?.reglas.map((r) => ({ curso_id: r.curso_id, grado_id: r.grado_id, seccion_id: r.seccion_id })) ?? [],
  )
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  const opciones = useQuery({ queryKey: ['coordinaciones-opciones'], queryFn: getOpcionesCoordinacion })
  const op: OpcionesCoordinacion = opciones.data ?? { grados: [], cursos: [] }

  const nombres = useMemo(() => {
    const curso = new Map(op.cursos.map((c) => [c.id, c.nombre]))
    const grado = new Map(op.grados.map((g) => [g.id, g.nombre]))
    const seccion = new Map<string, { nombre: string; gradoId: string }>()
    for (const g of op.grados) for (const s of g.secciones) seccion.set(s.id, { nombre: s.nombre, gradoId: g.id })
    return { curso, grado, seccion }
  }, [op])

  const gradoDe = (r: Regla) => r.grado_id ?? (r.seccion_id ? nombres.seccion.get(r.seccion_id)?.gradoId : undefined)

  /** ¿La regla `a` ya incluye todo lo que pide `b`? */
  const incluye = (a: Regla, b: Regla) =>
    (!a.curso_id || a.curso_id === b.curso_id) &&
    (!a.grado_id || a.grado_id === gradoDe(b)) &&
    (!a.seccion_id || a.seccion_id === b.seccion_id)

  const claves = useMemo(() => new Set(reglas.map(clave)), [reglas])

  const estado = (t: Regla) => {
    if (claves.has(clave(t))) return 'propia' as const
    if (reglas.some((r) => incluye(r, t))) return 'incluida' as const
    return 'no' as const
  }

  const alternar = (t: Regla) =>
    setReglas((list) =>
      claves.has(clave(t))
        ? list.filter((r) => clave(r) !== clave(t))
        : [...list.filter((r) => !incluye(t, r)), t],
    )

  const abrir = (id: string) =>
    setAbiertos((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const body = (): CoordinacionInput => ({
    titulo: titulo.trim(),
    descripcion: descripcion.trim(),
    status: coordinacion?.status ?? 'ACTIVE',
    reglas: reglas.map((r) => ({ curso_id: r.curso_id, grado_id: r.grado_id, seccion_id: r.seccion_id })),
  })

  const previa = useQuery({
    queryKey: ['coordinaciones-previa', [...claves].sort().join(',')],
    queryFn: () => previaCoordinacion(body()),
    enabled: reglas.length > 0,
    placeholderData: keepPreviousData,
  })

  const mut = useMutation({
    mutationFn: () => (coordinacion ? updateCoordinacion(coordinacion.id, body()) : createCoordinacion(body())),
    onSuccess: () => {
      toast.success(coordinacion ? 'Coordinación actualizada' : 'Coordinación creada')
      qc.invalidateQueries({ queryKey: ['coordinaciones'] })
      dismiss()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const etiqueta = (r: Regla) => {
    const sec = r.seccion_id ? nombres.seccion.get(r.seccion_id) : undefined
    return reglaLabel({
      curso: r.curso_id ? nombres.curso.get(r.curso_id) : undefined,
      grado: r.grado_id ? nombres.grado.get(r.grado_id) : sec ? nombres.grado.get(sec.gradoId) : undefined,
      seccion: sec?.nombre,
    })
  }

  const check = (t: Regla, label: ReactNode, testId: string) => {
    const e = estado(t)
    return (
      <label key={clave(t)} className={`coord-check${e === 'incluida' ? ' coord-check--incluida' : ''}`}>
        <input
          type="checkbox"
          data-testid={testId}
          checked={e !== 'no'}
          disabled={e === 'incluida'}
          onChange={() => alternar(t)}
        />
        <span>{label}</span>
        {e === 'incluida' ? <span className="coord-check__nota">incluida</span> : null}
      </label>
    )
  }

  const abridor = (id: string, label: string, testId: string) => (
    <button type="button" className="coord-abrir" data-testid={testId} onClick={() => abrir(id)}>
      {abiertos.has(id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {label}
    </button>
  )

  const errorDatos = titulo.trim() ? '' : 'Escribe el título.'
  const ayuda = PESTANAS.find((p) => p.value === pestana)?.ayuda

  return (
    <Modal
      open={open}
      xl
      title={coordinacion ? 'Editar coordinación' : 'Nueva coordinación'}
      onClose={dismiss}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={paso === 0 ? dismiss : () => setPaso(0)}>
            {paso === 0 ? 'Cancelar' : 'Atrás'}
          </button>
          {paso === 0 ? (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="coord-siguiente"
              disabled={Boolean(errorDatos)}
              onClick={() => setPaso(1)}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="coord-guardar"
              disabled={reglas.length === 0 || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          )}
        </>
      }
    >
      <WizardSteps steps={PASOS} current={paso} />
      <div className="expediente" data-testid="coord-wizard">
        {paso === 0 ? (
          <Seccion title="Coordinación">
            <Field label="Título" htmlFor="coord-titulo" error={errorDatos && titulo ? errorDatos : undefined}>
              <input
                id="coord-titulo"
                className="field__input"
                data-testid="coord-titulo"
                placeholder="Ej. Coordinación de Séptimo"
                value={titulo}
                autoFocus
                onChange={(e) => setTitulo(e.target.value)}
              />
            </Field>
            <Field label="Descripción" htmlFor="coord-descripcion">
              <textarea
                id="coord-descripcion"
                className="field__textarea"
                rows={3}
                data-testid="coord-descripcion"
                placeholder="Qué abarca esta coordinación."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </Field>
          </Seccion>
        ) : (
          <div className="coord-alcance">
            <div>
              <div className="segmento" role="radiogroup" aria-label="Forma de elegir">
                {PESTANAS.map((p) => (
                  <label key={p.value} className={`segmento__item${pestana === p.value ? ' segmento__item--on' : ''}`}>
                    <input
                      type="radio"
                      name="coord-pestana"
                      data-testid={`coord-tab-${p.value}`}
                      checked={pestana === p.value}
                      onChange={() => setPestana(p.value)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              <p className="texto-muted ficha-form__nota">{ayuda}</p>

              {opciones.isPending ? <p className="texto-muted">Cargando grados y materias…</p> : null}

              {pestana === 'materia' ? (
                <div className="coord-lista">
                  {op.cursos.map((c) =>
                    check({ curso_id: c.id, grado_id: null, seccion_id: null }, c.nombre, `coord-materia-${c.nombre}`),
                  )}
                </div>
              ) : null}

              {pestana === 'grado' ? (
                <ul className="coord-arbol">
                  {op.grados.map((g) => (
                    <li key={g.id}>
                      <div className="coord-arbol__fila">
                        {check({ curso_id: null, grado_id: g.id, seccion_id: null }, g.nombre, `coord-grado-${g.nombre}`)}
                        {abridor(`g-${g.id}`, 'Secciones', `coord-grado-${g.nombre}-abrir`)}
                      </div>
                      {abiertos.has(`g-${g.id}`) ? (
                        <div className="coord-lista coord-lista--hijo">
                          {g.secciones.map((s) =>
                            check(
                              { curso_id: null, grado_id: null, seccion_id: s.id },
                              `${g.nombre} ${s.nombre} · ${s.modalidad}`,
                              `coord-seccion-${g.nombre}-${s.nombre}`,
                            ),
                          )}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {pestana === 'avanzado' ? (
                <ul className="coord-arbol">
                  {op.grados.map((g) => {
                    const materias = op.cursos.filter((c) => g.curso_ids.includes(c.id))
                    return (
                      <li key={g.id}>
                        {abridor(`a-${g.id}`, g.nombre, `coord-av-${g.nombre}`)}
                        {abiertos.has(`a-${g.id}`) ? (
                          <div className="coord-arbol__hijo">
                            <p className="coord-arbol__subtitulo">Materia en todo {g.nombre}</p>
                            <div className="coord-lista">
                              {materias.map((c) =>
                                check(
                                  { curso_id: c.id, grado_id: g.id, seccion_id: null },
                                  c.nombre,
                                  `coord-av-${g.nombre}-${c.nombre}`,
                                ),
                              )}
                            </div>
                            <ul className="coord-arbol">
                              {g.secciones.map((s) => (
                                <li key={s.id}>
                                  {abridor(
                                    `s-${s.id}`,
                                    `Sección ${s.nombre} · ${s.modalidad}`,
                                    `coord-av-${g.nombre}-${s.nombre}`,
                                  )}
                                  {abiertos.has(`s-${s.id}`) ? (
                                    <div className="coord-lista coord-lista--hijo">
                                      {materias.map((c) =>
                                        check(
                                          { curso_id: c.id, grado_id: null, seccion_id: s.id },
                                          c.nombre,
                                          `coord-av-${g.nombre}-${s.nombre}-${c.nombre}`,
                                        ),
                                      )}
                                    </div>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>

            <aside className="coord-resumen" data-testid="coord-resumen">
              <h4 className="coord-resumen__titulo">Resumen</h4>
              {reglas.length === 0 ? (
                <p className="texto-muted" style={{ margin: 0 }}>
                  Aún no marcas nada.
                </p>
              ) : (
                <>
                  <p className="coord-resumen__cifra" data-testid="coord-resumen-cifra">
                    {previa.data
                      ? `${previa.data.clases} ${previa.data.clases === 1 ? 'clase' : 'clases'} en ${previa.data.secciones} ${
                          previa.data.secciones === 1 ? 'sección' : 'secciones'
                        }`
                      : 'Calculando…'}
                  </p>
                  <p className="texto-muted" style={{ margin: '0 0 0.6rem', fontSize: '0.78rem' }}>
                    Del periodo activo. Las reglas siguen valiendo en los periodos siguientes.
                  </p>
                  <ul className="coord-resumen__reglas">
                    {reglas.map((r) => (
                      <li key={clave(r)}>
                        <span>{etiqueta(r)}</span>
                        <button
                          type="button"
                          aria-label={`Quitar ${etiqueta(r)}`}
                          onClick={() => setReglas((list) => list.filter((x) => clave(x) !== clave(r)))}
                        >
                          <X size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </Modal>
  )
}
