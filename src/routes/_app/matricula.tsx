import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MatriculaWizard } from '#/components/matricula/MatriculaWizard'
import { UserFichaModal } from '#/components/usuarios/UserFichaModal'
import { RequirePermission, Can, useCan } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { DataTable } from '#/components/ui/DataTable'
import { Field } from '#/components/ui/Field'
import { Modal } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import { periodoSelectOptions } from '#/helpers/periodos'
import {
  listCursos,
  listGrados,
  listModalidades,
  listPeriodos,
  listSecciones,
} from '#/services/catalogos'
import { getSugerencia, listMatriculas, reingreso } from '#/services/matricula'
import type { Matricula, SugerenciaResponse } from '#/services/matricula'
import { darDeBajaPersona, restaurarPersona } from '#/services/personas'
import { esBaja, puedeVerInactivos } from '#/helpers/visibilidad'
import { useAccionPalette } from '#/hooks/use-accion-palette'

export const Route = createFileRoute('/_app/matricula')({
  component: MatriculaPage,
})

const col = createColumnHelper<Matricula>()

function MatriculaPage() {
  const qc = useQueryClient()
  const { can, roles } = useCan()
  const verInactivos = puedeVerInactivos(roles)
  const { data = [], isLoading } = useQuery({
    queryKey: ['matriculas', verInactivos],
    queryFn: () => listMatriculas({ incluirInactivos: verInactivos }),
  })
  const { data: secciones = [] } = useQuery({
    queryKey: ['secciones'],
    queryFn: listSecciones,
  })
  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos'],
    queryFn: listPeriodos,
  })
  const { data: grados = [] } = useQuery({
    queryKey: ['grados'],
    queryFn: listGrados,
  })
  const { data: modalidades = [] } = useQuery({
    queryKey: ['modalidades'],
    queryFn: listModalidades,
  })
  const { data: cursos = [] } = useQuery({
    queryKey: ['cursos'],
    queryFn: listCursos,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [reingresoOpen, setReingresoOpen] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [ctx, setCtx] = useState<{
    x: number
    y: number
    row: Matricula
  } | null>(null)
  const [editWizard, setEditWizard] = useState<Matricula | null>(null)
  const [verPersona, setVerPersona] = useState<string | null>(null)
  const [confirmBaja, setConfirmBaja] = useState<Matricula | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<Matricula | null>(null)

  useAccionPalette('nuevo-matricula', () => setCreateOpen(true))

  const [reingresoCode, setReingresoCode] = useState('')
  const [sugerencia, setSugerencia] = useState<SugerenciaResponse | null>(null)
  const [reingresoPeriodo, setReingresoPeriodo] = useState('')
  const [reingresoSeccion, setReingresoSeccion] = useState('')
  const seccionElegida = secciones.find((s) => s.id === reingresoSeccion)

  const closeCtx = useCallback(() => setCtx(null), [])
  useEffect(() => {
    if (!ctx) return
    const h = () => closeCtx()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx, closeCtx])

  const reingresoMut = useMutation({
    mutationFn: () =>
      reingreso({
        user_code: reingresoCode,
        periodo_academico_id: reingresoPeriodo,
        seccion_id: reingresoSeccion,
      }),
    onSuccess: () => {
      toast.success('Reingreso registrado')
      qc.invalidateQueries({ queryKey: ['matriculas'] })
      setReingresoOpen(false)
      setConfirmSave(false)
      setSugerencia(null)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const invalidarPersonas = () => {
    qc.invalidateQueries({ queryKey: ['matriculas'] })
    qc.invalidateQueries({ queryKey: ['alumnos'] })
    qc.invalidateQueries({ queryKey: ['users'] })
    qc.invalidateQueries({ queryKey: ['consejeria-alumnos'] })
  }

  const bajaMut = useMutation({
    mutationFn: (code: string) => darDeBajaPersona(code),
    onSuccess: () => {
      toast.success('Alumno dado de baja')
      setConfirmBaja(null)
      invalidarPersonas()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const restoreMut = useMutation({
    mutationFn: (code: string) => restaurarPersona(code),
    onSuccess: () => {
      toast.success('Alumno restaurado')
      setConfirmRestore(null)
      invalidarPersonas()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const buscarSugerencia = async () => {
    if (!reingresoCode.trim()) return
    try {
      const s = await getSugerencia(reingresoCode)
      setSugerencia(s)
      if (s.grado_sugerido) toast.info(s.mensaje ?? 'Sugerencia cargada')
    } catch (e) {
      toast.error(userMessageFromError(e))
    }
  }

  const seccionNombre = useCallback(
    (m: Matricula) =>
      secciones.find((s) => s.id === m.seccion_id)?.nombre ?? '—',
    [secciones],
  )
  const jornadaNombre = useCallback(
    (m: Matricula) => {
      const s = secciones.find((x) => x.id === m.seccion_id)
      if (!s) return '—'
      return modalidades.find((x) => x.id === s.modalidad_id)?.nombre ?? '—'
    },
    [secciones, modalidades],
  )

  const columns = useMemo(
    () => [
      col.accessor('alumno_code', {
        header: 'Código',
        cell: (i) => i.getValue() ?? '—',
      }),
      col.accessor('alumno_username', {
        header: 'Usuario',
        cell: (i) => i.getValue() ?? '—',
      }),
      col.accessor('grado_nombre', {
        header: 'Grado',
        cell: (i) => i.getValue() ?? '—',
      }),
      col.accessor('seccion_id', {
        header: 'Sección',
        cell: (i) => seccionNombre(i.row.original),
      }),
      col.display({
        id: 'jornada',
        header: 'Jornada',
        cell: (i) => jornadaNombre(i.row.original),
      }),
      col.display({
        id: 'estado_alumno',
        header: 'Alumno',
        cell: (i) =>
          esBaja(i.row.original) ? (
            <span className="badge badge--baja">Dado de baja</span>
          ) : (
            <span className="badge badge--ok">Activo</span>
          ),
      }),
    ],
    [seccionNombre, jornadaNombre],
  )

  const tableFilters = useMemo(
    () => [
      {
        id: 'grado_nombre',
        label: 'Grado',
        getValue: (r: Matricula) => r.grado_nombre ?? '',
      },
      {
        id: 'seccion',
        label: 'Sección',
        getValue: (r: Matricula) => seccionNombre(r),
      },
      {
        id: 'jornada',
        label: 'Jornada',
        getValue: (r: Matricula) => jornadaNombre(r),
      },
      { id: 'status', label: 'Estado', getValue: (r: Matricula) => r.status },
    ],
    [seccionNombre, jornadaNombre],
  )

  if (isLoading) return <div className="empty-state">Cargando matrículas…</div>

  return (
    <RequirePermission permission="matricula:get">
      <DataTable
        title="Matrícula"
        data={data}
        columns={columns}
        filters={tableFilters}
        addLabel="Nueva matrícula"
        canAdd={can('matricula:post')}
        onAdd={() => setCreateOpen(true)}
        toolbarExtra={
          <Can permission="matricula:post">
            <button
              type="button"
              className="btn btn--ghost"
              data-testid="reingreso-button"
              onClick={() => {
                setReingresoOpen(true)
                setSugerencia(null)
              }}
            >
              Reingreso
            </button>
          </Can>
        }
        exportFilename="matriculas"
        exportRows={data.map((m) => ({
          codigo: m.alumno_code ?? '',
          usuario: m.alumno_username ?? '',
          grado: m.grado_nombre ?? '',
          seccion: seccionNombre(m),
          jornada: jornadaNombre(m),
          estado: m.status,
          estado_persona: esBaja(m) ? 'Dado de baja' : 'Activo',
        }))}
        rowClassName={(m) => (esBaja(m) ? 'fila-baja' : undefined)}
        onRowContextMenu={(row, e) =>
          setCtx({ x: e.clientX, y: e.clientY, row })
        }
        onRowDoubleClick={(row) => {
          // Mismo gate que el ítem «Editar» del menú contextual (ctx-editar).
          if (
            !esBaja(row) &&
            row.alumno_code &&
            can('matricula:put') &&
            can('personas:put')
          ) {
            setEditWizard(row)
          }
        }}
      />

      {ctx ? (
        <div
          className="ctx-menu"
          style={{ left: ctx.x, top: ctx.y }}
          data-testid="matricula-ctx"
        >
          {ctx.row.alumno_code ? (
            <Can permission="personas:get">
              <button
                type="button"
                className="ctx-menu__item"
                data-testid="ctx-ver"
                onClick={() => {
                  setVerPersona(ctx.row.alumno_code ?? null)
                  closeCtx()
                }}
              >
                Ver
              </button>
            </Can>
          ) : null}
          {ctx.row.alumno_code && esBaja(ctx.row) ? (
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
          ) : null}
          {ctx.row.alumno_code && !esBaja(ctx.row) ? (
            <>
              <Can permission="personas:put">
                <Can permission="matricula:put">
                  <button
                    type="button"
                    className="ctx-menu__item"
                    data-testid="ctx-editar"
                    onClick={() => {
                      setEditWizard(ctx.row)
                      closeCtx()
                    }}
                  >
                    Editar
                  </button>
                </Can>
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
          ) : null}
        </div>
      ) : null}

      <MatriculaWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ['matriculas'] })
          qc.invalidateQueries({ queryKey: ['alumnos'] })
          qc.invalidateQueries({ queryKey: ['responsables'] })
          qc.invalidateQueries({ queryKey: ['users'] })
        }}
        periodos={periodos}
        secciones={secciones}
        grados={grados}
        modalidades={modalidades}
        cursos={cursos}
      />

      <Modal
        open={reingresoOpen}
        title="Reingreso"
        wide
        onClose={() => setReingresoOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setReingresoOpen(false)}
            >
              Cancelar
            </button>
            <Can permission="matricula:post">
              <button
                type="button"
                className="btn btn--primary"
                data-testid="reingreso-confirm-button"
                onClick={() => setConfirmSave(true)}
              >
                Confirmar reingreso
              </button>
            </Can>
          </>
        }
      >
        <Field label="Código de alumno">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="field__input"
              data-testid="reingreso-code-input"
              value={reingresoCode}
              onChange={(e) => setReingresoCode(e.target.value)}
            />
            <button
              type="button"
              className="btn btn--ghost"
              onClick={buscarSugerencia}
            >
              Sugerencia
            </button>
          </div>
        </Field>
        {sugerencia ? (
          <div
            style={{
              padding: '0.75rem',
              background: 'var(--sasha-bg-muted)',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
            data-testid="reingreso-sugerencia"
          >
            <p style={{ margin: '0 0 0.35rem' }}>
              <strong>Grado actual:</strong>{' '}
              {sugerencia.grado_actual?.nombre ?? '—'}
            </p>
            <p style={{ margin: '0 0 0.35rem' }}>
              <strong>Grado sugerido:</strong>{' '}
              {sugerencia.grado_sugerido?.nombre ?? '—'}
            </p>
            {sugerencia.resultado ? (
              <p
                className={`reingreso-resultado reingreso-resultado--${sugerencia.resultado.aprueba ? 'aprueba' : 'repite'}`}
                data-testid="reingreso-resultado"
              >
                {sugerencia.resultado.periodo_nombre}:{' '}
                {sugerencia.resultado.mensaje}
              </p>
            ) : sugerencia.mensaje ? (
              <p className="texto-muted" style={{ margin: 0 }}>
                {sugerencia.mensaje}
              </p>
            ) : null}
            {sugerencia.retrasadas.length > 0 ? (
              <p
                style={{ margin: '0.35rem 0 0' }}
                data-testid="reingreso-retrasadas"
              >
                <strong>Clases retrasadas:</strong>{' '}
                {sugerencia.retrasadas
                  .map((c) => `${c.curso} (${c.final})`)
                  .join(', ')}
              </p>
            ) : null}
            {seccionElegida &&
            sugerencia.grado_sugerido &&
            seccionElegida.grado_id !== sugerencia.grado_sugerido.id ? (
              <p
                className="texto-muted"
                style={{ margin: '0.35rem 0 0' }}
                data-testid="reingreso-otro-grado"
              >
                La sección elegida no es del grado sugerido.
              </p>
            ) : null}
          </div>
        ) : null}
        <Field label="Periodo académico" htmlFor="reingreso-periodo">
          <Combobox
            id="reingreso-periodo"
            value={reingresoPeriodo}
            onChange={setReingresoPeriodo}
            options={periodoSelectOptions(periodos)}
            placeholder="Buscar periodo…"
          />
        </Field>
        <Field label="Sección" htmlFor="reingreso-seccion">
          <Combobox
            id="reingreso-seccion"
            value={reingresoSeccion}
            onChange={setReingresoSeccion}
            options={secciones.map((s) => {
              const g = grados.find((x) => x.id === s.grado_id)
              const m = modalidades.find((x) => x.id === s.modalidad_id)
              return {
                value: s.id,
                label: [g?.nombre, m?.nombre, s.nombre]
                  .filter(Boolean)
                  .join(' · '),
                keywords: s.codigo,
              }
            })}
            placeholder="Buscar sección…"
          />
        </Field>
      </Modal>

      <UserFichaModal code={verPersona} onClose={() => setVerPersona(null)} />

      {editWizard?.alumno_code ? (
        <MatriculaWizard
          edicion={{
            matriculaId: editWizard.id,
            alumnoCode: editWizard.alumno_code,
          }}
          open
          onClose={() => setEditWizard(null)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['matriculas'] })
            qc.invalidateQueries({ queryKey: ['alumnos'] })
            qc.invalidateQueries({ queryKey: ['responsables'] })
            qc.invalidateQueries({ queryKey: ['users'] })
            qc.invalidateQueries({ queryKey: ['consejeria-alumnos'] })
            qc.invalidateQueries({
              queryKey: ['persona-ficha', editWizard.alumno_code],
            })
          }}
          periodos={periodos}
          secciones={secciones}
          grados={grados}
          modalidades={modalidades}
          cursos={cursos}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmBaja)}
        title="Dar de baja"
        message={`¿Dar de baja al alumno ${confirmBaja?.alumno_code ?? confirmBaja?.alumno_id}? Se ocultará de los listados y se conservará todo su historial. Podrás restaurarlo cuando quieras.`}
        danger
        confirmLabel="Dar de baja"
        onConfirm={() => {
          const code = confirmBaja?.alumno_code
          if (code) bajaMut.mutate(code)
        }}
        onCancel={() => setConfirmBaja(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmRestore)}
        title="Restaurar alumno"
        message={`¿Restaurar al alumno ${confirmRestore?.alumno_code ?? confirmRestore?.alumno_id}? Volverá a aparecer en los listados.`}
        confirmLabel="Restaurar"
        onConfirm={() => {
          const code = confirmRestore?.alumno_code
          if (code) restoreMut.mutate(code)
        }}
        onCancel={() => setConfirmRestore(null)}
      />

      <ConfirmDialog
        open={confirmSave}
        title="Confirmar reingreso"
        message={`¿Confirmar reingreso del alumno ${reingresoCode}?`}
        onConfirm={() => reingresoMut.mutate()}
        onCancel={() => setConfirmSave(false)}
      />
    </RequirePermission>
  )
}
