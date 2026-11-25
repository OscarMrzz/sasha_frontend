import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { Combobox } from '#/components/ui/Combobox'
import { listPeriodos } from '#/services/catalogos'
import { userMessageFromError } from '#/lib/api'
import {
  forzarLiberacion,
  getLiberacionEstado,
  cambiarLiberacionParcial,
  listAlumnosBloqueados,
} from '#/services/calificaciones'
import type {
  AlumnoBloqueado,
  ParcialLiberacion,
} from '#/services/calificaciones'

export const Route = createFileRoute('/_app/liberacion-notas')({
  component: LiberacionNotasPage,
})

const col = createColumnHelper<AlumnoBloqueado>()

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

function fmtFecha(iso?: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MESES_CORTOS[m - 1]} ${y}`
}

function fmtFechaParcial(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function fmtMonto(n: number) {
  return `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function listaParciales(b: AlumnoBloqueado) {
  return b.parciales.map((p) => p.nombre || `Parcial ${p.numero}`).join(', ')
}

function ParcialCard({
  p,
  pending,
  onToggle,
}: {
  p: ParcialLiberacion
  pending: boolean
  onToggle: () => void
}) {
  const liberado = p.estado === 'liberado'
  return (
    <article
      className="mdash__tile"
      data-testid={`liberacion-parcial-${p.numero}`}
      data-estado={p.estado}
    >
      <h3 className="mdash__tile-title">{p.nombre || `Parcial ${p.numero}`}</h3>
      <p className="liberacion__parcial-meses">
        Inicio: {fmtFechaParcial(p.fecha_inicio)}
      </p>
      <p className="liberacion__parcial-meses">
        Fin: {fmtFechaParcial(p.fecha_fin)}
      </p>
      <div className="liberacion__parcial-control">
        <span>{liberado ? 'Liberado' : 'Liberar'}</span>
        <button
          type="button"
          role="switch"
          aria-checked={liberado}
          aria-label={`Liberar notas de ${p.nombre || `Parcial ${p.numero}`}`}
          className={`switch${liberado ? ' switch--on' : ''}`}
          disabled={pending}
          onClick={onToggle}
          data-testid={`liberacion-interruptor-${p.numero}`}
        >
          <span className="switch__thumb" />
        </button>
      </div>
    </article>
  )
}

function DetallePagos({ alumno }: { alumno: AlumnoBloqueado }) {
  return (
    <div data-testid="liberacion-detalle-pagos">
      <p style={{ margin: '0 0 0.5rem' }}>
        <strong>{alumno.nombre}</strong> · código{' '}
        <strong>{alumno.codigo}</strong> · {alumno.grado} {alumno.seccion}
      </p>
      <p style={{ margin: '0 0 0.5rem' }}>
        Parciales ocultos: {listaParciales(alumno)}
      </p>
      <ul className="liberacion__meses-lista">
        {alumno.meses.map((m) => (
          <li key={m.obligacion_id}>
            {m.etiqueta}: {fmtMonto(m.monto)} · vence{' '}
            {fmtFecha(m.fecha_vencimiento)} ({m.estado})
          </li>
        ))}
      </ul>
      {alumno.tipos_bloqueantes && alumno.tipos_bloqueantes.length > 0 ? (
        <p
          style={{ margin: '0 0 0.5rem' }}
          data-testid="liberacion-tipos-bloqueantes"
        >
          Bloquea: {alumno.tipos_bloqueantes.join(', ')}
        </p>
      ) : null}
      <p style={{ margin: 0 }}>
        Total pendiente: <strong>{fmtMonto(alumno.monto_total)}</strong>
      </p>
    </div>
  )
}

