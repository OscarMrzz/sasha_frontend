import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { PersonaEditModal } from '#/components/personas/PersonaEditModal'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { UserFichaModal } from '#/components/usuarios/UserFichaModal'
import { userMessageFromError } from '#/lib/api'
import { listMaestrosConsejeria  } from '#/services/consejeria'
import type {MaestroConsejeria} from '#/services/consejeria';
import { darDeBajaPersona, restaurarPersona } from '#/services/personas'
import { esBaja, puedeVerInactivos } from '#/helpers/visibilidad'

export const Route = createFileRoute('/_app/consejeria/maestros')({ component: MaestrosConsejeriaPage })

const col = createColumnHelper<MaestroConsejeria>()

function MaestrosConsejeriaPage() {
  const qc = useQueryClient()
  const { roles } = useCan()
  const verInactivos = puedeVerInactivos(roles)
  const { data = [], isLoading } = useQuery({
    queryKey: ['consejeria-maestros', verInactivos],
    queryFn: () => listMaestrosConsejeria({ incluirInactivos: verInactivos }),
  })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: MaestroConsejeria } | null>(null)
  const [ver, setVer] = useState<string | null>(null)
  const [editar, setEditar] = useState<string | null>(null)
  const [confirmBaja, setConfirmBaja] = useState<MaestroConsejeria | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<MaestroConsejeria | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['consejeria-maestros'] })
    qc.invalidateQueries({ queryKey: ['maestros'] })
    qc.invalidateQueries({ queryKey: ['users'] })
  }

  const bajaMut = useMutation({
    mutationFn: (code: string) => darDeBajaPersona(code),
    onSuccess: () => {
      toast.success('Maestro dado de baja')
      setConfirmBaja(null)
      invalidar()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const restoreMut = useMutation({
    mutationFn: (code: string) => restaurarPersona(code),
    onSuccess: () => {
      toast.success('Maestro restaurado')
      setConfirmRestore(null)
      invalidar()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor((r) => `${r.nombre} ${r.codigo}`, {
        id: 'nombre',
        header: 'Maestro',
        cell: (i) => (
          <>
            {i.row.original.nombre}
            <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
              {i.row.original.codigo}
            </span>
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
      col.accessor('telefono', { header: 'Teléfono', cell: (i) => i.getValue() || '—' }),
      col.accessor((r) => r.cursos.join(', '), {
        id: 'cursos',
        header: 'Clases',
        enableSorting: false,
        cell: (i) =>
          i.row.original.cursos.length ? i.getValue() : <span className="texto-muted">Sin clases</span>,
      }),
      col.accessor((r) => r.grados.join(', '), {
        id: 'grados',
        header: 'Grados y secciones',
        enableSorting: false,
        cell: (i) => i.getValue() || '—',
      }),
      col.accessor('clases', { header: 'Clases' }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      {
        id: 'curso',
        label: 'Clase',
        getValue: (r: MaestroConsejeria) => r.cursos.join('|'),
        getOptionValues: (r: MaestroConsejeria) => r.cursos,
        matches: (r: MaestroConsejeria, v: string) => r.cursos.includes(v),
      },
      {
        id: 'grado',
        label: 'Grado y sección',
        getValue: (r: MaestroConsejeria) => r.grados.join('|'),
        getOptionValues: (r: MaestroConsejeria) => r.grados,
        matches: (r: MaestroConsejeria, v: string) => r.grados.includes(v),
      },
      {
        id: 'con_clases',
        label: 'Clases',
        getValue: (r: MaestroConsejeria) => (r.clases > 0 ? 'Con clases' : 'Sin clases'),
      },
    ],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando maestros…</div>

  return (
    <RequirePermission permission="expediente:get">
      <div data-testid="consejeria-maestros-page">
        <DataTable
          title="Maestros"
          data={data}
          columns={columns}
          filters={filters}
          canAdd={false}
          exportFilename="maestros-consejeria"
          exportRows={data.map((m) => ({
            codigo: m.codigo,
            maestro: m.nombre,
            telefono: m.telefono,
            clases: m.clases,
            cursos: m.cursos.join('; '),
            grados: m.grados.join('; '),
            estado_persona: esBaja(m) ? 'Dado de baja' : 'Activo',
          }))}
          rowClassName={(m) => (esBaja(m) ? 'fila-baja' : undefined)}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          onRowDoubleClick={(row) => setVer(row.codigo)}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="consejeria-maestros-ctx">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="consejeria-maestros-ctx-ver"
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

      {ver ? <UserFichaModal code={ver} onClose={() => setVer(null)} /> : null}

      {editar ? (
        <PersonaEditModal
          code={editar}
          onClose={() => setEditar(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['consejeria-maestros'] })
            qc.invalidateQueries({ queryKey: ['persona-ficha', editar] })
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmBaja)}
        title="Dar de baja"
        message={`¿Dar de baja al maestro ${confirmBaja?.codigo} (${confirmBaja?.nombre})? Se ocultará de los listados y se conservará todo su historial. Podrás restaurarlo cuando quieras.`}
        danger
        confirmLabel="Dar de baja"
        onConfirm={() => confirmBaja && bajaMut.mutate(confirmBaja.codigo)}
        onCancel={() => setConfirmBaja(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmRestore)}
        title="Restaurar maestro"
        message={`¿Restaurar al maestro ${confirmRestore?.codigo} (${confirmRestore?.nombre})? Volverá a aparecer en los listados y en los comboboxes.`}
        confirmLabel="Restaurar"
        onConfirm={() => confirmRestore && restoreMut.mutate(confirmRestore.codigo)}
        onCancel={() => setConfirmRestore(null)}
      />
    </RequirePermission>
  )
}
