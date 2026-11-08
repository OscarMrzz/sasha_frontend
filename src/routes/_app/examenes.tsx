import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Can, RequirePermission, useCan } from '#/components/gates/Can'
import { ExamenViewModal } from '#/components/examenes/ExamenViewModal'
import { ExamenWizard } from '#/components/examenes/ExamenWizard'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import type { DataTableFilter } from '#/components/ui/DataTable'
import type { RowAction } from '#/components/ui/RowMenu'
import { userMessageFromError } from '#/lib/api'
import { estadoExamen, formatRangoFechas, soloFecha } from '#/lib/examenes'
import type { EstadoExamenTone } from '#/lib/examenes'
import {
  deleteExamenHorario,
  getExamenHorario,
  getExamenOpciones,
  listExamenHorarios,
  publicarExamenes,
  setExamenActiva,
} from '#/services/examenes'
import type {
  ExamenDetalle,
  ExamenHorario,
  ExamenOpciones,
} from '#/services/examenes'

export const Route = createFileRoute('/_app/examenes')({ component: ExamenesPage })

const EMPTY_OPCIONES: ExamenOpciones = {
  periodos: [],
  parciales: [],
  modalidades: [],
  grados: [],
  secciones: [],
  cursos: [],
  asignaciones: [],
  maestros: [],
}

type ExamenRow = ExamenHorario & {
  periodo_label: string
  parcial_label: string
  modalidad_label: string
  fechas_label: string
  estado_label: string
  estado_tone: EstadoExamenTone
}

const col = createColumnHelper<ExamenRow>()

function ExamenesPage() {
  return (
    <RequirePermission permission="examenes:get">
      <ExamenesAdminView />
    </RequirePermission>
  )
}