function LiberacionNotasPage() {
  const qc = useQueryClient()
  const [periodoId, setPeriodoId] = useState('')
  const periodosQ = useQuery({
    queryKey: ['catalogos-periodos'],
    queryFn: listPeriodos,
  })
  useEffect(() => {
    if (!periodoId && periodosQ.data?.length) {
      setPeriodoId(
        (periodosQ.data.find((p) => p.status === 'ACTIVE') ?? periodosQ.data[0])
          .id,
      )
    }
  }, [periodoId, periodosQ.data])
  const estadoQ = useQuery({
    queryKey: ['liberacion-estado', periodoId],
    queryFn: () => getLiberacionEstado(periodoId),
    enabled: Boolean(periodoId),
  })
  const bloqueadosQ = useQuery({
    queryKey: ['liberacion-bloqueados', periodoId],
    queryFn: () => listAlumnosBloqueados(periodoId),
    enabled: Boolean(periodoId),
  })

  const [ctx, setCtx] = useState<{
    x: number
    y: number
    row: AlumnoBloqueado
  } | null>(null)
  const [ver, setVer] = useState<AlumnoBloqueado | null>(null)
  const [forzar, setForzar] = useState<AlumnoBloqueado | null>(null)
  const [forzarTyped, setForzarTyped] = useState('')

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const refrescar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['liberacion-estado'] }),
      qc.invalidateQueries({ queryKey: ['liberacion-bloqueados'] }),
      qc.invalidateQueries({ queryKey: ['notificaciones'] }),
      qc.invalidateQueries({ queryKey: ['portal-calificaciones'] }),
      qc.invalidateQueries({ queryKey: ['portal-resumen'] }),
      qc.invalidateQueries({ queryKey: ['portal-resultado'] }),
    ])
  }

  const liberarMut = useMutation({
    mutationFn: cambiarLiberacionParcial,
    onSuccess: async (resultado, variables) => {
      if (resultado.advertencia) {
        toast.warning(resultado.advertencia)
      } else {
        toast.success(
          variables.liberado
            ? 'Notas del parcial liberadas'
            : 'Notas del parcial ocultas',
        )
      }
      await refrescar()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const forzarMut = useMutation({
    mutationFn: ({ alumnoId, codigo }: { alumnoId: string; codigo: string }) =>
      forzarLiberacion(alumnoId, codigo, periodoId),
    onSuccess: async () => {
      toast.success('Liberación forzada registrada')
      setForzar(null)
      setForzarTyped('')
      await refrescar()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const estado = estadoQ.data
  const forzarMatches =
    Boolean(forzar) && forzarTyped.trim() === (forzar?.codigo ?? '')

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Código' }),
      col.accessor('nombre', { header: 'Alumno' }),
      col.display({
        id: 'grado',
        header: 'Grado / sección',
        cell: (i) => `${i.row.original.grado} ${i.row.original.seccion}`,
      }),
      col.display({
        id: 'parciales',
        header: 'Parciales ocultos',
        cell: (i) => listaParciales(i.row.original),
      }),
      col.display({
        id: 'meses',
        header: 'Meses pendientes',
        cell: (i) => i.row.original.meses.map((m) => m.etiqueta).join(', '),
      }),
      col.accessor('monto_total', {
        header: 'Pendiente',
        cell: (i) => fmtMonto(i.getValue()),
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'grado',
        label: 'Grado',
        getValue: (r: AlumnoBloqueado) => r.grado,
      },
      {
        id: 'seccion',
        label: 'Sección',
        getValue: (r: AlumnoBloqueado) => r.seccion,
      },
    ],
    [],
  )

  return (
    <RequirePermission permission="calificaciones:post">
      <section className="liberacion" data-testid="liberacion-page">
        <header className="liberacion__header">
          <div style={{ flex: 1 }}>
            <h1 className="page-title">Liberación de notas</h1>
            <p className="texto-muted" style={{ margin: 0 }}>
              Selecciona un período y libera las notas de cada parcial.
            </p>
          </div>
        </header>
        <div className="liberacion__periodo">
          <Field label="Período académico" htmlFor="liberacion-periodo">
            <Combobox
              id="liberacion-periodo"
              value={periodoId}
              options={(periodosQ.data ?? []).map((p) => ({
                value: p.id,
                label: p.nombre,
              }))}
              onChange={(id) => {
                setPeriodoId(id)
                setCtx(null)
                setVer(null)
                setForzar(null)
                setForzarTyped('')
              }}
              placeholder="Seleccionar período"
              disabled={
                periodosQ.isLoading ||
                liberarMut.isPending ||
                forzarMut.isPending
              }
              emptyLabel="No hay períodos disponibles"
              data-testid="liberacion-periodo"
            />
          </Field>
        </div>

        {periodosQ.isError || estadoQ.isError ? (
          <div className="empty-state" role="alert">
            {userMessageFromError(periodosQ.error ?? estadoQ.error)}
          </div>
        ) : periodosQ.isLoading || (periodoId && estadoQ.isLoading) ? (
          <div className="empty-state" role="status">
            Cargando parciales…
          </div>
        ) : !periodoId ? (
          <div className="empty-state">No hay períodos disponibles.</div>
        ) : !estado?.parciales.length ? (
          <div className="empty-state">
            Este período no tiene parciales registrados.
          </div>
        ) : (
          <div className="liberacion__parciales">
            {estado.parciales.map((p) => (
              <ParcialCard
                key={p.id}
                p={p}
                pending={liberarMut.isPending}
                onToggle={() =>
                  liberarMut.mutate({
                    periodo_academico_id: periodoId,
                    parcial_id: p.id,
                    liberado: p.estado !== 'liberado',
                  })
                }
              />
            ))}
          </div>
        )}

        {bloqueadosQ.isError ? (
          <div className="empty-state" role="alert">
            {userMessageFromError(bloqueadosQ.error)}
          </div>
        ) : periodoId && bloqueadosQ.isLoading ? (
          <div className="empty-state" role="status">
            Cargando pagos pendientes…
          </div>
        ) : periodoId ? (
          <DataTable
            fixedOrder
            key={periodoId}
            title="Alumnos sin liberar por pagos pendientes"
            data={bloqueadosQ.data ?? []}
            columns={columns}
            filters={tableFilters}
            onRowContextMenu={(row, e) =>
              setCtx({ x: e.clientX, y: e.clientY, row })
            }
          />
        ) : null}
      </section>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="liberacion-ctx-ver"
            onClick={() => {
              setVer(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="liberacion-ctx-forzar"
            onClick={() => {
              setForzar(ctx.row)
              setForzarTyped('')
              closeCtx()
            }}
          >
            Forzar liberación
          </button>
        </div>
      ) : null}

      <Modal
        open={ver != null}
        title="Pagos pendientes"
        onClose={() => setVer(null)}
        footer={
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setVer(null)}
          >
            Cerrar
          </button>
        }
      >
        {ver ? <DetallePagos alumno={ver} /> : null}
      </Modal>

      <Modal
        open={forzar != null}
        title="Forzar liberación"
        onClose={() => setForzar(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setForzar(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--danger"
              data-testid="liberacion-forzar-confirmar"
              disabled={!forzarMatches || forzarMut.isPending}
              onClick={() =>
                forzar &&
                forzarMut.mutate({
                  alumnoId: forzar.alumno_id,
                  codigo: forzarTyped.trim(),
                })
              }
            >
              Forzar liberación
            </button>
          </>
        }
      >
        {forzar ? (
          <div className="horario-delete-confirm">
            <p
              className="notas-bento__bloqueo"
              style={{ marginBottom: '0.75rem' }}
            >
              <AlertTriangle size={18} />
              <span>
                El alumno verá sus calificaciones aunque tenga mensualidades
                pendientes. La acción queda registrada en auditoría.
              </span>
            </p>
            <DetallePagos alumno={forzar} />
            <p
              className="horario-delete-confirm__hint"
              style={{ marginTop: '0.75rem' }}
            >
              Para confirmar, escribe el código del alumno:
            </p>
            <div className="horario-delete-confirm__expected">
              {forzar.codigo}
            </div>
            <Field label="Código del alumno">
              <input
                className="field__input"
                value={forzarTyped}
                onChange={(e) => setForzarTyped(e.target.value)}
                placeholder={forzar.codigo}
                autoComplete="off"
                data-testid="liberacion-forzar-input"
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </RequirePermission>
  )
}
