import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { RecuperacionModal } from '#/components/recuperaciones/RecuperacionModal'
import { Combobox } from '#/components/ui/Combobox'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import type { RowAction } from '#/components/ui/RowMenu'
import { userMessageFromError } from '#/lib/api'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import {
  listOpcionesRecuperaciones,
  listRecuperaciones,
} from '#/services/recuperaciones'
import type { EtapaRecuperacion } from '#/services/recuperaciones'

export const Route = createFileRoute('/_app/recuperaciones')({
  component: RecuperacionesPage,
})
const col = createColumnHelper<EtapaRecuperacion>()

function RecuperacionesPage() {
  const { can } = useCan()
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('')
  const [ctx, setCtx] = useState<{
    x: number
    y: number
    row: EtapaRecuperacion
  } | null>(null)
  const [modal, setModal] = useState<{
    row: EtapaRecuperacion
    soloVer: boolean
  } | null>(null)
  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const opcionesQ = useQuery({
    queryKey: ['recuperaciones-opciones'],
    queryFn: () => listOpcionesRecuperaciones(),
  })
  const periodoActualId = opcionesQ.data?.periodo_id ?? ''
  const periodoId = periodoSeleccionado || periodoActualId
  const contextoQ = useQuery({
    queryKey: ['recuperaciones-opciones-periodo', periodoId],
    queryFn: () => listOpcionesRecuperaciones(periodoId),
    enabled: Boolean(periodoId && periodoId !== periodoActualId),
  })
  const contexto =
    periodoId === periodoActualId ? opcionesQ.data : contextoQ.data
  const periodos = opcionesQ.data?.periodos ?? []
  const materias = contexto?.clases ?? []
  const lastId = readLastAsignacionId()
  const asignacionId =
    lastId && materias.some((m) => m.asignacion_docente_id === lastId)
      ? lastId
      : (materias[0]?.asignacion_docente_id ?? '')
  const materia = materias.find((m) => m.asignacion_docente_id === asignacionId)
  const claseLabel = materia
    ? `${materia.curso_nombre} · ${materia.grado_nombre} sec. ${materia.seccion_nombre}`
    : ''
  const listaQ = useQuery({
    queryKey: ['recuperaciones', periodoId, asignacionId],
    queryFn: () => listRecuperaciones(asignacionId, periodoId),
    enabled: Boolean(periodoId && asignacionId),
  })
  const lista = listaQ.data
  const grupos = lista?.etapas ?? []
  const editable = (r: EtapaRecuperacion) =>
    can('recuperaciones:post') && !lista?.finalizado && r.disponible
  const columns = useMemo(
    () => [
      col.accessor('etiqueta', { header: 'Parcial / Final' }),
      col.accessor('disponible', {
        header: 'Disponibilidad',
        cell: ({ row }) =>
          row.original.disponible
            ? 'Disponible'
            : row.original.mensaje || 'No disponible',
      }),
    ],
    [],
  )
  const cambiarPeriodo = (id: string) => {
    setModal(null)
    setCtx(null)
    setPeriodoSeleccionado(id)
  }
  const error =
    opcionesQ.error ||
    (periodoId !== periodoActualId ? contextoQ.error : null) ||
    listaQ.error

  return (
    <RequirePermission permission="recuperaciones:get">
      <div data-testid="recuperaciones-page">
        <div className="recuperaciones-filtros">
          <Field label="Período">
            <Combobox
              value={periodoId}
              options={periodos.map((p) => ({
                value: p.id,
                label: p.nombre,
              }))}
              onChange={cambiarPeriodo}
              disabled={opcionesQ.isLoading}
              data-testid="recuperaciones-periodo"
            />
          </Field>
        </div>
        {opcionesQ.isLoading ||
        (periodoId !== periodoActualId && contextoQ.isLoading) ||
        (asignacionId && listaQ.isLoading) ? (
          <div className="empty-state">Cargando recuperaciones…</div>
        ) : error ? (
          <div className="empty-state" role="alert">
            {userMessageFromError(error)}
          </div>
        ) : !periodoId ? (
          <div className="empty-state">Selecciona un período.</div>
        ) : !asignacionId || !lista ? (
          <div className="empty-state" data-testid="recuperaciones-sin-clase">
            No tienes clases asignadas en este período.
          </div>
        ) : (
          <>
            {lista.finalizado ? (
              <p
                className="recuperacion-aviso"
                data-testid="recuperaciones-finalizado"
              >
                El período está finalizado: las recuperaciones son de solo
                lectura.
              </p>
            ) : null}
            <DataTable
              title={`Recuperaciones · ${claseLabel}`}
              data={grupos}
              columns={columns}
              exportFilename="recuperaciones"
              exportRows={grupos.map((r) => ({
                'Parcial / Final': r.etiqueta,
                Disponibilidad: r.disponible
                  ? 'Disponible'
                  : r.mensaje || 'No disponible',
              }))}
              onRowContextMenu={(row, e) =>
                setCtx({ x: e.clientX, y: e.clientY, row })
              }
              card={{
                title: (r) => r.etiqueta,
                fields: (r) => [
                  {
                    label: 'Disponibilidad',
                    value: r.disponible
                      ? 'Disponible'
                      : r.mensaje || 'No disponible',
                  },
                ],
                testId: (r) => `recuperacion-card-${r.id}`,
              }}
              rowActions={(r) => {
                const items: RowAction[] = [
                  {
                    label: 'Abrir',
                    testId: 'recuperaciones-ctx-abrir',
                    onClick: () => setModal({ row: r, soloVer: true }),
                  },
                ]
                if (editable(r))
                  items.push({
                    label: 'Editar',
                    testId: 'recuperaciones-ctx-editar',
                    onClick: () => setModal({ row: r, soloVer: false }),
                  })
                return items
              }}
            />
          </>
        )}
      </div>
      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="recuperaciones-ctx-abrir"
            onClick={() => {
              setModal({ row: ctx.row, soloVer: true })
              closeCtx()
            }}
          >
            Abrir
          </button>
          {editable(ctx.row) ? (
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="recuperaciones-ctx-editar"
              onClick={() => {
                setModal({ row: ctx.row, soloVer: false })
                closeCtx()
              }}
            >
              Editar
            </button>
          ) : null}
        </div>
      ) : null}
      {modal && lista ? (
        <RecuperacionModal
          key={`${periodoId}-${asignacionId}-${modal.row.id}`}
          asignacionId={asignacionId}
          lista={lista}
          claseLabel={claseLabel}
          soloVer={modal.soloVer}
          fijarSeleccion
          inicial={{
            tipo: modal.row.tipo,
            parcialId: modal.row.parcial_id ?? undefined,
            numero: modal.row.numero,
          }}
          onClose={() => setModal(null)}
        />
      ) : null}
    </RequirePermission>
  )
}