function ExamenesAdminView() {
  const { can } = useCan()
  const qc = useQueryClient()

  const { data: opcionesData, isLoading: loadingOpciones } = useQuery({
    queryKey: ['examenes', 'opciones'],
    queryFn: () => getExamenOpciones(),
  })
  const opciones = opcionesData ?? EMPTY_OPCIONES

  const { data: horarios = [], isFetching } = useQuery({
    queryKey: ['examenes', 'lista'],
    queryFn: () => listExamenHorarios(),
  })

  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardDetail, setWizardDetail] = useState<ExamenDetalle | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewDetail, setViewDetail] = useState<ExamenDetalle | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [ctx, setCtx] = useState<{ x: number; y: number; row: ExamenRow } | null>(null)
  const [confirmPublish, setConfirmPublish] = useState<ExamenRow | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<ExamenRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ExamenRow | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const close = () => closeCtx()
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctx, closeCtx])

  const rows = useMemo<ExamenRow[]>(() => {
    return horarios.map((h) => {
      const periodo =
        h.periodo_nombre ||
        opciones.periodos.find((p) => p.id === h.periodo_academico_id)?.nombre ||
        '—'
      const parcial =
        h.parcial_nombre ||
        opciones.parciales.find((p) => p.id === h.parcial_id)?.nombre ||
        '—'
      const modalidad =
        h.modalidad_nombre ||
        opciones.modalidades.find((m) => m.id === h.modalidad_id)?.nombre ||
        '—'
      const estado = estadoExamen(h.estado, h.es_activa)
      return {
        ...h,
        periodo_label: periodo,
        parcial_label: parcial,
        modalidad_label: modalidad,
        fechas_label: formatRangoFechas(soloFecha(h.fecha_inicio), soloFecha(h.fecha_fin)),
        estado_label: estado.label,
        estado_tone: estado.tone,
      }
    })
  }, [horarios, opciones])

  const columns = useMemo(
    () => [
      col.accessor('periodo_label', { header: 'Periodo' }),
      col.accessor('parcial_label', { header: 'Parcial' }),
      col.accessor('modalidad_label', { header: 'Modalidad' }),
      col.accessor('fechas_label', { header: 'Fechas' }),
      col.accessor('numero_version', {
        header: 'Versión',
        cell: (info) => `v${info.getValue()}`,
      }),
      col.accessor('estado_label', {
        header: 'Estado',
        cell: (info) => (
          <span className={`estado-pill estado-pill--${info.row.original.estado_tone}`}>
            {info.getValue()}
          </span>
        ),
      }),
    ],
    [],
  )

  const filters = useMemo<DataTableFilter<ExamenRow>[]>(
    () => [
      {
        id: 'periodo',
        label: 'Periodo',
        getValue: (row) => row.periodo_academico_id,
        options: opciones.periodos.map((p) => ({
          value: p.id,
          label: `${p.nombre} · ${p.anio_lectivo}`,
        })),
      },
      {
        id: 'parcial',
        label: 'Parcial',
        getValue: (row) => row.parcial_id,
        options: opciones.parciales.map((p) => ({
          value: p.id,
          label: p.nombre,
        })),
      },
      {
        id: 'modalidad',
        label: 'Modalidad',
        getValue: (row) => row.modalidad_id,
        options: opciones.modalidades.map((m) => ({
          value: m.id,
          label: m.nombre,
        })),
      },
      {
        id: 'estado',
        label: 'Estado',
        getValue: (row) => row.estado,
        options: [
          { value: 'borrador', label: 'Borrador' },
          { value: 'publicado', label: 'Publicado' },
          { value: 'archivado', label: 'Archivado' },
        ],
      },
    ],
    [opciones],
  )

  const exportRows = useMemo(
    () =>
      rows.map((r) => ({
        Periodo: r.periodo_label,
        Parcial: r.parcial_label,
        Modalidad: r.modalidad_label,
        Fechas: r.fechas_label,
        Versión: `v${r.numero_version}`,
        Estado: r.estado_label,
      })),
    [rows],
  )

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['examenes'] })
  }, [qc])

  async function openView(row: ExamenRow) {
    closeCtx()
    setViewOpen(true)
    setViewLoading(true)
    setViewDetail(null)
    try {
      const detail = await getExamenHorario(row.id)
      setViewDetail(detail)
    } catch (error) {
      toast.error(userMessageFromError(error))
      setViewOpen(false)
    } finally {
      setViewLoading(false)
    }
  }

  async function openEdit(row: ExamenRow) {
    closeCtx()
    try {
      const detail = await getExamenHorario(row.id)
      setWizardDetail(detail)
      setWizardOpen(true)
    } catch (error) {
      toast.error(userMessageFromError(error))
    }
  }

  function openCreate() {
    setWizardDetail(null)
    setWizardOpen(true)
  }

  const publicarMut = useMutation({
    mutationFn: (row: ExamenRow) => publicarExamenes(row.id),
    onSuccess: () => {
      toast.success('Horario publicado')
      setConfirmPublish(null)
      invalidate()
    },
    onError: (error) => toast.error(userMessageFromError(error)),
  })

  const toggleMut = useMutation({
    mutationFn: (row: ExamenRow) => setExamenActiva(row.id, !row.es_activa),
    onSuccess: (_, row) => {
      toast.success(row.es_activa ? 'Horario desactivado' : 'Horario activado')
      setConfirmToggle(null)
      invalidate()
    },
    onError: (error) => toast.error(userMessageFromError(error)),
  })

  const deleteMut = useMutation({
    mutationFn: (row: ExamenRow) => deleteExamenHorario(row.id),
    onSuccess: () => {
      toast.success('Horario eliminado')
      setConfirmDelete(null)
      invalidate()
    },
    onError: (error) => toast.error(userMessageFromError(error)),
  })

  const rowActions = (row: ExamenRow): RowAction[] => {
    const acciones: RowAction[] = [
      { label: 'Ver', onClick: () => void openView(row), testId: `examen-ver-${row.id}` },
    ]
    if (can('examenes:put')) {
      acciones.push({
        label: 'Editar',
        onClick: () => void openEdit(row),
        testId: `examen-editar-${row.id}`,
      })
      if (row.estado !== 'archivado') {
        acciones.push({
          label: 'Publicar',
          onClick: () => setConfirmPublish(row),
          testId: `examen-publicar-${row.id}`,
        })
      }
      if (row.estado === 'publicado') {
        acciones.push({
          label: row.es_activa ? 'Desactivar' : 'Activar',
          onClick: () => setConfirmToggle(row),
          testId: `examen-activar-${row.id}`,
        })
      }
    }
    if (can('examenes:delete')) {
      acciones.push({
        label: 'Eliminar',
        onClick: () => setConfirmDelete(row),
        danger: true,
        testId: `examen-eliminar-${row.id}`,
      })
    }
    return acciones
  }

  return (
    <>
      <DataTable
        title="Horarios de examen"
        data={rows}
        columns={columns}
        filters={filters}
        searchText={(row) =>
          [
            row.periodo_label,
            row.parcial_label,
            row.modalidad_label,
            row.fechas_label,
            `v${row.numero_version}`,
            row.estado_label,
            row.creado_por_codigo ?? '',
          ].join(' ')
        }
        addLabel="Agregar horario"
        addTestId="examen-add-button"
        canAdd={can('examenes:post') && !loadingOpciones}
        onAdd={openCreate}
        onRowContextMenu={(row, event) => setCtx({ x: event.clientX, y: event.clientY, row })}
        onRowDoubleClick={(row) => void openView(row)}
        exportFilename="horarios-examen"
        exportRows={exportRows}
        card={{
          title: (row) => `${row.periodo_label} · ${row.parcial_label}`,
          fields: (row) => [
            { label: 'Modalidad', value: row.modalidad_label },
            { label: 'Fechas', value: row.fechas_label },
            { label: 'Versión', value: `v${row.numero_version}` },
          ],
          status: (row) => ({ label: row.estado_label, tone: row.estado_tone }),
          testId: (row) => `examen-card-${row.id}`,
        }}
        rowActions={rowActions}
      />
      {isFetching ? (
        <p className="texto-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          Cargando horarios…
        </p>
      ) : null}

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" className="ctx-menu__item" onClick={() => void openView(ctx.row)}>
            Ver
          </button>
          <Can permission="examenes:put">
            <button type="button" className="ctx-menu__item" onClick={() => void openEdit(ctx.row)}>
              Editar
            </button>
            {ctx.row.estado !== 'archivado' ? (
              <button
                type="button"
                className="ctx-menu__item"
                onClick={() => {
                  setConfirmPublish(ctx.row)
                  closeCtx()
                }}
              >
                Publicar
              </button>
            ) : null}
            {ctx.row.estado === 'publicado' ? (
              <button
                type="button"
                className="ctx-menu__item"
                onClick={() => {
                  setConfirmToggle(ctx.row)
                  closeCtx()
                }}
              >
                {ctx.row.es_activa ? 'Desactivar' : 'Activar'}
              </button>
            ) : null}
          </Can>
          <Can permission="examenes:delete">
            <button
              type="button"
              className="ctx-menu__item ctx-menu__item--danger"
              onClick={() => {
                setConfirmDelete(ctx.row)
                closeCtx()
              }}
            >
              Eliminar
            </button>
          </Can>
        </div>
      ) : null}

      <ExamenWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false)
          setWizardDetail(null)
        }}
        opciones={opciones}
        detail={wizardDetail}
        onSaved={invalidate}
      />

      <ExamenViewModal
        open={viewOpen}
        detail={viewDetail}
        loading={viewLoading}
        onClose={() => {
          setViewOpen(false)
          setViewDetail(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmPublish)}
        title="Publicar horario"
        message={
          confirmPublish
            ? `¿Publicar ${confirmPublish.periodo_label} · ${confirmPublish.parcial_label} v${confirmPublish.numero_version}? Se desactivará la versión anterior de esa modalidad.`
            : ''
        }
        confirmLabel="Publicar"
        confirmDisabled={publicarMut.isPending}
        onConfirm={() => confirmPublish && publicarMut.mutate(confirmPublish)}
        onCancel={() => setConfirmPublish(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmToggle)}
        title={confirmToggle?.es_activa ? 'Desactivar horario' : 'Activar horario'}
        message={
          confirmToggle
            ? confirmToggle.es_activa
              ? `¿Desactivar ${confirmToggle.periodo_label} · ${confirmToggle.parcial_label} v${confirmToggle.numero_version}?`
              : `¿Activar ${confirmToggle.periodo_label} · ${confirmToggle.parcial_label} v${confirmToggle.numero_version}?`
            : ''
        }
        confirmLabel={confirmToggle?.es_activa ? 'Desactivar' : 'Activar'}
        confirmDisabled={toggleMut.isPending}
        onConfirm={() => confirmToggle && toggleMut.mutate(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar horario"
        message={
          confirmDelete
            ? `¿Eliminar ${confirmDelete.periodo_label} · ${confirmDelete.parcial_label} v${confirmDelete.numero_version}? Un horario publicado se archivará.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        confirmDisabled={deleteMut.isPending}
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}
