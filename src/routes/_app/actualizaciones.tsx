import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ActualizacionCard } from '#/components/actualizaciones/ActualizacionCard'
import { ActualizacionFormModal } from '#/components/actualizaciones/ActualizacionFormModal'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { SearchInput } from '#/components/ui/SearchInput'
import { ESTADOS_ACTUALIZACION, columnasTablero } from '#/helpers/actualizaciones'
import { userMessageFromError } from '#/lib/api'
import { eliminarActualizacion, listActualizaciones } from '#/services/actualizaciones'
import type { ActualizacionSistema, EstadoActualizacion } from '#/services/actualizaciones'

export const Route = createFileRoute('/_app/actualizaciones')({
  component: ActualizacionesPage,
})

function ActualizacionesPage() {
  const qc = useQueryClient()
  const { can } = useCan()
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['actualizaciones'],
    queryFn: listActualizaciones,
  })

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<EstadoActualizacion | 'todos'>('todos')
  const [editar, setEditar] = useState<{ actualizacion: ActualizacionSistema | null } | null>(null)
  const [eliminar, setEliminar] = useState<ActualizacionSistema | null>(null)

  const columnas = useMemo(() => columnasTablero(data, { busqueda, estado }), [data, busqueda, estado])
  const sinResultados = columnas.every((c) => c.items.length === 0)
  const total = data.length
  const hayFiltro = busqueda.trim() !== '' || estado !== 'todos'

  const puedeCrear = can('actualizaciones:post')
  const puedeEditar = can('actualizaciones:put')
  const puedeEliminar = can('actualizaciones:delete')

  const eliminarMut = useMutation({
    mutationFn: (a: ActualizacionSistema) => eliminarActualizacion(a.id),
    onSuccess: () => {
      toast.success('Actualización eliminada')
      qc.invalidateQueries({ queryKey: ['actualizaciones'] })
      setEliminar(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  return (
    <RequirePermission permission="actualizaciones:get">
      <div className="actualizaciones" data-testid="actualizaciones-page">
        <header className="actualizaciones__toolbar">
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>
              Actualizaciones
            </h1>
            <p className="texto-muted" style={{ margin: 0 }}>
              Lo que estamos construyendo
            </p>
          </div>
          {puedeCrear ? (
            <button
              type="button"
              className="btn btn--primary"
              data-testid="actualizacion-agregar"
              onClick={() => setEditar({ actualizacion: null })}
            >
              Agregar actualización
            </button>
          ) : null}
        </header>

        <div className="actualizaciones__filtros">
          <SearchInput
            data-testid="actualizaciones-buscar"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="actualizaciones__chips">
            <button
              type="button"
              className={`actualizaciones__chip${estado === 'todos' ? ' actualizaciones__chip--activo' : ''}`}
              data-testid="actualizaciones-filtro-todos"
              aria-pressed={estado === 'todos'}
              onClick={() => setEstado('todos')}
            >
              Todos
            </button>
            {ESTADOS_ACTUALIZACION.map((e) => (
              <button
                key={e.value}
                type="button"
                className={`actualizaciones__chip${estado === e.value ? ' actualizaciones__chip--activo' : ''}`}
                data-testid={`actualizaciones-filtro-${e.value}`}
                aria-pressed={estado === e.value}
                onClick={() => setEstado(e.value)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="actualizaciones__tablero" data-testid="actualizaciones-cargando">
            {ESTADOS_ACTUALIZACION.map((e) => (
              <section key={e.value} className="actualizaciones__columna" aria-hidden>
                <header className="actualizaciones__columna-cabecera">
                  <h2 className="actualizaciones__columna-titulo">{e.label}</h2>
                </header>
                <div className="actualizaciones__columna-cards">
                  {[0, 1].map((i) => (
                    <div key={i} className="actualizacion-card actualizacion-card--skeleton" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : isError ? (
          <div className="empty-state" data-testid="actualizaciones-error">
            <p>No se pudieron cargar las actualizaciones.</p>
            <button type="button" className="btn btn--ghost" onClick={() => refetch()}>
              Reintentar
            </button>
          </div>
        ) : total === 0 ? (
          <div className="empty-state" data-testid="actualizaciones-vacio">
            <p>Todavía no hay actualizaciones.</p>
            {puedeCrear ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setEditar({ actualizacion: null })}
              >
                Agregar la primera
              </button>
            ) : null}
          </div>
        ) : sinResultados && busqueda.trim() !== '' ? (
          <div className="empty-state" data-testid="actualizaciones-sin-resultados">
            <p>No hay actualizaciones que coincidan.</p>
            {hayFiltro ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setBusqueda('')
                  setEstado('todos')
                }}
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <div className="actualizaciones__tablero" data-testid="actualizaciones-tablero">
            {columnas.map((columna) => (
              <section
                key={columna.estado}
                className="actualizaciones__columna"
                data-testid={`actualizaciones-columna-${columna.estado}`}
              >
                <header className="actualizaciones__columna-cabecera">
                  <h2 className="actualizaciones__columna-titulo">{columna.label}</h2>
                  <span
                    className="badge"
                    data-testid={`actualizaciones-contador-${columna.estado}`}
                  >
                    {columna.items.length}
                  </span>
                </header>
                <div className="actualizaciones__columna-cards">
                  {columna.items.length === 0 ? (
                    <p className="actualizaciones__columna-vacia">Sin actualizaciones</p>
                  ) : (
                    columna.items.map((a) => (
                      <ActualizacionCard
                        key={a.id}
                        actualizacion={a}
                        puedeEditar={puedeEditar}
                        puedeEliminar={puedeEliminar}
                        onEditar={(item) => setEditar({ actualizacion: item })}
                        onEliminar={(item) => setEliminar(item)}
                      />
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {editar ? (
        <ActualizacionFormModal
          key={editar.actualizacion?.id ?? 'nueva'}
          actualizacion={editar.actualizacion}
          onClose={() => setEditar(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(eliminar)}
        title="Eliminar actualización"
        message={`¿Eliminar «${eliminar?.titulo ?? ''}»? Dejará de verse en el roadmap.`}
        confirmLabel="Eliminar"
        danger
        confirmDisabled={eliminarMut.isPending}
        testId="actualizacion-confirmar-eliminar"
        onConfirm={() => eliminar && eliminarMut.mutate(eliminar)}
        onCancel={() => setEliminar(null)}
      />
    </RequirePermission>
  )
}
