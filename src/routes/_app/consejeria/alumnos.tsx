import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ExpedienteAlumnoModal } from '#/components/consejeria/ExpedienteAlumnoModal'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { PersonaEditModal } from '#/components/personas/PersonaEditModal'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { userMessageFromError } from '#/lib/api'
import { listAlumnosConsejeria  } from '#/services/consejeria'
import type {AlumnoConsejeria} from '#/services/consejeria';
import { darDeBajaPersona, restaurarPersona } from '#/services/personas'
import { esBaja, puedeVerInactivos } from '#/helpers/visibilidad'

export const Route = createFileRoute('/_app/consejeria/alumnos')({ component: AlumnosConsejeriaPage })

const col = createColumnHelper<AlumnoConsejeria>()

function Subtexto({ children }: { children: React.ReactNode }) {
  return (
    <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
      {children}
    </span>
  )
}

const ESTADO_MATRICULA: Record<string, string> = {
  ACTIVE: 'Matriculado',
  INACTIVE: 'Inactiva',
  '': 'Sin matrícula',
}

const estadoMatricula = (r: AlumnoConsejeria) => ESTADO_MATRICULA[r.estado_matricula] ?? r.estado_matricula

function AlumnosConsejeriaPage() {
  const qc = useQueryClient()
  const { roles } = useCan()
  const verInactivos = puedeVerInactivos(roles)
  const { data = [], isLoading } = useQuery({
    queryKey: ['consejeria-alumnos', verInactivos],
    queryFn: () => listAlumnosConsejeria({ incluirInactivos: verInactivos }),
  })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: AlumnoConsejeria } | null>(null)
  const [ver, setVer] = useState<string | null>(null)
  const [editar, setEditar] = useState<string | null>(null)
  const [confirmBaja, setConfirmBaja] = useState<AlumnoConsejeria | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<AlumnoConsejeria | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['consejeria-alumnos'] })
    qc.invalidateQueries({ queryKey: ['alumnos'] })
    qc.invalidateQueries({ queryKey: ['matriculas'] })
    qc.invalidateQueries({ queryKey: ['users'] })
  }

  const bajaMut = useMutation({
    mutationFn: (code: string) => darDeBajaPersona(code),
    onSuccess: () => {
      toast.success('Alumno dado de baja')
      setConfirmBaja(null)
      invalidar()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const restoreMut = useMutation({
    mutationFn: (code: string) => restaurarPersona(code),
    onSuccess: () => {
      toast.success('Alumno restaurado')
      setConfirmRestore(null)
      invalidar()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor((r) => `${r.nombre} ${r.codigo}`, {
        id: 'nombre',
        header: 'Alumno',
        cell: (i) => (
          <>
            {i.row.original.nombre}
            <Subtexto>{i.row.original.codigo}</Subtexto>
          </>
        ),
      }),
      col.display({
        id: 'estado_persona',
        header: 'Estado',
        cell: (i) =>
          esBaja(i.row.original) ? (
            <span className="badge badge--baja">Dado de baja</span>
          ) : (
            <span className="badge badge--ok">Activo</span>
          ),
      }),
      col.accessor((r) => `${r.grado} ${r.seccion}`, {
        id: 'grado',
        header: 'Grado',
        cell: (i) =>
          i.row.original.grado ? (
            <>
              {i.row.original.grado} · sec {i.row.original.seccion}
              <Subtexto>{i.row.original.modalidad}</Subtexto>
            </>
          ) : (
            <span className="texto-muted">—</span>
          ),
      }),
      col.accessor('responsable_nombre', {
        header: 'Responsable',
        cell: (i) =>
          i.getValue() ? (
            <>
              {i.getValue()}
              <Subtexto>
                {[i.row.original.parentesco, i.row.original.responsable_telefono].filter(Boolean).join(' · ')}
              </Subtexto>
            </>
          ) : (
            <span className="texto-muted">Sin responsable</span>
          ),
      }),
      col.accessor((r) => estadoMatricula(r), {
        id: 'estado_matricula',
        header: 'Matrícula',
        cell: (i) => (
          <>
            <span className="badge">{i.getValue()}</span>
            {i.row.original.periodo ? <Subtexto>{i.row.original.periodo}</Subtexto> : null}
          </>
        ),
      }),
    ],
    [],
  )

  const grados = useMemo(
    () =>
      [...new Map(data.filter((a) => a.grado).map((a) => [a.grado, a.grado_orden])).entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([g]) => ({ value: g, label: g })),
    [data],
  )

  const filters = useMemo(
    () => [
      { id: 'grado', label: 'Grado', getValue: (r: AlumnoConsejeria) => r.grado, options: grados },
      { id: 'seccion', label: 'Sección', getValue: (r: AlumnoConsejeria) => r.seccion },
      { id: 'modalidad', label: 'Modalidad', getValue: (r: AlumnoConsejeria) => r.modalidad },
      { id: 'estado_matricula', label: 'Matrícula', getValue: estadoMatricula },
    ],
    [grados],
  )

  if (isLoading) return <div className="empty-state">Cargando alumnos…</div>

  return (
    <RequirePermission permission="expediente:get">
      <div data-testid="consejeria-alumnos-page">
        <DataTable
          title="Alumnos"
          data={data}
          columns={columns}
          filters={filters}
          canAdd={false}
          exportFilename="alumnos-consejeria"
          exportRows={data.map((a) => ({
            codigo: a.codigo,
            alumno: a.nombre,
            grado: a.grado,
            seccion: a.seccion,
            modalidad: a.modalidad,
            periodo: a.periodo,
            matricula: estadoMatricula(a),
            responsable: a.responsable_nombre,
            parentesco: a.parentesco,
            telefono: a.responsable_telefono,
            estado_persona: esBaja(a) ? 'Dado de baja' : 'Activo',
          }))}
          rowClassName={(a) => (esBaja(a) ? 'fila-baja' : undefined)}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          onRowDoubleClick={(row) => setVer(row.codigo)}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="consejeria-alumnos-ctx">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="consejeria-alumnos-ctx-ver"
            onClick={() => {
              setVer(ctx.row.codigo)
              closeCtx()
            }}
          >
            Ver
          </button>
          {esBaja(ctx.row) ? (
            <Can permission="personas:put">
              <button
                type="button"
                className="ctx-menu__item"
                data-testid="ctx-restaurar"
                onClick={() => {
                  setConfirmRestore(ctx.row)
                  closeCtx()
                }}
              >
                Restaurar
              </button>
            </Can>
          ) : (
            <>
              <Can permission="personas:put">
                <button
                  type="button"
                  className="ctx-menu__item"
                  data-testid="ctx-editar"
                  onClick={() => {
                    setEditar(ctx.row.codigo)
                    closeCtx()
                  }}
                >
                  Editar
                </button>
              </Can>
              <Can permission="personas:put">
                <button
                  type="button"
                  className="ctx-menu__item ctx-menu__item--danger"
                  data-testid="ctx-dar-de-baja"
                  onClick={() => {
                    setConfirmBaja(ctx.row)
                    closeCtx()
                  }}
                >
                  Dar de baja
                </button>
              </Can>
            </>
          )}
        </div>
      ) : null}

      {ver ? <ExpedienteAlumnoModal code={ver} onClose={() => setVer(null)} /> : null}

      {editar ? (
        <PersonaEditModal
          code={editar}
          onClose={() => setEditar(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['consejeria-alumnos'] })
            qc.invalidateQueries({ queryKey: ['persona-ficha', editar] })
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmBaja)}
        title="Dar de baja"
        message={`¿Dar de baja al alumno ${confirmBaja?.codigo} (${confirmBaja?.nombre})? Se ocultará de los listados y se conservará todo su historial. Podrás restaurarlo cuando quieras.`}
        danger
        confirmLabel="Dar de baja"
        onConfirm={() => confirmBaja && bajaMut.mutate(confirmBaja.codigo)}
        onCancel={() => setConfirmBaja(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmRestore)}
        title="Restaurar alumno"
        message={`¿Restaurar al alumno ${confirmRestore?.codigo} (${confirmRestore?.nombre})? Volverá a aparecer en los listados.`}
        confirmLabel="Restaurar"
        onConfirm={() => confirmRestore && restoreMut.mutate(confirmRestore.codigo)}
        onCancel={() => setConfirmRestore(null)}
      />
    </RequirePermission>
  )
}
