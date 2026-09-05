import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission } from '#/components/gates/Can'
import { Field } from '#/components/ui/Field'
import { userMessageFromError } from '#/lib/api'
import { listCursos, listGrados, listPeriodos, listSecciones } from '#/services/catalogos'
import { exportSace, type SaceExportDocument } from '#/services/sace'

export const Route = createFileRoute('/_app/sace')({ component: SacePage })

function SacePage() {
  const { data: periodos = [] } = useQuery({ queryKey: ['periodos'], queryFn: listPeriodos })
  const { data: grados = [] } = useQuery({ queryKey: ['grados'], queryFn: listGrados })
  const { data: secciones = [] } = useQuery({ queryKey: ['secciones'], queryFn: listSecciones })
  const { data: cursos = [] } = useQuery({ queryKey: ['cursos'], queryFn: listCursos })

  const [periodoId, setPeriodoId] = useState('')
  const [gradoId, setGradoId] = useState('')
  const [seccionId, setSeccionId] = useState('')
  const [cursoId, setCursoId] = useState('')
  const [parciales, setParciales] = useState('1,2,3,4')
  const [preview, setPreview] = useState<SaceExportDocument | null>(null)

  const exportMut = useMutation({
    mutationFn: () =>
      exportSace({
        periodo_academico_id: periodoId,
        grado_id: gradoId,
        seccion_id: seccionId,
        curso_id: cursoId,
        parciales: parciales
          .split(',')
          .map((n) => Number(n.trim()))
          .filter((n) => !Number.isNaN(n)),
      }),
    onSuccess: (doc) => {
      setPreview(doc)
      toast.success('Export generado')
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const downloadJson = () => {
    if (!preview) return
    const blob = new Blob([JSON.stringify(preview, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sace-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('JSON descargado')
  }

  return (
    <RequirePermission permission="sace:get">
      <h1 className="page-title">Export SACE</h1>

      <div
        style={{
          maxWidth: 560,
          background: 'var(--sasha-bg-raised)',
          border: '1px solid var(--sasha-border-suave)',
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <Field label="Periodo académico">
          <select
            className="field__select"
            data-testid="sace-periodo-select"
            value={periodoId}
            onChange={(e) => setPeriodoId(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Grado">
          <select
            className="field__select"
            data-testid="sace-grado-select"
            value={gradoId}
            onChange={(e) => setGradoId(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {grados.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sección">
          <select
            className="field__select"
            data-testid="sace-seccion-select"
            value={seccionId}
            onChange={(e) => setSeccionId(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Curso">
          <select
            className="field__select"
            data-testid="sace-curso-select"
            value={cursoId}
            onChange={(e) => setCursoId(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Parciales (CSV)">
          <input
            className="field__input"
            value={parciales}
            onChange={(e) => setParciales(e.target.value)}
            placeholder="1,2,3,4"
          />
        </Field>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="sace-export-button"
            disabled={!periodoId || !gradoId || !seccionId || !cursoId || exportMut.isPending}
            onClick={() => exportMut.mutate()}
          >
            {exportMut.isPending ? 'Generando…' : 'Generar export'}
          </button>
          {preview ? (
            <button type="button" className="btn btn--ghost" data-testid="sace-download-button" onClick={downloadJson}>
              Descargar JSON
            </button>
          ) : null}
        </div>
      </div>

      {preview ? (
        <section>
          <h3 className="texto-muted" style={{ fontSize: '0.9rem' }}>
            Vista previa ({preview.estudiantes.length} estudiantes)
          </h3>
          <pre
            style={{
              background: 'var(--sasha-bg-raised)',
              border: '1px solid var(--sasha-border-suave)',
              borderRadius: '8px',
              padding: '1rem',
              overflow: 'auto',
              fontSize: '0.75rem',
              maxHeight: 480,
            }}
          >
            {JSON.stringify(preview, null, 2)}
          </pre>
        </section>
      ) : (
        <div className="empty-state">Selecciona filtros y genera el export SACE.</div>
      )}
    </RequirePermission>
  )
}
