import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'
import { PermisoWizard } from '#/components/permisos/PermisoWizard'
import {
  claseEstadoPermiso,
  etiquetaEstadoPermiso,
  etiquetaFalta,
  etiquetaTipoSolicitud,
  formatearFechaPermiso,
  rangoPermiso,
} from '#/helpers/permisos'
import { userMessageFromError } from '#/lib/api'
import { cancelarPermiso, listFaltasHijo, listPermisosHijo } from '#/services/permisos'
import type { FaltaPermiso } from '#/services/permisos'

export const Route = createFileRoute('/_app/hijo/permisos')({
  component: () => (
    <PadreScreen title="Permisos" testId="padre-permisos">
      {(alumnoId) => <PermisosHijo alumnoId={alumnoId} />}
    </PadreScreen>
  ),
})

function PermisosHijo({ alumnoId }: { alumnoId: string }) {
  const qc = useQueryClient()
  const [wizard, setWizard] = useState<{ inicio: string; fin: string } | null | 'nuevo'>(null)

  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['permisos-hijo', alumnoId],
    queryFn: () => listPermisosHijo(alumnoId),
  })
  const { data: faltas = [] } = useQuery({
    queryKey: ['permisos-faltas', alumnoId],
    queryFn: () => listFaltasHijo(alumnoId),
  })

  const cancelar = useMutation({
    mutationFn: (id: string) => cancelarPermiso(id),
    onSuccess: () => {
      toast.success('Solicitud cancelada')
      qc.invalidateQueries({ queryKey: ['permisos-hijo', alumnoId] })
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const prefill =
    wizard && wizard !== 'nuevo' ? { fecha_inicio: wizard.inicio, fecha_fin: wizard.fin } : null

  return (
    <div className="permisos-padre">
      <div className="permisos-padre__acciones">
        <div>
          <p className="texto-muted" style={{ margin: 0 }}>
            Avisa si tu hijo faltará o justifica una falta.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          data-testid="permiso-solicitar"
          onClick={() => setWizard('nuevo')}
        >
          Solicitar permiso
        </button>
      </div>

      <details className="permisos-padre__faltas" data-testid="permisos-faltas">
        <summary>
          Faltas y tardanzas registradas
          {faltas.length > 0 ? <span className="badge">{faltas.length}</span> : null}
        </summary>
        {faltas.length === 0 ? (
          <p className="texto-muted">No hay faltas pendientes de justificar.</p>
        ) : (
          <ul className="permisos-padre__lista">
            {faltas.map((f) => (
              <FaltaFila
                key={`${f.fecha}-${f.tipo}`}
                falta={f}
                onJustificar={() => setWizard({ inicio: f.fecha, fin: f.fecha })}
              />
            ))}
          </ul>
        )}
      </details>

      <section className="permisos-padre__solicitudes">
        <h2 className="actualizaciones__columna-titulo">Mis solicitudes</h2>
        {isLoading ? (
          <p className="texto-muted">Cargando…</p>
        ) : solicitudes.length === 0 ? (
          <div className="empty-state" data-testid="permisos-vacio">
            Todavía no has enviado solicitudes.
          </div>
        ) : (
          <ul className="permisos-padre__lista">
            {solicitudes.map((s) => (
              <li key={s.id} className="permiso-fila" data-testid={`permiso-fila-${s.id}`}>
                <div className="permiso-fila__cuerpo">
                  <div className="permiso-fila__titulo">
                    {rangoPermiso(s.fecha_inicio, s.fecha_fin)}
                    <span className={`estado-pill ${claseEstadoPermiso(s.estado)}`}>
                      {etiquetaEstadoPermiso(s.estado)}
                    </span>
                  </div>
                  <div className="texto-muted">
                    {etiquetaTipoSolicitud(s.tipo_solicitud)} ·{' '}
                    {s.tipos.map((t) => t.nombre).join(', ')}
                  </div>
                  <div>{s.detalle}</div>
                  {s.motivo_rechazo ? (
                    <div className="permiso-fila__motivo">Motivo: {s.motivo_rechazo}</div>
                  ) : null}
                </div>
                {s.estado === 'pendiente' ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    data-testid={`permiso-cancelar-${s.id}`}
                    disabled={cancelar.isPending}
                    onClick={() => cancelar.mutate(s.id)}
                  >
                    Cancelar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {wizard ? (
        <PermisoWizard
          alumnoId={alumnoId}
          prefill={prefill}
          onClose={() => setWizard(null)}
        />
      ) : null}
    </div>
  )
}

function FaltaFila({ falta, onJustificar }: { falta: FaltaPermiso; onJustificar: () => void }) {
  return (
    <li className="permiso-fila" data-testid={`falta-${falta.fecha}-${falta.tipo}`}>
      <div className="permiso-fila__cuerpo">
        <div className="permiso-fila__titulo">{formatearFechaPermiso(falta.fecha)}</div>
        <div className="texto-muted">
          {etiquetaFalta(falta.tipo)} en {falta.clases} clase{falta.clases === 1 ? '' : 's'}
        </div>
      </div>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onJustificar}>
        Justificar
      </button>
    </li>
  )
}
