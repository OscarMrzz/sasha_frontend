import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { AlertTriangle, Unlock } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  forzarLiberacion,
  getLiberacionEstado,
  liberarParciales,
  listAlumnosBloqueados,
} from '#/services/calificaciones'
import type { AlumnoBloqueado, EstadoLiberacionParcial, ParcialLiberacion } from '#/services/calificaciones'

export const Route = createFileRoute('/_app/liberacion-notas')({ component: LiberacionNotasPage })

const col = createColumnHelper<AlumnoBloqueado>()

const ESTADO_LABEL: Record<EstadoLiberacionParcial, string> = {
  liberado: 'Liberado',
  terminado: 'Listo para liberar',
  en_curso: 'En curso',
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fmtFecha(iso?: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MESES_CORTOS[m - 1]} ${y}`
}

function fmtMonto(n: number) {
  return `L ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function listaParciales(b: AlumnoBloqueado) {
  return b.parciales.map((p) => p.nombre || `Parcial ${p.numero}`).join(', ')
}

function ParcialCard({ p }: { p: ParcialLiberacion }) {
  return (
    <article className="mdash__tile" data-testid={`liberacion-parcial-${p.numero}`} data-estado={p.estado}>
      <h3 className="mdash__tile-title">{p.nombre || `Parcial ${p.numero}`}</h3>
      <span
        className={`badge badge--${p.estado === 'liberado' ? 'ok' : p.estado === 'terminado' ? 'warn' : 'muted'}`}
      >
        {ESTADO_LABEL[p.estado]}
      </span>
      <p className="liberacion__parcial-meses">
        {fmtFecha(p.fecha_inicio)} – {fmtFecha(p.fecha_fin)}
      </p>
      <p className="liberacion__parcial-meses">
        Meses: {p.meses.length ? p.meses.map((m) => m.etiqueta).join(', ') : '—'}
      </p>
      {p.fecha_liberacion ? (
        <p className="liberacion__parcial-meses">Liberado el {fmtFecha(p.fecha_liberacion)}</p>
      ) : null}
    </article>
  )
}

function DetallePagos({ alumno }: { alumno: AlumnoBloqueado }) {
  return (
    <div data-testid="liberacion-detalle-pagos">
      <p style={{ margin: '0 0 0.5rem' }}>
        <strong>{alumno.nombre}</strong> · código <strong>{alumno.codigo}</strong> · {alumno.grado}{' '}
        {alumno.seccion}
      </p>
      <p style={{ margin: '0 0 0.5rem' }}>Parciales ocultos: {listaParciales(alumno)}</p>
      <ul className="liberacion__meses-lista">
        {alumno.meses.map((m) => (
          <li key={m.obligacion_id}>
            Mensualidad de {m.etiqueta}: {fmtMonto(m.monto)} · vence {fmtFecha(m.fecha_vencimiento)} ({m.estado})
          </li>
        ))}
      </ul>
      <p style={{ margin: 0 }}>
        Total pendiente: <strong>{fmtMonto(alumno.monto_total)}</strong>
      </p>
    </div>
  )
}

function LiberacionNotasPage() {
  const qc = useQueryClient()
  const estadoQ = useQuery({ queryKey: ['liberacion-estado'], queryFn: getLiberacionEstado })
  const bloqueadosQ = useQuery({ queryKey: ['liberacion-bloqueados'], queryFn: listAlumnosBloqueados })

  const [liberarOpen, setLiberarOpen] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: AlumnoBloqueado } | null>(null)
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

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['liberacion-estado'] })
    qc.invalidateQueries({ queryKey: ['liberacion-bloqueados'] })
    qc.invalidateQueries({ queryKey: ['notificaciones'] })
  }

  const liberarMut = useMutation({
    mutationFn: liberarParciales,
    onSuccess: (r) => {
      toast.success(
        `Calificaciones liberadas. ${r.alumnos_bloqueados} alumno(s) quedan pendientes de pago; se enviaron ${r.avisos_enviados} aviso(s) personales.`,
      )
      setLiberarOpen(false)
      refrescar()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const forzarMut = useMutation({
    mutationFn: ({ alumnoId, codigo }: { alumnoId: string; codigo: string }) => forzarLiberacion(alumnoId, codigo),
    onSuccess: () => {
      toast.success('Liberación forzada registrada')
      setForzar(null)
      setForzarTyped('')
      refrescar()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const estado = estadoQ.data
  const porLiberar = estado?.parciales.filter((p) => p.estado === 'terminado') ?? []
  const forzarMatches = Boolean(forzar) && forzarTyped.trim() === (forzar?.codigo ?? '')

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Código' }),
      col.accessor('nombre', { header: 'Alumno' }),
      col.display({ id: 'grado', header: 'Grado / sección', cell: (i) => `${i.row.original.grado} ${i.row.original.seccion}` }),
      col.display({ id: 'parciales', header: 'Parciales ocultos', cell: (i) => listaParciales(i.row.original) }),
      col.display({
        id: 'meses',
        header: 'Meses pendientes',
        cell: (i) => i.row.original.meses.map((m) => m.etiqueta).join(', '),
      }),
      col.accessor('monto_total', { header: 'Pendiente', cell: (i) => fmtMonto(i.getValue()) }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      { id: 'grado', label: 'Grado', getValue: (r: AlumnoBloqueado) => r.grado },
      { id: 'seccion', label: 'Sección', getValue: (r: AlumnoBloqueado) => r.seccion },
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
              {estado ? `Periodo ${estado.periodo_nombre}` : estadoQ.isLoading ? 'Cargando…' : 'Sin periodo activo'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="liberacion-liberar-btn"
            disabled={!porLiberar.length}
            title={porLiberar.length ? undefined : 'No hay parciales terminados pendientes de liberar'}
            onClick={() => setLiberarOpen(true)}
          >
            <Unlock size={16} /> Liberar calificaciones
          </button>
        </header>

        {estadoQ.isError ? (
          <div className="empty-state">{userMessageFromError(estadoQ.error)}</div>
        ) : (
          <div className="liberacion__parciales">
            {estado?.parciales.map((p) => <ParcialCard key={p.id} p={p} />)}
          </div>
        )}

        <DataTable
          title="Alumnos sin liberar por pagos pendientes"
          data={bloqueadosQ.data ?? []}
          columns={columns}
          filters={tableFilters}
          searchPlaceholder="Buscar por código o nombre"
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
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
        open={liberarOpen}
        title="Liberar calificaciones"
        wide
        onClose={() => setLiberarOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setLiberarOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="liberacion-confirmar"
              disabled={liberarMut.isPending}
              onClick={() => liberarMut.mutate()}
            >
              {liberarMut.isPending ? 'Liberando…' : 'Liberar ahora'}
            </button>
          </>
        }
      >
        <div className="liberacion__explica" data-testid="liberacion-modal">
          <p>Se liberarán los parciales que ya terminaron:</p>
          <ul className="liberacion__meses-lista">
            {porLiberar.map((p) => (
              <li key={p.id}>
                <strong>{p.nombre || `Parcial ${p.numero}`}</strong> ({fmtFecha(p.fecha_inicio)} –{' '}
                {fmtFecha(p.fecha_fin)}): {p.meses.map((m) => m.etiqueta).join(', ')}
              </li>
            ))}
          </ul>
          <p>
            Cada familia verá la calificación de un parcial <strong>solo si tiene pagadas las mensualidades de los
            meses que abarca</strong>. Si un mes toca dos parciales, cuenta para ambos.
          </p>
          <p className="texto-muted">
            Ejemplo: si el parcial abarca marzo y abril y la familia no ha pagado esos meses, ni el padre ni el alumno
            verán la nota de ese parcial. En cuanto se registre el pago en caja, la nota aparece sola.
          </p>
          <p>Al liberar se envían automáticamente:</p>
          <ul className="liberacion__meses-lista">
            <li>Un aviso general a alumnos y padres: «ya se liberaron las calificaciones».</li>
            <li>
              Un aviso personal y respetuoso a cada padre con mensualidades pendientes, indicando el alumno y los meses.
            </li>
          </ul>
        </div>
      </Modal>

      <Modal
        open={ver != null}
        title="Pagos pendientes"
        onClose={() => setVer(null)}
        footer={
          <button type="button" className="btn btn--ghost" onClick={() => setVer(null)}>
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
            <button type="button" className="btn btn--ghost" onClick={() => setForzar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--danger"
              data-testid="liberacion-forzar-confirmar"
              disabled={!forzarMatches || forzarMut.isPending}
              onClick={() => forzar && forzarMut.mutate({ alumnoId: forzar.alumno_id, codigo: forzarTyped.trim() })}
            >
              Forzar liberación
            </button>
          </>
        }
      >
        {forzar ? (
          <div className="horario-delete-confirm">
            <p className="notas-bento__bloqueo" style={{ marginBottom: '0.75rem' }}>
              <AlertTriangle size={18} />
              <span>
                El alumno verá sus calificaciones aunque tenga mensualidades pendientes. La acción queda registrada en
                auditoría.
              </span>
            </p>
            <DetallePagos alumno={forzar} />
            <p className="horario-delete-confirm__hint" style={{ marginTop: '0.75rem' }}>
              Para confirmar, escribe el código del alumno:
            </p>
            <div className="horario-delete-confirm__expected">{forzar.codigo}</div>
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
