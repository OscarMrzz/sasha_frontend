import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ExamenAlumnoCard } from '#/components/examenes/ExamenAlumnoCard'
import { useCan } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { userMessageFromError } from '#/lib/api'
import { guardarAutorizacionMora } from '#/services/examenes'
import type {
  ExamenAhora,
  ExamenAlumnoPagoPendiente,
} from '#/services/examenes'

export function ExamenAlumnosPendientes({ examen }: { examen: ExamenAhora }) {
  const { roles, can } = useCan()
  const admin = roles.includes('admin')
  const puedeAutorizar = admin && can('examenes:put')
  const qc = useQueryClient()
  const [seleccion, setSeleccion] = useState<ExamenAlumnoPagoPendiente | null>(
    null,
  )
  const guardar = useMutation({
    mutationFn: (alumno: ExamenAlumnoPagoPendiente) =>
      guardarAutorizacionMora(
        examen.examen_asignacion_id,
        alumno.alumno_id,
        !alumno.autorizado_examen,
      ),
    onSuccess: () => {
      setSeleccion(null)
      toast.success('Permiso de examen actualizado')
      void qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'examenes' && q.queryKey.includes('ahora'),
      })
    },
    onError: (error) => {
      setSeleccion(null)
      toast.error(userMessageFromError(error))
      void qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'examenes' && q.queryKey.includes('ahora'),
      })
    },
  })
  const autorizados = examen.alumnos_pagos_pendientes.filter(
    (a) => a.autorizado_examen,
  )
  const pendientes = admin
    ? examen.alumnos_pagos_pendientes
    : examen.alumnos_pagos_pendientes.filter((a) => !a.autorizado_examen)
  const tarjetas = (alumnos: ExamenAlumnoPagoPendiente[]) => (
    <div className="examen-ahora__alumno-grid">
      {alumnos.map((alumno) => (
        <div key={alumno.alumno_id} className="examen-alumno-autorizacion">
          {puedeAutorizar ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              data-testid={`examen-autorizar-${examen.examen_asignacion_id}-${alumno.codigo}`}
              disabled={guardar.isPending}
              onClick={() => setSeleccion(alumno)}
            >
              {alumno.autorizado_examen
                ? 'Deshabilitar rápido'
                : 'Habilitar rápido'}
            </button>
          ) : null}
          {alumno.autorizado_examen ? (
            <span className="badge badge--warn">
              Permiso especial para este examen
            </span>
          ) : null}
          <ExamenAlumnoCard alumno={alumno} />
        </div>
      ))}
    </div>
  )
  return (
    <>
      <section className="examen-ahora__alumnos">
        <h3 className="examen-ahora__alumnos-title">
          Alumnos con pagos pendientes
        </h3>
        {examen.es_final ? (
          <p className="texto-muted">
            Examen final: se listan todos los pagos bloqueantes del periodo,
            aunque aún no venzan.
          </p>
        ) : null}
        {pendientes.length ? (
          tarjetas(pendientes)
        ) : (
          <p className="texto-muted examen-ahora__sin-pagos">
            {autorizados.length
              ? 'Todos los alumnos con pagos pendientes tienen permiso especial.'
              : 'Sin pagos pendientes.'}
          </p>
        )}
      </section>
      {!admin && autorizados.length ? (
        <section
          className="examen-ahora__alumnos"
          data-testid={`examen-autorizados-${examen.examen_asignacion_id}`}
        >
          <h3 className="examen-ahora__alumnos-title">
            Alumnos con mora autorizados a hacer examen
          </h3>
          {tarjetas(autorizados)}
        </section>
      ) : null}
      <ConfirmDialog
        open={seleccion !== null}
        title={
          seleccion?.autorizado_examen
            ? 'Retirar permiso de examen'
            : 'Habilitar examen'
        }
        message={
          seleccion?.autorizado_examen
            ? `¿Retirar el permiso especial de ${seleccion.nombre} para hacer este examen? El alumno seguirá en mora.`
            : `${seleccion?.nombre ?? 'Este alumno'} seguirá en mora, pero tendrá permiso especial para hacer este examen. ¿Estás seguro?`
        }
        confirmLabel={
          seleccion?.autorizado_examen
            ? 'Deshabilitar rápido'
            : 'Habilitar rápido'
        }
        confirmDisabled={guardar.isPending}
        onCancel={() => {
          if (!guardar.isPending) setSeleccion(null)
        }}
        onConfirm={() => {
          if (seleccion) guardar.mutate(seleccion)
        }}
        testId="examen-autorizacion-confirmar"
      />
    </>
  )
}
