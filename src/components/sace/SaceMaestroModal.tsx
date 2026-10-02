import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { descargarSaceExcel, descargarSacePdf, encabezadoSace } from '#/helpers/export-sace'
import { userMessageFromError } from '#/lib/api'
import { getDocumentoMaestro } from '#/services/sace'
import type { ClaseSace, DocumentoMaestroSace, MaestroSaceResumen } from '#/services/sace'

const unicos = (xs: string[]) => [...new Set(xs)]

/** Filas de la hoja separadas por tabulador, sin encabezados, para pegar en un Excel ya formateado. */
function filasTsv(clase: ClaseSace) {
  return clase.estudiantes
    .map((e) =>
      [
        e.tipo_documento,
        e.identidad,
        e.nombre,
        ...e.parciales.flatMap((p) => [String(p.inasistencias), p.nota_total == null ? '' : String(p.nota_total)]),
      ].join('\t'),
    )
    .join('\n')
}

async function copiarHoja(clase: ClaseSace) {
  try {
    await navigator.clipboard.writeText(filasTsv(clase))
    toast.success(`${clase.estudiantes.length} filas copiadas`)
  } catch {
    toast.error('No se pudo copiar al portapapeles')
  }
}

export function SaceHoja({ doc, clase }: { doc: DocumentoMaestroSace; clase: ClaseSace }) {
  return (
    <div className="sace-hoja" data-testid="sace-hoja">
      <div className="sace-hoja__encabezado">
        {encabezadoSace(doc, clase).map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      <div className="sace-hoja__scroll">
        <table className="sace-hoja__tabla">
          <thead>
            <tr>
              <th rowSpan={2}>DOCUMENTO</th>
              <th rowSpan={2}>IDENTIDAD</th>
              <th rowSpan={2}>NOMBRE</th>
              {clase.parciales.map((p) => (
                <th key={p.numero} colSpan={2} className="sace-hoja__parcial">
                  PARCIAL {p.etiqueta}
                </th>
              ))}
            </tr>
            <tr>
              {clase.parciales.map((p) => [
                <th key={`${p.numero}-i`}>INASISTENCIAS</th>,
                <th key={`${p.numero}-n`}>NOTA TOTAL</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {clase.estudiantes.map((e, idx) => (
              <tr key={`${e.identidad}-${idx}`}>
                <td>{e.tipo_documento}</td>
                <td>{e.identidad}</td>
                <td className="sace-hoja__nombre">{e.nombre}</td>
                {e.parciales.map((p, i) => [
                  <td key={`${i}-i`} className="sace-hoja__num">
                    {p.inasistencias}
                  </td>,
                  <td key={`${i}-n`} className="sace-hoja__num">
                    {p.nota_total ?? ''}
                  </td>,
                ])}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {clase.estudiantes.length === 0 ? <p className="sace-hoja__vacio">Sin alumnos matriculados.</p> : null}
    </div>
  )
}

function MenuDescarga({
  label,
  testId,
  onPdf,
  onExcel,
}: {
  label: string
  testId: string
  onPdf: () => Promise<void>
  onExcel: () => Promise<void>
}) {
  const correr = (fn: () => Promise<void>, el: HTMLElement) => {
    el.closest('details')?.removeAttribute('open')
    fn().catch((e) => toast.error(userMessageFromError(e)))
  }
  return (
    <details className="export-menu export-menu--arriba">
      <summary className="btn btn--ghost" data-testid={testId}>
        {label}
        <ChevronDown size={14} />
      </summary>
      <div className="export-menu__list" role="menu">
        <button
          type="button"
          className="ctx-menu__item"
          role="menuitem"
          data-testid={`${testId}-pdf`}
          onClick={(e) => correr(onPdf, e.currentTarget)}
        >
          PDF
        </button>
        <button
          type="button"
          className="ctx-menu__item"
          role="menuitem"
          data-testid={`${testId}-excel`}
          onClick={(e) => correr(onExcel, e.currentTarget)}
        >
          Excel (.xlsx)
        </button>
      </div>
    </details>
  )
}

export function SaceMaestroModal({ maestro, onClose }: { maestro: MaestroSaceResumen; onClose: () => void }) {
  const { open, dismiss } = useDismiss(onClose)
  const { data: doc, isLoading } = useQuery({
    queryKey: ['sace-maestro', maestro.maestro_id],
    queryFn: () => getDocumentoMaestro(maestro.maestro_id),
  })
  const clases = doc?.clases ?? []
  const [sel, setSel] = useState<{ materia: string; grado: string; seccion: string } | null>(null)

  const actual = sel ?? (clases[0] ? { materia: clases[0].materia, grado: clases[0].grado, seccion: clases[0].seccion } : null)

  const materias = useMemo(() => unicos(clases.map((c) => c.materia)), [clases])
  const grados = unicos(clases.filter((c) => c.materia === actual?.materia).map((c) => c.grado))
  const secciones = unicos(
    clases.filter((c) => c.materia === actual?.materia && c.grado === actual.grado).map((c) => c.seccion),
  )

  const idx = actual
    ? clases.findIndex((c) => c.materia === actual.materia && c.grado === actual.grado && c.seccion === actual.seccion)
    : -1
  const clase = idx >= 0 ? clases[idx] : undefined

  const elegir = (cambio: Partial<{ materia: string; grado: string; seccion: string }>) => {
    if (!actual) return
    const quiere = { ...actual, ...cambio }
    const c =
      clases.find((x) => x.materia === quiere.materia && x.grado === quiere.grado && x.seccion === quiere.seccion) ??
      clases.find((x) => x.materia === quiere.materia && x.grado === quiere.grado) ??
      clases.find((x) => x.materia === quiere.materia)
    if (c) setSel({ materia: c.materia, grado: c.grado, seccion: c.seccion })
  }

  return (
    <Modal
      open={open}
      title={maestro.nombre}
      xl
      onClose={dismiss}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Cerrar
          </button>
          <span style={{ flex: 1 }} />
          {doc && clase ? (
            <>
              <MenuDescarga
                label="Descargar actual"
                testId="sace-descargar-actual"
                onPdf={() => descargarSacePdf(doc, clase)}
                onExcel={() => descargarSaceExcel(doc, clase)}
              />
              <MenuDescarga
                label="Descargar completa"
                testId="sace-descargar-completa"
                onPdf={() => descargarSacePdf(doc, null)}
                onExcel={() => descargarSaceExcel(doc, null)}
              />
            </>
          ) : null}
        </>
      }
    >
      {isLoading ? (
        <div className="empty-state">Cargando documento…</div>
      ) : !doc || clases.length === 0 ? (
        <div className="empty-state">Este maestro no tiene clases en el periodo activo.</div>
      ) : (
        <>
          <div className="plan-ver__filtros sace-filtros" data-testid="sace-filtros">
            <Field label="Materia" htmlFor="sace-f-materia">
              <select
                id="sace-f-materia"
                className="field__input"
                value={actual?.materia ?? ''}
                onChange={(e) => elegir({ materia: e.target.value })}
                data-testid="sace-filtro-materia"
              >
                {materias.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Grado" htmlFor="sace-f-grado">
              <select
                id="sace-f-grado"
                className="field__input"
                value={actual?.grado ?? ''}
                onChange={(e) => elegir({ grado: e.target.value })}
                data-testid="sace-filtro-grado"
              >
                {grados.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sección" htmlFor="sace-f-seccion">
              <select
                id="sace-f-seccion"
                className="field__input"
                value={actual?.seccion ?? ''}
                onChange={(e) => elegir({ seccion: e.target.value })}
                data-testid="sace-filtro-seccion"
              >
                {secciones.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="sace-filtros__barra">
            <p className="sace-filtros__conteo" data-testid="sace-clase-conteo">
              Clase {idx + 1} de {clases.length} · Periodo {doc.periodo}
            </p>
            {clase ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void copiarHoja(clase)}
                disabled={clase.estudiantes.length === 0}
                title="Copiar el contenido de la tabla, sin encabezados, para pegarlo en Excel"
                data-testid="sace-copiar"
              >
                <Copy size={14} />
                Copiar
              </button>
            ) : null}
          </div>
          {clase ? <SaceHoja doc={doc} clase={clase} /> : null}
        </>
      )}
    </Modal>
  )
}
