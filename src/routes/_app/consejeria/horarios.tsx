import { createFileRoute } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'
import { RequirePermission, useCan } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { SIN_HORARIOS_CONSEJERIA } from '#/helpers/nav'
import { DIAS_SEMANA, listHorariosConsejeria  } from '#/services/consejeria'
import type {SlotHorario} from '#/services/consejeria';

export const Route = createFileRoute('/_app/consejeria/horarios')({ component: HorariosConsejeriaPage })

const col = createColumnHelper<SlotHorario>()

const gradoSeccion = (s: SlotHorario) => `${s.grado} sec ${s.seccion}`

function opcionesOrdenadas(data: SlotHorario[], label: (s: SlotHorario) => string, orden: (s: SlotHorario) => number) {
  return [...new Map(data.map((s) => [label(s), orden(s)])).entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], 'es'))
    .map(([v]) => ({ value: v, label: v }))
}

function HorariosConsejeriaPage() {
  const { roles } = useCan()
  if (roles.some((r) => (SIN_HORARIOS_CONSEJERIA as string[]).includes(r))) {
    return (
      <div className="empty-state" role="alert">
        No tienes permiso para ver esta página.
      </div>
    )
  }
  return <HorariosConsejeria />
}

function HorariosConsejeria() {
  const [periodoId, setPeriodoId] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['consejeria-horarios', periodoId],
    queryFn: () => listHorariosConsejeria(periodoId || undefined),
    placeholderData: keepPreviousData,
  })
  const slots = data?.slots ?? []

  const columns = useMemo(
    () => [
      col.accessor((s) => `${s.dia_semana} ${DIAS_SEMANA[s.dia_semana] ?? ''}`, {
        id: 'dia',
        header: 'Día',
        cell: (i) => DIAS_SEMANA[i.row.original.dia_semana] ?? i.row.original.dia_semana,
      }),
      col.accessor((s) => `${s.hora_inicio}–${s.hora_fin}`, { id: 'hora', header: 'Hora' }),
      col.accessor('curso', { header: 'Curso' }),
      col.accessor((s) => `${s.maestro} ${s.maestro_codigo}`, {
        id: 'maestro',
        header: 'Maestro',
        cell: (i) => (
          <>
            {i.row.original.maestro}
            <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
              {i.row.original.maestro_codigo}
            </span>
          </>
        ),
      }),
      col.accessor((s) => `${String(s.grado_orden).padStart(3, '0')} ${gradoSeccion(s)}`, {
        id: 'seccion',
        header: 'Grado y sección',
        cell: (i) => gradoSeccion(i.row.original),
      }),
      col.accessor('modalidad', { header: 'Modalidad' }),
    ],
    [],
  )

  const filters = useMemo(
    () => [
      { id: 'modalidad', label: 'Modalidad', getValue: (s: SlotHorario) => s.modalidad },
      {
        id: 'grado',
        label: 'Grado',
        getValue: (s: SlotHorario) => s.grado,
        options: opcionesOrdenadas(slots, (s) => s.grado, (s) => s.grado_orden),
      },
      {
        id: 'seccion',
        label: 'Sección',
        getValue: gradoSeccion,
        options: opcionesOrdenadas(slots, gradoSeccion, (s) => s.grado_orden),
      },
      { id: 'curso', label: 'Curso', getValue: (s: SlotHorario) => s.curso },
      { id: 'maestro', label: 'Maestro', getValue: (s: SlotHorario) => s.maestro },
      {
        id: 'dia',
        label: 'Día',
        getValue: (s: SlotHorario) => DIAS_SEMANA[s.dia_semana] ?? '',
        options: opcionesOrdenadas(slots, (s) => DIAS_SEMANA[s.dia_semana] ?? '', (s) => s.dia_semana),
      },
    ],
    [slots],
  )

  const periodoActual = periodoId || data?.periodo_id || ''

  return (
    <RequirePermission permission="expediente:get">
      <div data-testid="consejeria-horarios-page">
        <div style={{ marginBottom: '0.75rem', maxWidth: 420 }}>
          <Field label="Periodo">
            <Combobox
              data-testid="consejeria-horarios-periodo"
              value={periodoActual}
              onChange={setPeriodoId}
              options={(data?.periodos ?? []).map((p) => ({
                value: p.id,
                label: p.activo ? `${p.nombre} (activo)` : p.nombre,
              }))}
              placeholder="Buscar periodo…"
            />
          </Field>
        </div>

        {isLoading ? (
          <div className="empty-state">Cargando horarios…</div>
        ) : (
          <DataTable
            title="Horarios"
            data={slots}
            columns={columns}
            filters={filters}
            canAdd={false}
            pageSize={50}
            exportFilename="horarios-consejeria"
            exportRows={slots.map((s) => ({
              dia: DIAS_SEMANA[s.dia_semana],
              hora_inicio: s.hora_inicio,
              hora_fin: s.hora_fin,
              curso: s.curso,
              maestro: s.maestro,
              grado: s.grado,
              seccion: s.seccion,
              modalidad: s.modalidad,
            }))}
          />
        )}
        {!isLoading && slots.length === 0 ? (
          <p className="texto-muted" style={{ marginTop: '0.5rem' }}>
            No hay horario activo publicado para este periodo.
          </p>
        ) : null}
      </div>
    </RequirePermission>
  )
}
