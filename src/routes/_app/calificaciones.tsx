import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useMemo, useState } from 'react'
import { RequirePermission, useCan } from '#/components/gates/Can'
import {
  AVANZADO_CALIF_VACIO,
  CalificacionesAvanzadoModal,
  filtrosActivos,
} from '#/components/calificaciones/CalificacionesAvanzadoModal'
import type { AvanzadoCalif, ResultadoCalif } from '#/components/calificaciones/CalificacionesAvanzadoModal'
import { PortalCalificacionesView } from '#/components/portal/PortalCalificacionesView'
import { RequirePortalClase } from '#/components/portal/RequirePortalClase'
import { DataTable } from '#/components/ui/DataTable'
import { isPortalRole } from '#/lib/home-path'
import { readLastAsignacionId } from '#/lib/last-asignacion'
import { listMateriasAsistencia } from '#/services/asistencia'
import { getResumenCalificaciones, listNotasClase } from '#/services/calificaciones'
import type { NotaClaseRow, ParcialColumna, ResumenCalificaciones } from '#/services/calificaciones'

export const Route = createFileRoute('/_app/calificaciones')({ component: CalificacionesPage })

const col = createColumnHelper<NotaClaseRow>()

function fmtPuntos(v: number | null | undefined) {
  return v == null ? '—' : v
}

function buildColumns(parciales: ParcialColumna[]) {
  return [
    col.accessor('codigo', { header: 'Código' }),
    col.accessor('nombre', { header: 'Nombre' }),
    ...parciales.map((p, idx) =>
      col.accessor((r) => r.puntos_parcial[idx] ?? null, {
        id: `parcial-${p.id}`,
        header: p.etiqueta,
        cell: (i) => fmtPuntos(i.getValue()),
      }),
    ),
    col.accessor('total', {
      header: 'Total',
      cell: (i) => fmtPuntos(i.getValue()),
    }),
    col.accessor('promedio', {
      header: 'Promedio',
      cell: (i) => fmtPuntos(i.getValue()),
    }),
    col.accessor('etiqueta', { header: 'Estado' }),
  ]
}

function CalificacionesPage() {
  const { roles } = useCan()
  if (isPortalRole(roles)) {
    return (
      <RequirePermission permission="calificaciones:get">
        <RequirePortalClase>
          {({ clase, alumnoId }) => (
            <PortalCalificacionesView
              asignacionId={clase.asignacionId}
              cursoNombre={clase.cursoNombre}
              alumnoId={alumnoId}
            />
          )}
        </RequirePortalClase>
      </RequirePermission>
    )
  }
  if (roles.includes('consejeria')) return <CalificacionesConsejeriaView />
  return <CalificacionesStaffPage />
}

interface FilaResumen {
  alumno_id: string
  codigo: string
  nombre: string
  seccion_id: string
  seccion: string
  total: number | null
  promedio: number | null
  /** Promedio de las materias elegidas en cada parcial, por número de parcial. */
  porParcial: Record<number, number>
  etiqueta: string
  resultado: ResultadoCalif
}

const colRes = createColumnHelper<FilaResumen>()

const r1 = (v: number) => Math.round(v * 10) / 10

function etiquetaPromedio(p: number | null, u: ResumenCalificaciones['umbrales']) {
  if (p == null) return 'Sin nota'
  if (p >= u.excelencia) return 'Excelencia académica'
  if (p >= u.honor) return 'Honor al mérito'
  if (p >= u.minima) return 'Aprobado'
  return 'Reprobado'
}

function enRango(p: number | null, a: AvanzadoCalif) {
  if (a.rango === 'todos') return true
  if (p == null) return false
  if (a.rango !== 'custom') return p > Number(a.rango)
  const desde = a.desde === '' ? 0 : Number(a.desde)
  const hasta = a.hasta === '' ? 100 : Number(a.hasta)
  return p >= desde && p <= hasta
}

