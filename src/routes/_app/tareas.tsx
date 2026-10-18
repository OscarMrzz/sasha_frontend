import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import type { RowAction } from '#/components/ui/RowMenu'
import { TareaCreateModal } from '#/components/tareas/TareaCreateModal'
import { TareaRevisionModal } from '#/components/tareas/TareaRevisionModal'
import { TareaVerModal } from '#/components/tareas/TareaVerModal'
import { ClaseTareasModal } from '#/components/tareas/ClaseTareasModal'
import { PortalTareasView } from '#/components/portal/PortalTareasView'
import { RequirePortalClase } from '#/components/portal/RequirePortalClase'
import { validarAdjunto } from '#/helpers/adjuntos'
import { useAccionPalette } from '#/hooks/use-accion-palette'
import { useLimitesAdjuntos } from '#/hooks/use-limites-adjuntos'
import { userMessageFromError } from '#/lib/api'
import { isPortalRole } from '#/lib/home-path'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import { listMateriasAsistencia } from '#/services/asistencia'
import {
  deleteTarea,
  getClaseTareas,
  listClasesTareas,
  listTareas,
  labelCriterioModo,
  subirAdjunto,
} from '#/services/tareas'
import type { ClaseResumen, Tarea, TareaDetalle } from '#/services/tareas'

/** Roles que ven las tareas por clase de todo el colegio, en solo lectura. */
const VISTA_GENERAL = new Set(['consejeria', 'director', 'secretaria', 'coordinador'])

export const Route = createFileRoute('/_app/tareas')({
  validateSearch: (s: Record<string, unknown>) => ({
    revisar: typeof s.revisar === 'string' ? s.revisar : undefined,
  }),
  component: TareasPage,
})

const col = createColumnHelper<Tarea>()

function claseLabel(t: Tarea) {
  return `${t.curso_nombre ?? '—'} · ${t.grado_nombre ?? ''} sec${t.seccion_nombre ?? ''}`
}

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Lunes y domingo (AAAA-MM-DD) de la semana actual. */
function semanaActual() {
  const hoy = new Date()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  return { inicio: isoLocal(lunes), fin: isoLocal(domingo) }
}

function periodoEntrega(fecha: string): 'semana' | 'proximas' | 'anteriores' {
  const { inicio, fin } = semanaActual()
  const f = fecha.slice(0, 10)
  if (f < inicio) return 'anteriores'
  if (f > fin) return 'proximas'
  return 'semana'
}

function TareasPage() {
  const { roles } = useCan()
  if (isPortalRole(roles)) {
    return (
      <RequirePermission permission="tareas:get">
        <RequirePortalClase>
          {({ clase, alumnoId }) => (
            <PortalTareasView
              asignacionId={clase.asignacionId}
              cursoNombre={clase.cursoNombre}
              alumnoId={alumnoId}
            />
          )}
        </RequirePortalClase>
      </RequirePermission>
    )
  }
  if (roles.some((r) => VISTA_GENERAL.has(r))) return <TareasConsejeriaView />
  return <TareasStaffPage />
}

const colClase = createColumnHelper<ClaseResumen>()

function TareasConsejeriaView() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['tareas-clases'],
    queryFn: listClasesTareas,
  })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: ClaseResumen } | null>(null)
  const [verClase, setVerClase] = useState<ClaseResumen | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const columns = useMemo(
    () => [
      colClase.accessor('curso_nombre', { header: 'Materia' }),
      colClase.accessor('grado_nombre', { header: 'Grado' }),
      colClase.accessor('seccion_nombre', { header: 'Sección' }),
      colClase.accessor('modalidad_nombre', { header: 'Modalidad' }),
      colClase.accessor('maestro_nombre', {
        header: 'Maestro',
        cell: (i) => i.getValue() || '—',
      }),
      colClase.accessor('tareas_total', { header: 'Tareas' }),
      colClase.accessor('tareas_semana', { header: 'Esta semana' }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'maestro',
        label: 'Maestro',
        getValue: (r: ClaseResumen) => r.maestro_id,
        getLabel: (r: ClaseResumen) => r.maestro_nombre,
      },
      { id: 'materia', label: 'Materia', getValue: (r: ClaseResumen) => r.curso_nombre },
      { id: 'grado', label: 'Grado', getValue: (r: ClaseResumen) => r.grado_nombre },
      { id: 'seccion', label: 'Sección', getValue: (r: ClaseResumen) => r.seccion_nombre },
      { id: 'modalidad', label: 'Modalidad', getValue: (r: ClaseResumen) => r.modalidad_nombre },
    ],
    [],
  )

  return (
    <RequirePermission permission="tareas:get">
      {isLoading ? (
        <div className="empty-state">Cargando clases…</div>
      ) : (
        <DataTable
          title="Tareas"
          data={data}
          columns={columns}
          filters={tableFilters}
          canAdd={false}
          onRowDoubleClick={(row) => setVerClase(row)}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
        />
      )}

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          data-testid="tareas-ctx-menu"
        >
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="tareas-ctx-ver"
            onClick={() => {
              setVerClase(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
        </div>
      ) : null}

      {verClase ? <ClaseTareasModal clase={verClase} onClose={() => setVerClase(null)} /> : null}
    </RequirePermission>
  )
}

