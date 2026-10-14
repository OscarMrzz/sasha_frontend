import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { RecuperacionModal } from '#/components/recuperaciones/RecuperacionModal'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { userMessageFromError } from '#/lib/api'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import { listMateriasAsistencia } from '#/services/asistencia'
import { guardarRecuperaciones, listRecuperaciones } from '#/services/recuperaciones'
import type { FilaRecuperacion } from '#/services/recuperaciones'

export const Route = createFileRoute('/_app/recuperaciones')({ component: RecuperacionesPage })

const col = createColumnHelper<FilaRecuperacion>()

function RecuperacionesPage() {
  const { can } = useCan()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: FilaRecuperacion } | null>(null)
  const [modal, setModal] = useState<{ row: FilaRecuperacion; soloVer: boolean } | null>(null)
  const [eliminar, setEliminar] = useState<FilaRecuperacion | null>(null)

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
  const filas = lista?.filas ?? []

  const eliminarMut = useMutation({
    mutationFn: (row: FilaRecuperacion) =>
      guardarRecuperaciones({
        asignacion_docente_id: asigEffective,
        tipo: row.tipo,
        parcial_id: row.tipo === 'parcial' ? row.parcial_id ?? undefined : undefined,
        numero: row.tipo === 'periodo' ? row.numero : undefined,
        items: [{ alumno_id: row.alumno_id, nota: null }],
      }),
    onSuccess: () => {
      toast.success('Recuperación eliminada')
      void qc.invalidateQueries({ queryKey: ['recuperaciones', asigEffective] })
      setEliminar(null)
    },
    onError: (e) => {
      toast.error(userMessageFromError(e))
      setEliminar(null)
    },
  })

  const columns = useMemo(
    () => [
      col.accessor('codigo', { header: 'Cuenta' }),
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('etiqueta', { header: 'Recuperación' }),
      col.accessor('nota_original', { header: 'Nota original' }),
      col.accessor('nota', { header: 'Nota recuperación' }),
      col.accessor('cuenta', { header: 'Nota que cuenta' }),
      col.accessor('aprobo', {
        header: 'Estado',
        cell: (i) => (
          <span className={`badge ${i.getValue() ? 'badge--ok' : 'badge--danger'}`}>
            {i.getValue() ? 'Aprobó' : 'Reprobó'}
          </span>
        ),
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'tipo',
        label: 'Tipo',
        getValue: (r: FilaRecuperacion) => r.tipo,
        options: [
          { value: 'parcial', label: 'De parcial' },
          { value: 'periodo', label: 'De periodo' },
        ],
      },
      { id: 'recuperacion', label: 'Recuperación', getValue: (r: FilaRecuperacion) => r.etiqueta },
      {
        id: 'estado',
        label: 'Estado',
        getValue: (r: FilaRecuperacion) => (r.aprobo ? 'aprobo' : 'reprobo'),
        options: [
          { value: 'aprobo', label: 'Aprobó' },
          { value: 'reprobo', label: 'Reprobó' },
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
          data={filas}
          columns={columns}
          filters={tableFilters}
          canAdd={can('recuperaciones:post')}
          addLabel="Agregar"
          onAdd={() => setModalOpen(true)}
          exportFilename="recuperaciones"
          exportRows={filas.map((r) => ({
            Cuenta: r.codigo,
            Nombre: r.nombre,
            Recuperación: r.etiqueta,
            'Nota original': r.nota_original,
            'Nota recuperación': r.nota,
            'Nota que cuenta': r.cuenta,
            Estado: r.aprobo ? 'Aprobó' : 'Reprobó',
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <Can permission="recuperaciones:post">
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="recuperaciones-ctx-ver"
              onClick={() => {
                setModal({ row: ctx.row, soloVer: true })
                closeCtx()
              }}
            >
              Ver
            </button>
            {lista.finalizado ? null : (
              <>
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
                <button
                  type="button"
                  className="ctx-menu__item ctx-menu__item--danger"
                  data-testid="recuperaciones-ctx-eliminar"
                  onClick={() => {
                    setEliminar(ctx.row)
                    closeCtx()
                  }}
                >
                  Eliminar
                </button>
              </>
            )}
          </Can>
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
          inicial={{
            tipo: modal.row.tipo,
            parcialId: modal.row.parcial_id ?? undefined,
            numero: modal.row.numero,
          }}
          onClose={() => setModal(null)}
        />
      ) : null}

      <ConfirmDialog
        open={eliminar != null}
        title="Eliminar recuperación"
        message={`¿Eliminar la recuperación de ${eliminar?.nombre ?? ''}? La nota del alumno volverá a su valor original.`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (eliminar) eliminarMut.mutate(eliminar)
        }}
        onCancel={() => setEliminar(null)}
      />
    </RequirePermission>
  )
}