function CalificacionesConsejeriaView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['calificaciones-resumen'],
    queryFn: getResumenCalificaciones,
  })
  const [sel, setSel] = useState<Partial<Record<string, string>>>({})
  const [avanzado, setAvanzado] = useState<AvanzadoCalif>(AVANZADO_CALIF_VACIO)
  const [avanzadoOpen, setAvanzadoOpen] = useState(false)

  const seccionSel = sel.seccion ?? ''
  const parcialSel = sel.parcial ? Number(sel.parcial) : null
  const cursoSel = sel.materia ?? ''

  const todas = useMemo<FilaResumen[]>(() => {
    if (!data) return []
    const secNombre = new Map(data.secciones.map((s) => [s.id, s.nombre]))
    const porAlumno = new Map<string, ResumenCalificaciones['notas']>()
    for (const n of data.notas) {
      if (cursoSel && n.curso_id !== cursoSel) continue
      if (parcialSel != null && n.parcial !== parcialSel) continue
      const lista = porAlumno.get(n.alumno_id)
      if (lista) lista.push(n)
      else porAlumno.set(n.alumno_id, [n])
    }
    return data.alumnos.map((a) => {
      const celdas = porAlumno.get(a.id) ?? []
      const suma = celdas.reduce((s, c) => s + c.puntos, 0)
      const promedio = celdas.length ? r1(suma / celdas.length) : null
      const acum: Record<number, { s: number; n: number }> = {}
      for (const c of celdas) {
        const x = (acum[c.parcial] ??= { s: 0, n: 0 })
        x.s += c.puntos
        x.n += 1
      }
      const porParcial: Record<number, number> = {}
      for (const [k, v] of Object.entries(acum)) porParcial[Number(k)] = r1(v.s / v.n)
      const etiqueta = etiquetaPromedio(promedio, data.umbrales)
      return {
        alumno_id: a.id,
        codigo: a.codigo,
        nombre: a.nombre,
        seccion_id: a.seccion_id,
        seccion: secNombre.get(a.seccion_id) ?? '—',
        total: celdas.length ? r1(suma) : null,
        promedio,
        porParcial,
        etiqueta,
        resultado:
          promedio == null ? 'sin_nota' : promedio >= data.umbrales.minima ? 'aprobado' : 'reprobado',
      }
    })
  }, [data, cursoSel, parcialSel])

  const filas = useMemo(
    () =>
      todas.filter(
        (f) =>
          (!seccionSel || f.seccion_id === seccionSel) &&
          avanzado.resultados.includes(f.resultado) &&
          enRango(f.promedio, avanzado),
      ),
    [todas, seccionSel, avanzado],
  )

  const resumen = useMemo(() => {
    const conNota = filas.filter((f) => f.promedio != null)
    const prom = conNota.length
      ? r1(conNota.reduce((s, f) => s + (f.promedio ?? 0), 0) / conNota.length)
      : null
    return {
      promedio: prom,
      alumnos: filas.length,
      aprobados: filas.filter((f) => f.resultado === 'aprobado').length,
      reprobados: filas.filter((f) => f.resultado === 'reprobado').length,
    }
  }, [filas])

  const parcialesVisibles = useMemo(
    () => (data?.parciales ?? []).filter((p) => parcialSel == null || p.numero === parcialSel),
    [data, parcialSel],
  )

  const columns = useMemo(() => {
    const base = [
      colRes.accessor('codigo', { header: 'Código' }),
      colRes.accessor('nombre', { header: 'Nombre' }),
    ]
    const cola = [
      colRes.accessor('promedio', { header: 'Promedio', cell: (i) => fmtPuntos(i.getValue()) }),
      colRes.accessor('etiqueta', { header: 'Estado' }),
    ]
    if (avanzado.vista === 'parcial') {
      return [
        ...base,
        ...parcialesVisibles.map((p) =>
          colRes.accessor((r) => r.porParcial[p.numero] ?? null, {
            id: `parcial-${p.numero}`,
            header: p.etiqueta,
            cell: (i) => fmtPuntos(i.getValue()),
          }),
        ),
        ...cola,
      ]
    }
    return [
      ...base,
      colRes.accessor('seccion', { header: 'Grado - sección' }),
      colRes.accessor('total', { header: 'Total de puntos', cell: (i) => fmtPuntos(i.getValue()) }),
      ...cola,
    ]
  }, [avanzado.vista, parcialesVisibles])

  const tableFilters = useMemo(
    () => [
      {
        id: 'seccion',
        label: 'Grado - sección',
        getValue: (r: FilaResumen) => r.seccion_id,
        matches: () => true,
        options: (data?.secciones ?? []).map((s) => ({ value: s.id, label: s.nombre })),
      },
      {
        id: 'parcial',
        label: 'Parcial',
        getValue: () => '',
        matches: () => true,
        options: (data?.parciales ?? []).map((p) => ({ value: String(p.numero), label: p.etiqueta })),
      },
      {
        id: 'materia',
        label: 'Materia',
        getValue: () => '',
        matches: () => true,
        options: (data?.cursos ?? []).map((c) => ({ value: c.id, label: c.nombre })),
      },
    ],
    [data],
  )

  const exportRows = useMemo(
    () =>
      filas.map((f) => {
        const row: Record<string, unknown> = { Código: f.codigo, Nombre: f.nombre }
        if (avanzado.vista === 'parcial') {
          for (const p of parcialesVisibles) row[p.etiqueta] = fmtPuntos(f.porParcial[p.numero])
        } else {
          row['Grado - sección'] = f.seccion
          row['Total de puntos'] = fmtPuntos(f.total)
        }
        row.Promedio = fmtPuntos(f.promedio)
        row.Estado = f.etiqueta
        return row
      }),
    [filas, avanzado.vista, parcialesVisibles],
  )

  const nAvanzados = filtrosActivos(avanzado)

  if (isError) {
    return (
      <RequirePermission permission="calificaciones:get">
        <div className="empty-state" data-testid="calif-error">
          Hay problemas de conexión.
        </div>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="calificaciones:get">
      {isLoading ? (
        <div className="empty-state">Cargando calificaciones…</div>
      ) : (
        <DataTable
          title="Calificaciones"
          data={filas}
          columns={columns}
          filters={tableFilters}
          onFiltersChange={setSel}
          searchPlaceholder="Buscar por código o nombre…"
          exportFilename="calificaciones"
          exportRows={exportRows}
          toolbarExtra={
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setAvanzadoOpen(true)}
              data-testid="calif-avanzado"
            >
              Avanzado{nAvanzados ? ` (${nAvanzados})` : ''}
            </button>
          }
          beforeTable={
            <div className="calif-resumen" data-testid="calif-resumen">
              <div className="calif-resumen__dato calif-resumen__dato--principal">
                <span>Promedio total</span>
                <strong data-testid="calif-resumen-promedio">
                  {resumen.promedio == null ? '—' : resumen.promedio}
                </strong>
              </div>
              <div className="calif-resumen__dato">
                <span>Alumnos</span>
                <strong>{resumen.alumnos}</strong>
              </div>
              <div className="calif-resumen__dato">
                <span>Aprobados</span>
                <strong>{resumen.aprobados}</strong>
              </div>
              <div className="calif-resumen__dato">
                <span>Reprobados</span>
                <strong>{resumen.reprobados}</strong>
              </div>
            </div>
          }
        />
      )}

      {avanzadoOpen ? (
        <CalificacionesAvanzadoModal
          open
          valor={avanzado}
          onClose={() => setAvanzadoOpen(false)}
          onApply={(v) => {
            setAvanzado(v)
            setAvanzadoOpen(false)
          }}
        />
      ) : null}
    </RequirePermission>
  )
}

