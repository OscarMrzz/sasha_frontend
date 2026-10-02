import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExpedienteAlumnoModal } from '#/components/consejeria/ExpedienteAlumnoModal'
import { RequirePermission } from '#/components/gates/Can'
import { DataTable } from '#/components/ui/DataTable'
import { listAlumnosConsejeria  } from '#/services/consejeria'
import type {AlumnoConsejeria} from '#/services/consejeria';

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
  const { data = [], isLoading } = useQuery({ queryKey: ['consejeria-alumnos'], queryFn: listAlumnosConsejeria })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: AlumnoConsejeria } | null>(null)
  const [ver, setVer] = useState<string | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

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
          }))}
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
        </div>
      ) : null}

      {ver ? <ExpedienteAlumnoModal code={ver} onClose={() => setVer(null)} /> : null}
    </RequirePermission>
  )
}
