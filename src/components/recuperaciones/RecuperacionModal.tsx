import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Combobox } from '#/components/ui/Combobox'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  getCandidatos,
  guardarRecuperaciones,
  listRecuperaciones,
  notaParcialEfectiva,
  notaPeriodoEfectiva,
} from '#/services/recuperaciones'
import type {
  CandidatoRecuperacion,
  ClaseRecuperacion,
  ListaRecuperaciones,
  TipoRecuperacion,
} from '#/services/recuperaciones'
import { NumberInput } from '#/components/ui/NumberInput'
import { useEsMovil } from '#/hooks/use-media-query'

function parseNota(v: string): number | null | undefined {
  const t = v.trim()
  if (t === '') return null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function RecuperacionModal({
  asignacionId,
  lista,
  clases,
  claseLabel,
  esMaestro,
  soloVer = false,
  fijarSeleccion = false,
  inicial,
  onClose,
}: {
  asignacionId: string
  lista: ListaRecuperaciones
  clases: ClaseRecuperacion[]
  claseLabel: string
  esMaestro: boolean
  soloVer?: boolean
  fijarSeleccion?: boolean
  inicial?: { tipo?: TipoRecuperacion; parcialId?: string; numero?: number }
  onClose: () => void
}) {
  const { open, dismiss } = useDismiss(onClose)
  const qc = useQueryClient()
  const esMovil = useEsMovil()
  const terminados = lista.parciales.filter((p) => p.terminado)
  const claseInicial = clases.find(
    (c) => c.asignacion_docente_id === asignacionId,
  )
  const [grado, setGrado] = useState(claseInicial?.grado_nombre ?? '')
  const [seccion, setSeccion] = useState(claseInicial?.seccion_nombre ?? '')
  const [materia, setMateria] = useState(claseInicial?.curso_nombre ?? '')
  const [maestro, setMaestro] = useState(
    esMaestro ? '' : (claseInicial?.maestro_nombre ?? ''),
  )
  const [asignacionActiva, setAsignacionActiva] = useState(asignacionId)
  const [tipo, setTipo] = useState<TipoRecuperacion>(inicial?.tipo ?? 'parcial')
  const [parcialId, setParcialId] = useState(
    () =>
      inicial?.parcialId ??
      (terminados.at(-1) ?? lista.parciales.at(0))?.id ??
      '',
  )
  const [numero, setNumero] = useState(inicial?.numero ?? 1)
  const [drafts, setDrafts] = useState<Partial<Record<string, string>>>({})
  const [confirm, setConfirm] = useState(false)

  const clasesGrado = clases.filter((c) => !grado || c.grado_nombre === grado)
  const clasesSeccion = clasesGrado.filter(
    (c) => !seccion || c.seccion_nombre === seccion,
  )
  const clasesMateria = clasesSeccion.filter(
    (c) => !materia || c.curso_nombre === materia,
  )
  const claseActiva = clases.find(
    (c) => c.asignacion_docente_id === asignacionActiva,
  )
  const listaClaseQ = useQuery({
    queryKey: ['recuperaciones', lista.periodo_id, asignacionActiva],
    queryFn: () => listRecuperaciones(asignacionActiva, lista.periodo_id),
    enabled: Boolean(asignacionActiva && asignacionActiva !== asignacionId),
  })
  const listaActiva =
    asignacionActiva === asignacionId ? lista : listaClaseQ.data
  const listaCargando =
    asignacionActiva !== asignacionId && listaClaseQ.isLoading
  const config = listaActiva?.config ?? lista.config
  const claseActivaLabel = claseActiva
    ? `${claseActiva.curso_nombre} · ${claseActiva.grado_nombre} sec. ${claseActiva.seccion_nombre} · ${claseActiva.maestro_nombre}`
    : claseLabel

  const seleccionarClase = (filtros: {
    grado: string
    seccion: string
    materia: string
    maestro: string
  }) => {
    const opciones = clases.filter(
      (c) =>
        (!filtros.grado || c.grado_nombre === filtros.grado) &&
        (!filtros.seccion || c.seccion_nombre === filtros.seccion) &&
        (!filtros.materia || c.curso_nombre === filtros.materia) &&
        (esMaestro || !filtros.maestro || c.maestro_nombre === filtros.maestro),
    )
    if (opciones[0]) setAsignacionActiva(opciones[0].asignacion_docente_id)
    setDrafts({})
  }

  const opcionesUnicas = (valores: string[]) =>
    [...new Set(valores.filter(Boolean))].map((v) => ({ value: v, label: v }))

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      'recuperaciones-candidatos',
      lista.periodo_id,
      asignacionActiva,
      tipo,
      parcialId,
      numero,
    ],
    queryFn: () =>
      getCandidatos(
        asignacionActiva,
        tipo,
        tipo === 'parcial' ? parcialId : undefined,
        tipo === 'periodo' ? numero : undefined,
        lista.periodo_id,
      ),
    enabled:
      Boolean(listaActiva) &&
      !listaCargando &&
      (tipo === 'periodo' || Boolean(parcialId)),
  })

  const soloLectura =
    soloVer || Boolean(listaActiva?.finalizado) || !data?.disponible

  const cambiar = (fn: () => void) => {
    fn()
    setDrafts({})
  }

  const valor = (a: CandidatoRecuperacion) =>
    drafts[a.alumno_id] ?? (a.nota != null ? String(a.nota) : '')

  const cambios = (data?.alumnos ?? []).flatMap((a) => {
    const d = drafts[a.alumno_id]
    if (d === undefined) return []
    const n = parseNota(d)
    if (n === undefined || n === a.nota) return []
    return [{ alumno_id: a.alumno_id, nota: n }]
  })
  const invalidos = (data?.alumnos ?? []).filter((a) => {
    const d = drafts[a.alumno_id]
    if (d === undefined) return false
    const n = parseNota(d)
    return n === undefined || (n != null && (n < 0 || n > 100))
  })

  const guardarMut = useMutation({
    mutationFn: () =>
      guardarRecuperaciones({
        asignacion_docente_id: asignacionActiva,
        tipo,
        parcial_id: tipo === 'parcial' ? parcialId : undefined,
        numero: tipo === 'periodo' ? numero : undefined,
        items: cambios,
      }),
    onSuccess: async (res) => {
      toast.success('Recuperaciones guardadas')
      qc.setQueryData(
        [
          'recuperaciones-candidatos',
          lista.periodo_id,
          asignacionActiva,
          tipo,
          parcialId,
          numero,
        ],
        res,
      )
      await Promise.all(
        [
          'recuperaciones',
          'recuperaciones-candidatos',
          'portal-calificaciones',
          'portal-resumen',
          'portal-resultado',
          'portal-inicio',
          'matricula-sugerencia',
          'prematricula-portal',
          'prematricula-hijos',
        ].map((key) => qc.invalidateQueries({ queryKey: [key] })),
      )
      setDrafts({})
      setConfirm(false)
      dismiss()
    },
    onError: (e) => {
      toast.error(userMessageFromError(e))
      setConfirm(false)
    },
  })

  const cuenta = (a: CandidatoRecuperacion) => {
    if (!data) return a.nota_original
    const n = parseNota(valor(a))
    const rec = n === undefined ? null : n
    return tipo === 'parcial'
      ? notaParcialEfectiva(a.nota_original, rec, data.tope)
      : notaPeriodoEfectiva(a.nota_original, finales(a, rec), data.tope)
  }

  const finales = (a: CandidatoRecuperacion, nota: number | null) => {
    const notas = [...a.recuperaciones_periodo].slice(
      0,
      config.recuperaciones_periodo,
    )
    notas[numero - 1] = nota
    return notas
  }
  const historial = (a: CandidatoRecuperacion) => {
    const nota = parseNota(valor(a))
    return [
      `Original ${a.nota_original}`,
      ...finales(a, nota === undefined ? null : nota).flatMap((n, k) =>
        n == null ? [] : [`Final ${k + 1}: ${n}`],
      ),
    ].join(' · ')
  }

  const campoNota = (a: CandidatoRecuperacion) => (
    <NumberInput
      type="number"
      min={0}
      max={100}
      step="0.5"
      className="field__input tarea-rev-manual"
      data-testid={`recuperacion-nota-${a.alumno_id}`}
      disabled={soloLectura}
      placeholder="—"
      value={valor(a)}
      onChange={(e) =>
        setDrafts((d) => ({ ...d, [a.alumno_id]: e.target.value }))
      }
    />
  )

  const numeros = Array.from(
    { length: config.recuperaciones_periodo },
    (_, i) => i + 1,
  )

  return (
    <Modal
      open={open}
      title={data?.etiqueta ?? 'Recuperaciones'}
      onClose={dismiss}
      wide
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            {soloLectura ? 'Cerrar' : 'Cancelar'}
          </button>
          {soloLectura ? null : (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="recuperacion-guardar"
              disabled={
                cambios.length === 0 ||
                invalidos.length > 0 ||
                guardarMut.isPending
              }
              onClick={() => setConfirm(true)}
            >
              Guardar
            </button>
          )}
        </>
      }
    >
      <div data-testid="recuperacion-modal">
        <section
          className="recuperacion-clase-filtros"
          aria-label="Filtrar clase"
        >
          <div className="recuperacion-clase-filtros__titulo">
            <strong>Clase</strong>
            <span className="texto-muted">
              {esMaestro
                ? 'Filtra por grado, sección y clase.'
                : 'Filtra por grado, sección, clase y maestro.'}
            </span>
          </div>
          <div className="recuperacion-clase-filtros__campos">
            <Field label="Grado">
              <Combobox
                value={grado}
                options={[
                  { value: '', label: 'Todos los grados' },
                  ...opcionesUnicas(clases.map((c) => c.grado_nombre)),
                ]}
                onChange={(value) => {
                  const next = {
                    grado: value,
                    seccion: '',
                    materia: '',
                    maestro: '',
                  }
                  setGrado(value)
                  setSeccion('')
                  setMateria('')
                  setMaestro('')
                  seleccionarClase(next)
                }}
                data-testid="recuperacion-filtro-grado"
              />
            </Field>
            <Field label="Sección">
              <Combobox
                value={seccion}
                options={[
                  { value: '', label: 'Todas las secciones' },
                  ...opcionesUnicas(clasesGrado.map((c) => c.seccion_nombre)),
                ]}
                onChange={(value) => {
                  const next = {
                    grado,
                    seccion: value,
                    materia: '',
                    maestro: '',
                  }
                  setSeccion(value)
                  setMateria('')
                  setMaestro('')
                  seleccionarClase(next)
                }}
                data-testid="recuperacion-filtro-seccion"
              />
            </Field>
            <Field label="Clase">
              <Combobox
                value={materia}
                options={[
                  { value: '', label: 'Todas las materias' },
                  ...opcionesUnicas(clasesSeccion.map((c) => c.curso_nombre)),
                ]}
                onChange={(value) => {
                  const next = { grado, seccion, materia: value, maestro: '' }
                  setMateria(value)
                  setMaestro('')
                  seleccionarClase(next)
                }}
                data-testid="recuperacion-filtro-materia"
              />
            </Field>
            {esMaestro ? null : (
              <Field label="Maestro">
                <Combobox
                  value={maestro}
                  options={[
                    { value: '', label: 'Todos los maestros' },
                    ...opcionesUnicas(
                      clasesMateria.map((c) => c.maestro_nombre),
                    ),
                  ]}
                  onChange={(value) => {
                    const next = { grado, seccion, materia, maestro: value }
                    setMaestro(value)
                    seleccionarClase(next)
                  }}
                  data-testid="recuperacion-filtro-maestro"
                />
              </Field>
            )}
          </div>
          {claseActiva ? (
            <p className="recuperacion-clase-filtros__seleccion">
              {claseActivaLabel} · nota mínima {config.nota_minima}
            </p>
          ) : null}
        </section>
        {listaActiva?.finalizado ? (
          <p
            className="recuperacion-aviso"
            data-testid="recuperacion-finalizado"
          >
            El periodo está finalizado: las recuperaciones son de solo lectura.
          </p>
        ) : null}
        {!fijarSeleccion ? (
          <div className="recuperacion-tipo">
            <Field label="Tipo">
              <select
                className="field__select"
                data-testid="recuperacion-tipo"
                disabled={soloVer || fijarSeleccion}
                value={tipo}
                onChange={(e) =>
                  cambiar(() => setTipo(e.target.value as TipoRecuperacion))
                }
              >
                <option value="parcial">Recuperación de parcial</option>
                {numeros.length > 0 ? (
                  <option value="periodo">Recuperación de periodo</option>
                ) : null}
              </select>
            </Field>
            {tipo === 'parcial' ? (
              <Field label="Parcial">
                <select
                  className="field__select"
                  data-testid="recuperacion-parcial"
                  disabled={soloVer || fijarSeleccion}
                  value={parcialId}
                  onChange={(e) => cambiar(() => setParcialId(e.target.value))}
                >
                  {(listaActiva?.parciales ?? lista.parciales).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.etiqueta}
                      {p.terminado ? '' : ' (en curso)'}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Recuperación">
                <select
                  className="field__select"
                  data-testid="recuperacion-numero"
                  disabled={soloVer || fijarSeleccion}
                  value={numero}
                  onChange={(e) =>
                    cambiar(() => setNumero(Number(e.target.value)))
                  }
                >
                  {numeros.map((n) => (
                    <option key={n} value={n}>
                      Recuperación {n}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        ) : null}

        {listaCargando || isLoading ? (
          <div className="empty-state">Cargando alumnos…</div>
        ) : isError || !data ? (
          <div className="empty-state">{userMessageFromError(error)}</div>
        ) : !data.disponible ? (
          <div className="empty-state" data-testid="recuperacion-no-disponible">
            {data.mensaje}
          </div>
        ) : data.alumnos.length === 0 ? (
          <div className="empty-state" data-testid="recuperacion-sin-alumnos">
            {data.mensaje ?? 'Ningún alumno necesita esta recuperación.'}
          </div>
        ) : (
          <>
            <p
              className="texto-muted"
              style={{ fontSize: '0.8rem', marginTop: 0 }}
            >
              {tipo === 'parcial'
                ? `Cuenta la nota más alta entre el parcial y la recuperación (tope ${data.tope}). Vacío quita la recuperación.`
                : `Cuenta la nota más alta entre el promedio anual y todas las finales (tope ${data.tope}). Vacío quita la nota de esta final.`}
            </p>
            {esMovil ? (
              <div className="recuperacion-alumnos-cards">
                {data.alumnos.map((a) => {
                  const c = cuenta(a)
                  return (
                    <article
                      className="recuperacion-alumno-card"
                      key={a.alumno_id}
                      data-testid={`recuperacion-fila-${a.alumno_id}`}
                    >
                      <strong>{a.nombre}</strong>
                      <small className="texto-muted">{a.codigo}</small>
                      <div className="recuperacion-alumno-card__notas">
                        <span>
                          {tipo === 'parcial'
                            ? 'Nota normal'
                            : 'Promedio anual'}
                          : <strong>{a.nota_original}</strong>
                        </span>
                        <span
                          className={
                            c >= data.nota_minima
                              ? 'recuperacion-cuenta--ok'
                              : 'recuperacion-cuenta--mal'
                          }
                        >
                          Cuenta:{' '}
                          <strong
                            data-testid={`recuperacion-cuenta-${a.alumno_id}`}
                          >
                            {c}
                          </strong>
                        </span>
                      </div>
                      <Field
                        label={
                          tipo === 'parcial'
                            ? 'Recuperación (0–100)'
                            : `Final ${numero} (0–100)`
                        }
                      >
                        {campoNota(a)}
                      </Field>
                      {tipo === 'periodo' ? (
                        <small className="recuperacion-historial">
                          {historial(a)}
                        </small>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="tarea-revision-table-wrap">
                <table
                  className="tarea-revision-table"
                  data-testid="recuperacion-table"
                >
                  <thead>
                    <tr>
                      <th>Cuenta</th>
                      <th>Nombre</th>
                      <th>
                        {tipo === 'parcial' ? 'Nota normal' : 'Promedio anual'}
                      </th>
                      <th>
                        {tipo === 'parcial'
                          ? 'Recuperación (0–100)'
                          : `Final ${numero} (0–100)`}
                      </th>
                      <th>Nota que cuenta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.alumnos.map((a) => {
                      const c = cuenta(a)
                      return (
                        <tr
                          key={a.alumno_id}
                          data-testid={`recuperacion-fila-${a.alumno_id}`}
                        >
                          <td>{a.codigo}</td>
                          <td>
                            {a.nombre}
                            {tipo === 'periodo' ? (
                              <small className="recuperacion-historial">
                                {historial(a)}
                              </small>
                            ) : null}
                          </td>
                          <td>{a.nota_original}</td>
                          <td>{campoNota(a)}</td>
                          <td
                            className={
                              c >= data.nota_minima
                                ? 'recuperacion-cuenta--ok'
                                : 'recuperacion-cuenta--mal'
                            }
                            data-testid={`recuperacion-cuenta-${a.alumno_id}`}
                          >
                            {c}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        title="Guardar recuperaciones"
        message={`¿Guardar ${cambios.length} ${cambios.length === 1 ? 'nota' : 'notas'} de la ${data?.etiqueta ?? 'recuperación'}?`}
        onConfirm={() => guardarMut.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </Modal>
  )
}