function TareasStaffPage() {
  const qc = useQueryClient()
  const { roles, can } = useCan()
  const esMaestro = roles.includes('maestro')
  const { revisar: revisarFromSearch } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: materias = [] } = useQuery({
    queryKey: ['asistencia-materias'],
    queryFn: listMateriasAsistencia,
  })
  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ['tareas'],
    queryFn: listTareas,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [revisarId, setRevisarId] = useState<string | null>(revisarFromSearch ?? null)
  const [asigId, setAsigId] = useState(() => readLastAsignacionId() ?? '')
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Tarea } | null>(null)
  const [verTarea, setVerTarea] = useState<Tarea | null>(null)
  const [editTarea, setEditTarea] = useState<Tarea | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Tarea | null>(null)

  // Adjunto rápido desde el menú contextual: los inputs ocultos viven en la
  // página (siempre montados) y la fila destino se guarda al pulsar el ítem.
  // El ref da la tarea de forma síncrona; el estado solo resuelve los límites.
  const adjuntoTareaRef = useRef<Tarea | null>(null)
  const [adjuntoParcialId, setAdjuntoParcialId] = useState<string | undefined>(undefined)
  const imagenRef = useRef<HTMLInputElement>(null)
  const fotoRef = useRef<HTMLInputElement>(null)
  const { maxPesoMB: adjuntoMaxMB } = useLimitesAdjuntos({ parcialId: adjuntoParcialId })

  useAccionPalette('nuevo-tarea', () => setCreateOpen(true))

  useEffect(() => {
    if (revisarFromSearch) setRevisarId(revisarFromSearch)
  }, [revisarFromSearch])

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTarea(id),
    onSuccess: () => {
      toast.success('Tarea eliminada')
      void qc.invalidateQueries({ queryKey: ['tareas'] })
      void qc.invalidateQueries({ queryKey: ['maestro-dashboard'] })
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const subirAdjuntoMut = useMutation({
    mutationFn: ({ tareaId, file }: { tareaId: string; file: File }) =>
      subirAdjunto(tareaId, file),
    onSuccess: (a, vars) => {
      toast.success(`Archivo "${a.nombre_original}" cargado`)
      void qc.invalidateQueries({ queryKey: ['tarea-adjuntos', vars.tareaId] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  /** Valida tipo/peso y sube el archivo elegido a la tarea del menú contextual. */
  const aceptarAdjuntoRapido = (file: File | undefined) => {
    const tarea = adjuntoTareaRef.current
    if (!file || !tarea) return
    const error = validarAdjunto(file, adjuntoMaxMB)
    if (error) {
      toast.error(error)
      return
    }
    subirAdjuntoMut.mutate({ tareaId: tarea.id, file })
  }

  const asigEffective =
    asigId && materias.some((m) => m.asignacion_docente_id === asigId)
      ? asigId
      : (materias[0]?.asignacion_docente_id ?? '')

  const materiaRow = materias.find((m) => m.asignacion_docente_id === asigEffective)
  const createLabel = materiaRow
    ? `${materiaRow.curso_nombre} · ${materiaRow.grado_nombre} sec${materiaRow.seccion_nombre} · ${materiaRow.modalidad_nombre}`
    : 'Sin clase'

  // El listado general no trae `revisada`: para el maestro se consulta su clase
  // (una sola petición) y así la card puede mostrar Revisada/Sin revisar y las entregas.
  const { data: claseDetalle } = useQuery({
    queryKey: ['clase-tareas', asigEffective],
    queryFn: () => getClaseTareas(asigEffective),
    enabled: esMaestro && Boolean(asigEffective),
  })
  const revisionPorTarea = useMemo(() => {
    const mapa = new Map<string, TareaDetalle>()
    for (const t of claseDetalle?.tareas ?? []) mapa.set(t.id, t)
    return mapa
  }, [claseDetalle])

  const columns = useMemo(
    () => [
      col.accessor('titulo', { header: 'Título' }),
      col.accessor((r) => claseLabel(r), { id: 'clase', header: 'Clase' }),
      col.accessor((r) => r.parcial_nombre || '—', { id: 'parcial', header: 'Parcial' }),
      col.accessor((r) => r.tipo_tarea_nombre || '—', { id: 'tipo_tarea', header: 'Tipo' }),
      col.accessor('tipo', {
        header: 'Criterio',
        cell: (i) => labelCriterioModo(i.getValue()),
      }),
      col.accessor('puntos', { header: 'Puntos' }),
      col.accessor('fecha_entrega', { header: 'Entrega' }),
      col.display({
        id: 'acciones',
        header: '',
        cell: ({ row }) => (
          <Can permission="tareas:post">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              data-testid={`tarea-revisar-${row.original.id}`}
              onClick={() => setRevisarId(row.original.id)}
            >
              Revisar
            </button>
          </Can>
        ),
      }),
    ],
    [],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'entrega',
        label: 'Entrega',
        getValue: (r: Tarea) => periodoEntrega(r.fecha_entrega),
        options: [
          { value: 'semana', label: 'Esta semana' },
          { value: 'proximas', label: 'Próximas' },
          { value: 'anteriores', label: 'Anteriores' },
        ],
      },
      {
        id: 'parcial',
        label: 'Parcial',
        getValue: (r: Tarea) => r.parcial_nombre || 'Sin parcial',
      },
      {
        id: 'tipo_tarea',
        label: 'Tipo',
        getValue: (r: Tarea) => r.tipo_tarea_nombre || 'Sin tipo',
      },
      {
        id: 'criterio',
        label: 'Criterio',
        getValue: (r: Tarea) => labelCriterioModo(r.tipo),
      },
      {
        id: 'clase',
        label: 'Clase',
        getValue: (r: Tarea) => claseLabel(r),
      },
    ],
    [],
  )

  const closeRevision = () => {
    setRevisarId(null)
    if (revisarFromSearch) {
      void navigate({ search: { revisar: undefined } })
    }
  }

  return (
    <RequirePermission permission="tareas:get">
      {isLoading ? (
        <div className="empty-state">Cargando tareas…</div>
      ) : (
        <DataTable
          title="Tareas"
          data={tareas}
          columns={columns}
          filters={tableFilters}
          initialFilters={{ entrega: 'semana' }}
          canAdd={esMaestro}
          addLabel="Nueva tarea"
          onAdd={() => setCreateOpen(true)}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          onRowDoubleClick={(row) => setRevisarId(row.id)}
          card={{
            title: (t) => t.titulo,
            testId: (t) => `tarea-card-${t.id}`,
            status: (t) => {
              const d = revisionPorTarea.get(t.id)
              if (!d) return null
              return d.revisada
                ? { label: 'Revisada', tone: 'ok' }
                : { label: 'Sin revisar', tone: 'espera' }
            },
            fields: (t) => {
              const d = revisionPorTarea.get(t.id)
              return [
                { label: 'Puntos', value: t.puntos },
                { label: 'Entrega', value: t.fecha_entrega },
                ...(d
                  ? [{ label: 'Entregas', value: `${d.entregados} / ${d.alumnos_total}` }]
                  : []),
              ]
            },
          }}
          rowActions={(t) => {
            const items: RowAction[] = [
              { label: 'Ver', testId: 'tareas-staff-ctx-ver', onClick: () => setVerTarea(t) },
              {
                label: 'Revisar',
                testId: 'tareas-staff-ctx-revisar',
                onClick: () => setRevisarId(t.id),
              },
            ]
            if (can('tareas:put')) {
              items.push(
                {
                  label: 'Cargar imagen',
                  testId: 'tareas-staff-ctx-cargar-imagen',
                  onClick: () => {
                    adjuntoTareaRef.current = t
                    setAdjuntoParcialId(t.parcial_id)
                    imagenRef.current?.click()
                  },
                },
                {
                  label: 'Tomar foto',
                  testId: 'tareas-staff-ctx-tomar-foto',
                  onClick: () => {
                    adjuntoTareaRef.current = t
                    setAdjuntoParcialId(t.parcial_id)
                    fotoRef.current?.click()
                  },
                },
                {
                  label: 'Editar',
                  testId: 'tareas-staff-ctx-editar',
                  onClick: () => setEditTarea(t),
                },
              )
            }
            if (can('tareas:delete')) {
              items.push({
                label: 'Eliminar',
                danger: true,
                testId: 'tareas-staff-ctx-eliminar',
                onClick: () => setConfirmDelete(t),
              })
            }
            return items
          }}
        />
      )}

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          data-testid="tareas-staff-ctx-menu"
        >
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="tareas-staff-ctx-ver"
            onClick={() => {
              setVerTarea(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="tareas-staff-ctx-revisar"
            onClick={() => {
              setRevisarId(ctx.row.id)
              closeCtx()
            }}
          >
            Revisar
          </button>
          <Can permission="tareas:put">
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="tareas-staff-ctx-cargar-imagen"
              onClick={() => {
                adjuntoTareaRef.current = ctx.row
                setAdjuntoParcialId(ctx.row.parcial_id)
                closeCtx()
                imagenRef.current?.click()
              }}
            >
              Cargar imagen
            </button>
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="tareas-staff-ctx-tomar-foto"
              onClick={() => {
                adjuntoTareaRef.current = ctx.row
                setAdjuntoParcialId(ctx.row.parcial_id)
                closeCtx()
                fotoRef.current?.click()
              }}
            >
              Tomar foto
            </button>
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="tareas-staff-ctx-editar"
              onClick={() => {
                setEditTarea(ctx.row)
                closeCtx()
              }}
            >
              Editar
            </button>
          </Can>
          <Can permission="tareas:delete">
            <button
              type="button"
              className="ctx-menu__item ctx-menu__item--danger"
              data-testid="tareas-staff-ctx-eliminar"
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

      {createOpen ? (
        <TareaCreateModal
          asignacionDocenteId={asigEffective}
          periodoAcademicoId={materiaRow?.periodo_academico_id ?? ''}
          claseLabel={createLabel}
          claseSelect={
            materias.length > 1 ? (
              <Field label="Clase">
                <select
                  className="field__select"
                  data-testid="tarea-asignacion-select"
                  value={asigEffective}
                  onChange={(e) => setAsigId(e.target.value)}
                >
                  {materias.map((m) => (
                    <option key={m.asignacion_docente_id} value={m.asignacion_docente_id}>
                      {m.curso_nombre} · {m.grado_nombre} sec{m.seccion_nombre}
                    </option>
                  ))}
                </select>
              </Field>
            ) : undefined
          }
          onClose={() => setCreateOpen(false)}
        />
      ) : null}

      {revisarId ? <TareaRevisionModal tareaId={revisarId} onClose={closeRevision} /> : null}

      {verTarea ? <TareaVerModal tarea={verTarea} onClose={() => setVerTarea(null)} /> : null}

      {editTarea ? (
        <TareaCreateModal
          asignacionDocenteId={editTarea.asignacion_docente_id}
          periodoAcademicoId={
            materias.find((m) => m.asignacion_docente_id === editTarea.asignacion_docente_id)
              ?.periodo_academico_id ?? ''
          }
          claseLabel={claseLabel(editTarea)}
          tarea={editTarea}
          onClose={() => setEditTarea(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Eliminar tarea"
        message={`¿Eliminar la tarea "${confirmDelete?.titulo}"?`}
        danger
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Inputs ocultos para el adjunto rápido (siempre montados en la página). */}
      <input
        ref={imagenRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        hidden
        data-testid="tareas-staff-ctx-input-archivo"
        onChange={(e) => {
          aceptarAdjuntoRapido(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={fotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="tareas-staff-ctx-input-foto"
        onChange={(e) => {
          aceptarAdjuntoRapido(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </RequirePermission>
  )
}
