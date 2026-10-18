import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { HorarioDiasView } from '#/components/horarios/HorarioDiasView'
import type { BloqueDia } from '#/components/horarios/HorarioDiasView'
import { PadreScreen } from '#/components/portal/padre/PadreScreen'
import { usePortalInicio } from '#/hooks/use-portal'

export const Route = createFileRoute('/_app/hijo/horario')({
  component: () => (
    <PadreScreen title="Horario" testId="padre-horario">
      {() => <HorarioHijo />}
    </PadreScreen>
  ),
})

function HorarioHijo() {
  const { data, isLoading, isError } = usePortalInicio()

  const bloques = useMemo<BloqueDia[]>(
    () =>
      (data?.horario_semana ?? []).map((s) => ({
        key: `${s.asignacion_docente_id}-${s.dia_semana}-${s.hora_inicio}`,
        dia: s.dia_semana,
        inicio: s.hora_inicio,
        fin: s.hora_fin,
        titulo: s.curso_nombre,
        sub: s.maestro_nombre,
      })),
    [data],
  )

  const recreo = data?.recreo
    ? { inicio: data.recreo.hora_inicio, fin: data.recreo.hora_fin }
    : null

  if (isLoading) return <div className="empty-state">Cargando horario…</div>
  if (isError || !data) {
    return <div className="empty-state">Hay problemas de conexión. Intente de nuevo.</div>
  }

  return (
    <HorarioDiasView
      bloques={bloques}
      recreo={recreo}
      testIdPrefix="padre-horario"
      emptyText="No hay clases este día."
    />
  )
}
