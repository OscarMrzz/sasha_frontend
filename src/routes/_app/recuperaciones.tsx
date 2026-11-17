import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { RecuperacionModal } from '#/components/recuperaciones/RecuperacionModal'
import { DataTable } from '#/components/ui/DataTable'
import type { RowAction } from '#/components/ui/RowMenu'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import { listMateriasAsistencia } from '#/services/asistencia'
import { listRecuperaciones } from '#/services/recuperaciones'
import type { FilaRecuperacion } from '#/services/recuperaciones'

export const Route = createFileRoute('/_app/recuperaciones')({ component: RecuperacionesPage })

type GrupoRecuperacion = Pick<FilaRecuperacion, 'tipo' | 'parcial_id' | 'numero' | 'etiqueta'> & { id: string }

const col = createColumnHelper<GrupoRecuperacion>()

function RecuperacionesPage() {
  const { can } = useCan()
  const [modalOpen, setModalOpen] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: GrupoRecuperacion } | null>(null)
  const [modal, setModal] = useState<{ row: GrupoRecuperacion; soloVer: boolean } | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const { data: materias = [], isLoading: loadingMaterias } = useQuery({
    queryKey: ['asistencia-materias'],
    queryFn: listMateriasAsistencia,
  })

  const lastId = readLastAsignacionId()
  const asigEffective =
    lastId && materias.some((m) => m.asignacion_docente_id === lastId)
      ? lastId
      : (materias[0]?.asignacion_docente_id ?? '')
  const materiaRow = materias.find((m) => m.asignacion_docente_id === asigEffective)
  const claseLabel = materiaRow
    ? `${materiaRow.curso_nombre} · ${materiaRow.grado_nombre} sec${materiaRow.seccion_nombre}`
    : ''

  const { data: lista, isLoading } = useQuery({
    queryKey: ['recuperaciones', asigEffective],
    queryFn: () => listRecuperaciones(asigEffective),
    enabled: Boolean(asigEffective),
  })
  const grupos = useMemo(() => {
    const porRecuperacion = new Map<string, GrupoRecuperacion>()
    for (const fila of lista?.filas ?? []) {
      const id = fila.tipo === 'parcial' ? `parcial-${fila.parcial_id}` : `periodo-${fila.numero}`
      if (porRecuperacion.has(id)) continue
      porRecuperacion.set(id, {
        id,
        tipo: fila.tipo,
        parcial_id: fila.parcial_id,
        numero: fila.numero,
        etiqueta: fila.tipo === 'parcial'
          ? lista?.parciales.find((p) => p.id === fila.parcial_id)?.etiqueta ?? fila.etiqueta
          : fila.etiqueta,
      })
    }
    return [...porRecuperacion.values()].sort((a, b) =>
      a.tipo === b.tipo ? a.numero - b.numero : a.tipo === 'parcial' ? -1 : 1,
    )
  }, [lista])

  const columns = useMemo(
    () => [
      col.accessor('etiqueta', { header: 'Parcial / Recuperación de periodo' }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'tipo',
        label: 'Tipo',
        getValue: (r: GrupoRecuperacion) => r.tipo,
        options: [
          { value: 'parcial', label: 'De parcial' },
          { value: 'periodo', label: 'De periodo' },
        ],
      },
    ],
    [],
  )

  if (loadingMaterias || (asigEffective && isLoading)) {
    return (
      <RequirePermission permission="recuperaciones:get">
        <div className="empty-state">Cargando recuperaciones…</div>
      </RequirePermission>
    )
  }
  if (!asigEffective || !lista) {
    return (
      <RequirePermission permission="recuperaciones:get">
        <div className="empty-state" data-testid="recuperaciones-sin-clase">
          No tienes clases asignadas.
        </div>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="recuperaciones:get">
      <div data-testid="recuperaciones-page">
        {lista.finalizado ? (
          <p className="recuperacion-aviso" data-testid="recuperaciones-finalizado">
            El periodo está finalizado: las recuperaciones son de solo lectura.
          </p>
        ) : null}
        <DataTable
          title={`Recuperaciones · ${claseLabel}`}
          data={grupos}
          columns={columns}
          filters={tableFilters}
          canAdd={can('recuperaciones:post') && !lista.finalizado}
          addLabel="Agregar"
          onAdd={() => setModalOpen(true)}
          exportFilename="recuperaciones"
          exportRows={grupos.map((r) => ({
            'Parcial / Recuperación de periodo': r.etiqueta,
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          card={{
            title: (r) => r.etiqueta,
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
            if (can('recuperaciones:post') && !lista.finalizado) {
              items.push(
                {
                  label: 'Editar',
                  testId: 'recuperaciones-ctx-editar',
                  onClick: () => setModal({ row: r, soloVer: false }),
                },
              )
            }
            return items
          }}
        />
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
          {can('recuperaciones:post') && !lista.finalizado ? (
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
      {modalOpen ? (
        <RecuperacionModal
          asignacionId={asigEffective}
          lista={lista}
          claseLabel={claseLabel}
          onClose={() => setModalOpen(false)}
        />
      ) : null}

      {modal ? (
        <RecuperacionModal
          asignacionId={asigEffective}
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
