import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  aplicarFicha,
  buscarAlumnosFicha,
  diaISO,
  diasClaseEntre,
  fechaCorta,
  fechaLarga,
  getPreviaFicha,
  hoyISO,
  listTiposFicha,
  ordinal,
  rangoDiasClase,
} from '#/services/disciplina'
import type { AlumnoBusqueda, PreviaFicha } from '#/services/disciplina'

function Seccion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="expediente__seccion">
      <h3 className="expediente__titulo">{title}</h3>
      {children}
    </section>
  )
}

function vezTexto(p: PreviaFicha) {
  if (p.vez > p.ultimo_nivel) return `${ordinal(p.vez)} vez · se aplica el último nivel (${p.ultimo_nivel})`
  return `${ordinal(p.vez)} vez en ${p.ventana_etiqueta} · Nivel ${p.nivel}`
}

export function FichaFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const [q, setQ] = useState('')
  const [alumno, setAlumno] = useState<AlumnoBusqueda | null>(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [tipoId, setTipoId] = useState('')
  const [dias, setDias] = useState<number | ''>('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [obs, setObs] = useState('')
  const [confirmar, setConfirmar] = useState(false)

  const tipos = useQuery({ queryKey: ['disciplina-tipos', 'activos'], queryFn: () => listTiposFicha() })
  const busqueda = useQuery({
    queryKey: ['disciplina-buscar', q],
    queryFn: () => buscarAlumnosFicha(q),
    enabled: q.trim().length >= 2,
  })
  const previa = useQuery({
    queryKey: ['disciplina-previa', alumno?.codigo, tipoId, fecha],
    queryFn: () => getPreviaFicha(alumno!.codigo, tipoId, fecha),
    enabled: Boolean(alumno && tipoId && fecha),
  })
  const p = previa.data

  useEffect(() => {
    if (!p) return
    setDias(p.dias ?? '')
    setDesde(p.fecha_inicio)
    setHasta(p.fecha_fin)
  }, [p])

  const alumnoOptions = useMemo(() => {
    const list = busqueda.data ?? []
    const all = alumno && !list.some((a) => a.codigo === alumno.codigo) ? [alumno, ...list] : list
    return all.map((a) => ({
      value: a.codigo,
      label: `${a.codigo} · ${a.nombre}`,
      keywords: `${a.grado} ${a.seccion}`,
    }))
  }, [busqueda.data, alumno])

  const tipoOptions = useMemo(
    () => (tipos.data ?? []).map((t) => ({ value: t.id, label: t.titulo })),
    [tipos.data],
  )

  const diasClase = p?.dias_clase ?? []
  const contados = useMemo(() => diasClaseEntre(desde, hasta, diasClase), [desde, hasta, diasClase])
  const saltados = useMemo(() => {
    if (!desde || !hasta || hasta < desde) return 0
    const total = Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000) + 1
    return total - contados.length
  }, [desde, hasta, contados])

  const cambiarDias = (v: string) => {
    const n = v === '' ? '' : Math.max(1, Math.floor(Number(v)))
    setDias(n)
    if (n !== '' && desde) setHasta(rangoDiasClase(desde, n, diasClase).hasta)
  }
  const cambiarDesde = (v: string) => {
    setDesde(v)
    if (v && dias !== '') setHasta(rangoDiasClase(v, dias, diasClase).hasta)
  }

  const errorDias =
    p?.requiere_dias && (dias === '' || !desde || !hasta)
      ? 'Completa los días y las fechas del castigo.'
      : p?.requiere_dias && hasta < desde
        ? 'La fecha final no puede ser antes de la inicial.'
        : ''
  const listo = Boolean(alumno && p && !errorDias)

  const mut = useMutation({
    mutationFn: () =>
      aplicarFicha({
        alumno_codigo: alumno!.codigo,
        tipo_ficha_id: tipoId,
        fecha,
        dias: p?.requiere_dias && dias !== '' ? dias : null,
        fecha_inicio: p?.requiere_dias ? desde : '',
        fecha_fin: p?.requiere_dias ? hasta : '',
        observaciones: obs,
      }),
    onSuccess: () => {
      toast.success('Ficha aplicada')
      qc.invalidateQueries({ queryKey: ['disciplina-alumnos'] })
      qc.invalidateQueries({ queryKey: ['disciplina-fichas'] })
      qc.invalidateQueries({ queryKey: ['disciplina-previa'] })
      setConfirmar(false)
      dismiss()
    },
    onError: (e) => {
      setConfirmar(false)
      toast.error(userMessageFromError(e))
    },
  })

  return (
    <>
      <Modal
        open={open}
        xl
        title="Nueva ficha disciplinaria"
        onClose={dismiss}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={dismiss}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="ficha-aplicar"
              disabled={!listo || mut.isPending}
              onClick={() => setConfirmar(true)}
            >
              Aplicar ficha
            </button>
          </>
        }
      >
        <div className="expediente ficha-form" data-testid="ficha-form">
          <Seccion title="Alumno">
            <Field label="Código o nombre del alumno" htmlFor="ficha-alumno">
              <Combobox
                id="ficha-alumno"
                data-testid="ficha-alumno-input"
                value={alumno?.codigo ?? ''}
                onChange={(v) =>
                  setAlumno(
                    (busqueda.data ?? []).find((a) => a.codigo === v) ?? (alumno?.codigo === v ? alumno : null),
                  )
                }
                onQueryChange={setQ}
                options={alumnoOptions}
                placeholder="Buscar…"
                emptyLabel={q.trim().length < 2 ? 'Escribe para buscar' : 'Sin resultados'}
              />
            </Field>
            {alumno ? (
              <div className="ficha-alumno" data-testid="ficha-alumno-card">
                <span className="ficha-alumno__avatar">{alumno.nombre.slice(0, 1)}</span>
                <div>
                  <p className="ficha-alumno__nombre">{alumno.nombre}</p>
                  <p className="texto-muted ficha-alumno__meta">
                    {alumno.codigo}
                    {alumno.grado ? ` · ${alumno.grado} sec ${alumno.seccion} · ${alumno.modalidad}` : ''}
                  </p>
                </div>
              </div>
            ) : null}
          </Seccion>

          <Seccion title="Ficha">
            <div className="ficha-form__fila">
              <Field label="Fecha de la ficha" htmlFor="ficha-fecha">
                <input
                  id="ficha-fecha"
                  type="date"
                  className="field__input"
                  data-testid="ficha-fecha"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </Field>
              <Field label="Tipo de ficha" htmlFor="ficha-tipo">
                <Combobox
                  id="ficha-tipo"
                  data-testid="ficha-tipo-input"
                  value={tipoId}
                  onChange={setTipoId}
                  options={tipoOptions}
                  placeholder="Buscar tipo…"
                  emptyLabel="No hay tipos activos"
                />
              </Field>
            </div>

            {!alumno || !tipoId ? (
              <p className="texto-muted" style={{ margin: 0 }}>
                Elige el alumno y el tipo para ver el castigo que corresponde.
              </p>
            ) : previa.isLoading ? (
              <p className="texto-muted">Calculando…</p>
            ) : previa.error ? (
              <p className="texto-muted" role="alert">
                {userMessageFromError(previa.error)}
              </p>
            ) : p ? (
              <div className="ficha-previa" data-testid="ficha-previa">
                <div className="ficha-previa__head">
                  <p className="ficha-previa__titulo">{p.titulo}</p>
                  <span
                    className={`nivel-badge${p.vez > 1 ? ' nivel-badge--alto' : ''}`}
                    data-testid="ficha-vez"
                  >
                    {vezTexto(p)}
                  </span>
                </div>
                {p.descripcion ? <p className="ficha-previa__desc">{p.descripcion}</p> : null}
                <div className="ficha-previa__castigo">
                  <span className="ficha-previa__label">Castigo</span>
                  <p data-testid="ficha-castigo">{p.castigo}</p>
                </div>
                <div className="ficha-previa__previas" data-testid="ficha-previas">
                  <span className="ficha-previa__label">
                    Veces anteriores en {p.ventana_etiqueta} ({p.previas.length})
                  </span>
                  {p.previas.length === 0 ? (
                    <p className="texto-muted" style={{ margin: 0 }}>
                      Es la primera vez.
                    </p>
                  ) : (
                    <ul className="ficha-previa__lista">
                      {p.previas.map((f, i) => (
                        <li key={f.id}>
                          <strong>{ordinal(i + 1)}</strong> · {fechaLarga(f.fecha)} · Nivel {f.nivel} · {f.castigo}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </Seccion>

          {p?.requiere_dias ? (
            <Seccion title="Días de castigo">
              <div className="ficha-form__fila ficha-form__fila--3">
                <Field label="Días" htmlFor="ficha-dias">
                  <input
                    id="ficha-dias"
                    type="number"
                    min={1}
                    className="field__input"
                    data-testid="ficha-dias"
                    value={dias}
                    onChange={(e) => cambiarDias(e.target.value)}
                  />
                </Field>
                <Field label="Desde" htmlFor="ficha-desde">
                  <input
                    id="ficha-desde"
                    type="date"
                    className="field__input"
                    data-testid="ficha-desde"
                    value={desde}
                    onChange={(e) => cambiarDesde(e.target.value)}
                  />
                </Field>
                <Field label="Hasta" htmlFor="ficha-hasta">
                  <input
                    id="ficha-hasta"
                    type="date"
                    className="field__input"
                    data-testid="ficha-hasta"
                    value={hasta}
                    min={desde}
                    onChange={(e) => setHasta(e.target.value)}
                  />
                </Field>
              </div>
              {contados.length ? (
                <div className="dias-chips" data-testid="ficha-dias-chips">
                  {contados.map((d) => (
                    <span key={d} className={`dia-chip${diaISO(d) >= 6 ? ' dia-chip--finde' : ''}`}>
                      {fechaCorta(d)}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="texto-muted ficha-form__nota">
                Solo cuentan los días de clase de su modalidad
                {saltados > 0 ? ` (se saltan ${saltados} día${saltados === 1 ? '' : 's'} sin clase)` : ''}.
                {dias !== '' && contados.length !== dias
                  ? ` Ojo: el rango tiene ${contados.length} día${contados.length === 1 ? '' : 's'} de clase y el castigo indica ${dias}.`
                  : ''}
              </p>
              {errorDias ? <p className="field__error">{errorDias}</p> : null}
            </Seccion>
          ) : null}

          <Seccion title="Observaciones">
            <textarea
              className="field__textarea ficha-form__obs"
              rows={4}
              data-testid="ficha-observaciones"
              placeholder="Detalles de lo ocurrido, testigos, acuerdos con el responsable…"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </Seccion>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Aplicar ficha"
        message={
          alumno && p
            ? `¿Aplicar «${p.titulo}» a ${alumno.nombre}? ${p.castigo}${
                p.requiere_dias && desde && hasta ? ` Del ${fechaLarga(desde)} al ${fechaLarga(hasta)}.` : ''
              }`
            : ''
        }
        confirmLabel="Aplicar"
        onConfirm={() => mut.mutate()}
        onCancel={() => setConfirmar(false)}
      />
    </>
  )
}
