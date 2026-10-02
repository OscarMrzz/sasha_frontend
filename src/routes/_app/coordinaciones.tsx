import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CoordinacionWizard } from '#/components/coordinaciones/CoordinacionWizard'
import { Can, RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { listCoordinaciones, reglaLabel, updateCoordinacion } from '#/services/coordinaciones'
import type { Coordinacion } from '#/services/coordinaciones'

export const Route = createFileRoute('/_app/coordinaciones')({ component: CoordinacionesPage })

const col = createColumnHelper<Coordinacion>()
const estadoLabel = (s: string) => (s === 'ACTIVE' ? 'Activa' : 'Inactiva')
const usuariosLabel = (c: Coordinacion) => c.usuarios.map((u) => u.nombre || u.codigo).join(', ')

function CoordinacionesPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading } = useQuery({ queryKey: ['coordinaciones'], queryFn: listCoordinaciones })
  const [ctx, setCtx] = useState<{ x: number; y: number; row: Coordinacion } | null>(null)
  const [editar, setEditar] = useState<{ coordinacion: Coordinacion | null } | null>(null)
  const [ver, setVer] = useState<Coordinacion | null>(null)
  const [toggle, setToggle] = useState<Coordinacion | null>(null)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    window.addEventListener('click', closeCtx)
    return () => window.removeEventListener('click', closeCtx)
  }, [ctx, closeCtx])

  const toggleMut = useMutation({
    mutationFn: (c: Coordinacion) =>
      updateCoordinacion(c.id, {
        titulo: c.titulo,
        descripcion: c.descripcion,
        status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        reglas: c.reglas,
      }),
    onSuccess: (c) => {
      toast.success(c.status === 'ACTIVE' ? 'Coordinación activada' : 'Coordinación desactivada')
      qc.invalidateQueries({ queryKey: ['coordinaciones'] })
      setToggle(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const columns = useMemo(
    () => [
      col.accessor('titulo', {
        header: 'Coordinación',
        cell: (i) => (
          <>
            {i.getValue()}
            {i.row.original.descripcion ? (
              <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
                {i.row.original.descripcion}
              </span>
            ) : null}
          </>
        ),
      }),
      col.accessor((r) => r.reglas.map(reglaLabel).join(' | '), {
        id: 'alcance',
        header: 'Alcance',
        cell: (i) => (
          <ul className="perfil-etiquetas">
            {i.row.original.reglas.map((r) => (
              <li key={reglaLabel(r)} className="perfil-etiqueta">
                {reglaLabel(r)}
              </li>
            ))}
          </ul>
        ),
      }),
      col.accessor('clases', { header: 'Clases' }),
      col.accessor('secciones', { header: 'Secciones' }),
      col.accessor(usuariosLabel, {
        id: 'usuarios',
        header: 'Coordinadores',
        cell: (i) => i.getValue() || <span className="texto-muted">Sin asignar</span>,
      }),
      col.accessor((r) => estadoLabel(r.status), {
        id: 'status',
        header: 'Estado',
        cell: (i) => <span className="badge">{i.getValue()}</span>,
      }),
    ],
    [],
  )

  const filters = useMemo(
    () => [{ id: 'status', label: 'Estado', getValue: (r: Coordinacion) => estadoLabel(r.status) }],
    [],
  )

  if (isLoading) return <div className="empty-state">Cargando coordinaciones…</div>

  return (
    <RequirePermission permission="coordinaciones:get">
      <div data-testid="coordinaciones-page">
        <DataTable
          title="Coordinaciones"
          data={data}
          columns={columns}
          filters={filters}
          addLabel="Agregar"
          canAdd={can('coordinaciones:post')}
          onAdd={() => setEditar({ coordinacion: null })}
          exportFilename="coordinaciones"
          exportRows={data.map((c) => ({
            titulo: c.titulo,
            descripcion: c.descripcion,
            alcance: c.reglas.map(reglaLabel).join(' | '),
            clases: c.clases,
            secciones: c.secciones,
            coordinadores: usuariosLabel(c),
            estado: estadoLabel(c.status),
          }))}
          onRowContextMenu={(row, e) => setCtx({ x: e.clientX, y: e.clientY, row })}
          onRowDoubleClick={(row) => setVer(row)}
        />
      </div>

      {ctx ? (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} data-testid="coordinaciones-ctx">
          <button
            type="button"
            className="ctx-menu__item"
            data-testid="coordinaciones-ctx-ver"
            onClick={() => {
              setVer(ctx.row)
              closeCtx()
            }}
          >
            Ver
          </button>
          <Can permission="coordinaciones:put">
            <button
              type="button"
              className="ctx-menu__item"
              data-testid="coordinaciones-ctx-editar"
              onClick={() => {
                setEditar({ coordinacion: ctx.row })
                closeCtx()
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className={`ctx-menu__item${ctx.row.status === 'ACTIVE' ? ' ctx-menu__item--danger' : ''}`}
              data-testid="coordinaciones-ctx-toggle"
              onClick={() => {
                setToggle(ctx.row)
                closeCtx()
              }}
            >
              {ctx.row.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
            </button>
          </Can>
        </div>
      ) : null}

      {editar ? <CoordinacionWizard coordinacion={editar.coordinacion} onClose={() => setEditar(null)} /> : null}
      {ver ? <VerCoordinacion coordinacion={ver} onClose={() => setVer(null)} /> : null}

      <ConfirmDialog
        open={Boolean(toggle)}
        title={toggle?.status === 'ACTIVE' ? 'Desactivar coordinación' : 'Activar coordinación'}
        message={
          toggle?.status === 'ACTIVE'
            ? `Los coordinadores de «${toggle.titulo}» dejarán de ver sus clases mientras esté inactiva.`
            : `Los coordinadores de «${toggle?.titulo ?? ''}» volverán a ver sus clases.`
        }
        danger={toggle?.status === 'ACTIVE'}
        confirmLabel={toggle?.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
        onConfirm={() => toggle && toggleMut.mutate(toggle)}
        onCancel={() => setToggle(null)}
      />
    </RequirePermission>
  )
}

function VerCoordinacion({ coordinacion: c, onClose }: { coordinacion: Coordinacion; onClose: () => void }) {
  const { open, dismiss } = useDismiss(onClose)
  return (
    <Modal open={open} wide title={c.titulo} onClose={dismiss}>
      <div className="expediente" data-testid="coord-ver">
        {c.descripcion ? <p style={{ marginTop: 0 }}>{c.descripcion}</p> : null}
        <section className="expediente__seccion">
          <h3 className="expediente__titulo">
            Alcance · {c.clases} {c.clases === 1 ? 'clase' : 'clases'} en {c.secciones}{' '}
            {c.secciones === 1 ? 'sección' : 'secciones'}
          </h3>
          <ul className="perfil-etiquetas">
            {c.reglas.map((r) => (
              <li key={reglaLabel(r)} className="perfil-etiqueta">
                {reglaLabel(r)}
              </li>
            ))}
          </ul>
        </section>
        <section className="expediente__seccion">
          <h3 className="expediente__titulo">Coordinadores</h3>
          {c.usuarios.length === 0 ? (
            <p className="texto-muted" style={{ margin: 0 }}>
              Nadie la coordina todavía. Asígnala desde Usuarios.
            </p>
          ) : (
            <ul className="perfil-etiquetas">
              {c.usuarios.map((u) => (
                <li key={u.codigo} className="perfil-etiqueta">
                  {u.nombre || u.codigo} · {u.codigo}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  )
}