function CalificacionesStaffPage() {
  const { data: materias = [], isLoading: loadingMaterias } = useQuery({
    queryKey: ['asistencia-materias'],
    queryFn: listMateriasAsistencia,
  })

  const lastId = readLastAsignacionId()
  const asigEffective =
    lastId && materias.some((m) => m.asignacion_docente_id === lastId)
      ? lastId
      : (materias[0]?.asignacion_docente_id ?? '')

  const materiaRow = materias.find((m) => m.asignacion_docente_id === asigEffective)

  const {
    data: clase,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['calificaciones-clase', asigEffective],
    queryFn: () => listNotasClase(asigEffective),
    enabled: Boolean(asigEffective),
  })

  const parciales = clase?.parciales
  const filas = clase?.filas ?? []

  const columns = useMemo(() => buildColumns(parciales ?? []), [parciales])

  const tableFilters = useMemo(
    () => [
      {
        id: 'etiqueta',
        label: 'Estado',
        getValue: (r: NotaClaseRow) => r.etiqueta,
        options: [
          { value: 'Reprobado', label: 'Reprobado' },
          { value: 'Aprobado', label: 'Aprobado' },
          { value: 'Honor al mérito', label: 'Honor al mérito' },
          { value: 'Excelencia académica', label: 'Excelencia académica' },
          { value: 'Sin nota', label: 'Sin nota' },
        ],
      },
    ],
    [],
  )

  const title = materiaRow
    ? `Calificaciones · ${materiaRow.curso_nombre} · ${materiaRow.grado_nombre} sec${materiaRow.seccion_nombre}`
    : 'Calificaciones'

  const exportRows = useMemo(
    () =>
      filas.map((r) => {
        const row: Record<string, unknown> = { Código: r.codigo, Nombre: r.nombre }
        ;(parciales ?? []).forEach((p, idx) => {
          row[p.etiqueta] = fmtPuntos(r.puntos_parcial[idx])
        })
        row.Total = fmtPuntos(r.total)
        row.Promedio = fmtPuntos(r.promedio)
        row.Estado = r.etiqueta
        return row
      }),
    [filas, parciales],
  )

  const exportFilename = materiaRow
    ? `calificaciones-${materiaRow.curso_nombre}-${materiaRow.grado_nombre}-sec${materiaRow.seccion_nombre}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-]+/g, '-')
        .toLowerCase()
    : 'calificaciones'

  if (loadingMaterias) {
    return (
      <RequirePermission permission="calificaciones:get">
        <div className="empty-state">Cargando clases…</div>
      </RequirePermission>
    )
  }

  if (materias.length === 0 || !asigEffective) {
    return (
      <RequirePermission permission="calificaciones:get">
        <div className="empty-state" data-testid="calif-sin-clases">
          Entrá a una clase desde el dashboard para ver calificaciones.
        </div>
      </RequirePermission>
    )
  }

  if (isError) {
    return (
      <RequirePermission permission="calificaciones:get">
        <div className="empty-state" data-testid="calif-error">
          Hay problemas de conexión.
        </div>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission="calificaciones:get">
      <DataTable
        title={title}
        data={isLoading ? [] : filas}
        columns={columns}
        filters={tableFilters}
        searchPlaceholder="Buscar por código o nombre…"
        exportFilename={exportFilename}
        exportRows={isLoading ? undefined : exportRows}
      />
    </RequirePermission>
  )
}
