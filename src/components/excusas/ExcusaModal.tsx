import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { hoyISO } from '#/services/disciplina'
import {
  buscarAlumnosExcusa,
  createExcusa,
  listTiposExcusa,
  rangoExcusa,
  updateExcusa,
} from '#/services/excusas'
import type { AlumnoExcusa, Excusa } from '#/services/excusas'

/** Ver, crear o editar una excusa. Al guardar, el backend marca «E» bloqueada en todas las clases de esos días. */
export function ExcusaModal({
  excusa,
  soloVer = false,
  onClose,
}: {
  excusa: Excusa | null
  soloVer?: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const [q, setQ] = useState('')
  const [alumno, setAlumno] = useState<AlumnoExcusa | null>(
    excusa
      ? { codigo: excusa.alumno_codigo, nombre: excusa.alumno_nombre, grado: excusa.grado, seccion: excusa.seccion }
      : null,
  )
  const [tipoId, setTipoId] = useState(excusa?.tipo_excusa_id ?? '')
  const [desde, setDesde] = useState(excusa?.fecha_inicio ?? hoyISO())
  const [hasta, setHasta] = useState(excusa?.fecha_fin ?? hoyISO())
  const [descripcion, setDescripcion] = useState(excusa?.descripcion ?? '')
  const [confirmar, setConfirmar] = useState(false)

  const tipos = useQuery({ queryKey: ['excusas-tipos', 'activos'], queryFn: () => listTiposExcusa() })
  const busqueda = useQuery({
    queryKey: ['excusas-buscar', q],
    queryFn: () => buscarAlumnosExcusa(q),
    enabled: !soloVer && q.trim().length >= 2,
  })

  const alumnoOptions = useMemo(() => {
    const list = busqueda.data ?? []
    const all = alumno && !list.some((a) => a.codigo === alumno.codigo) ? [alumno, ...list] : list
    return all.map((a) => ({
      value: a.codigo,
      label: `${a.codigo} · ${a.nombre}`,
      keywords: `${a.grado} ${a.seccion}`,
    }))
  }, [busqueda.data, alumno])

  const tipoOptions = useMemo(() => {
    const list = (tipos.data ?? []).map((t) => ({ value: t.id, label: t.nombre }))
    if (excusa && !list.some((t) => t.value === excusa.tipo_excusa_id)) {
      list.unshift({ value: excusa.tipo_excusa_id, label: excusa.tipo_nombre })
    }
    return list
  }, [tipos.data, excusa])

  const error = !alumno
    ? 'Elige el alumno.'
    : !tipoId
      ? 'Elige el tipo de excusa.'
      : !desde || !hasta
        ? 'Indica las fechas.'
        : hasta < desde
          ? 'La fecha final no puede ser antes de la inicial.'
          : ''

  const mut = useMutation({
    mutationFn: () => {
      const body = {
        alumno_codigo: alumno!.codigo,
        tipo_excusa_id: tipoId,
        fecha_inicio: desde,
        fecha_fin: hasta,
        descripcion: descripcion.trim(),
      }
      return excusa ? updateExcusa(excusa.id, body) : createExcusa(body)
    },
    onSuccess: (e) => {
      toast.success(
        `Excusa guardada: ${e.clases} clase${e.clases === 1 ? '' : 's'} quedan con permiso para todos los maestros`,
      )
      qc.invalidateQueries({ queryKey: ['excusas'] })
      setConfirmar(false)
      dismiss()
    },
    onError: (e) => {
      setConfirmar(false)
      toast.error(userMessageFromError(e))
    },
  })

  const titulo = soloVer ? 'Ver excusa' : excusa ? 'Editar excusa' : 'Nueva excusa'
  const rango = desde && hasta ? rangoExcusa({ fecha_inicio: desde, fecha_fin: hasta }) : ''

  return (
    <>
      <Modal
        open={open}
        wide
        title={titulo}
        onClose={dismiss}
        footer={
          soloVer ? (
            <button type="button" className="btn btn--primary" onClick={dismiss}>
              Cerrar
            </button>
          ) : (
            <>
              <button type="button" className="btn btn--ghost" onClick={dismiss}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                data-testid="excusa-guardar"
                disabled={Boolean(error) || mut.isPending}
                onClick={() => setConfirmar(true)}
              >
                Guardar
              </button>
            </>
          )
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} data-testid="excusa-form">
          <Field label="Alumno" htmlFor="excusa-alumno">
            <Combobox
              id="excusa-alumno"
              data-testid="excusa-alumno-input"
              value={alumno?.codigo ?? ''}
              disabled={soloVer}
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
          {alumno?.grado ? (
            <p className="texto-muted" style={{ margin: 0, fontSize: '0.85rem' }} data-testid="excusa-alumno-meta">
              {alumno.nombre} · {alumno.grado} sección {alumno.seccion}
            </p>
          ) : null}
          <Field label="Tipo de excusa" htmlFor="excusa-tipo">
            <Combobox
              id="excusa-tipo"
              data-testid="excusa-tipo-input"
              value={tipoId}
              disabled={soloVer}
              onChange={setTipoId}
              options={tipoOptions}
              placeholder="Buscar…"
              emptyLabel="No hay tipos activos"
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Desde" htmlFor="excusa-desde">
              <input
                id="excusa-desde"
                type="date"
                className="field__input"
                data-testid="excusa-desde"
                value={desde}
                disabled={soloVer}
                onChange={(e) => {
                  setDesde(e.target.value)
                  if (!hasta || hasta < e.target.value) setHasta(e.target.value)
                }}
              />
            </Field>
            <Field label="Hasta" htmlFor="excusa-hasta">
              <input
                id="excusa-hasta"
                type="date"
                className="field__input"
                data-testid="excusa-hasta"
                value={hasta}
                min={desde}
                disabled={soloVer}
                onChange={(e) => setHasta(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Descripción (opcional)" htmlFor="excusa-descripcion">
            <textarea
              id="excusa-descripcion"
              className="field__textarea"
              rows={3}
              data-testid="excusa-descripcion"
              value={descripcion}
              disabled={soloVer}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>
          {soloVer && excusa ? (
            <p className="texto-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {excusa.clases} clase{excusa.clases === 1 ? '' : 's'} con permiso · registrada por{' '}
              {excusa.registrado_por || '—'} el {excusa.creado_en}
            </p>
          ) : (
            <p className="texto-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Al guardar, todas las clases del alumno en esas fechas quedan como «Excusa» para todos los maestros y
              no se pueden cambiar. El padre recibe un aviso informativo.
            </p>
          )}
          {!soloVer && error ? <p className="field__error">{error}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Guardar excusa"
        message={`¿Guardar la excusa de ${alumno?.nombre ?? ''} (${rango})? Sus clases de esos días quedarán con permiso y no se podrán cambiar.`}
        confirmLabel="Guardar"
        onConfirm={() => mut.mutate()}
        onCancel={() => setConfirmar(false)}
      />
    </>
  )
}
