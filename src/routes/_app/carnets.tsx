import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown, Download } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CarnetEstudiantil } from '#/components/carnets/CarnetEstudiantil'
import type {
  CarnetAlumno,
  CarnetRef,
} from '#/components/carnets/CarnetEstudiantil'
import { RequirePermission } from '#/components/gates/Can'
import { Combobox } from '#/components/ui/Combobox'
import {
  exportCarnetPdf,
  exportCarnetPng,
  exportCarnetSvg,
} from '#/helpers/export-carnet'
import { userMessageFromError } from '#/lib/api'
import { getInstitucion } from '#/services/carnets'
import { getFicha, listAlumnos } from '#/services/personas'
import type { UserFicha } from '#/services/personas'

export const Route = createFileRoute('/_app/carnets')({
  component: CarnetsPage,
})

function nombreCompleto(ficha: UserFicha): string {
  const p = ficha.perfil
  return [
    p?.primer_nombre,
    p?.segundo_nombre,
    p?.primer_apellido,
    p?.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
}

function mapCarnet(
  ficha: UserFicha | undefined,
  codigoRespaldo: string,
): CarnetAlumno | undefined {
  if (!ficha) return undefined
  const p = ficha.perfil
  const mat =
    ficha.alumno?.matriculas.find((m) => m.status === 'ACTIVE') ??
    ficha.alumno?.matriculas[0]
  return {
    nombre: nombreCompleto(ficha) || 'NOMBRE ESTUDIANTE',
    codigo: ficha.user.code || codigoRespaldo,
    dni: p?.numero_identidad || '-',
    grado: mat ? `${mat.grado} ${mat.seccion}`.trim() : '—',
    jornada: mat?.modalidad ? mat.modalidad.toUpperCase() : '—',
    vigencia: mat ? `${mat.anio_lectivo} - ${mat.anio_lectivo + 1}` : '—',
  }
}

function CarnetsPage() {
  const [codigo, setCodigo] = useState('')
  const [exportando, setExportando] = useState<'pdf' | 'png' | null>(null)
  const carnetRef = useRef<CarnetRef>(null)

  const alumnos = useQuery({
    queryKey: ['carnets-alumnos'],
    queryFn: listAlumnos,
  })
  const institucion = useQuery({
    queryKey: ['carnets-institucion'],
    queryFn: getInstitucion,
  })
  const ficha = useQuery({
    queryKey: ['carnets-ficha', codigo],
    queryFn: () => getFicha(codigo),
    enabled: Boolean(codigo),
  })

  const opciones = useMemo(
    () =>
      (alumnos.data ?? [])
        .filter((a) => Boolean(a.user_code))
        .map((a) => ({
          value: a.user_code as string,
          label: `${a.nombre} · ${a.user_code}`,
          keywords: a.user_code ?? '',
        })),
    [alumnos.data],
  )

  const alumno = useMemo(
    () => mapCarnet(ficha.data, codigo),
    [ficha.data, codigo],
  )
  const listo = Boolean(alumno) && !ficha.isPending

  useEffect(() => {
    if (ficha.isError) toast.error(userMessageFromError(ficha.error))
  }, [ficha.isError, ficha.error])

  const archivo = `carnet-${alumno?.codigo || 'estudiante'}`

  async function onPdf() {
    if (!carnetRef.current?.front) return
    setExportando('pdf')
    try {
      await exportCarnetPdf(
        archivo,
        carnetRef.current.front,
        carnetRef.current.back,
      )
    } catch (err) {
      toast.error(userMessageFromError(err))
    } finally {
      setExportando(null)
    }
  }

  async function onPng() {
    if (!carnetRef.current?.front) return
    setExportando('png')
    try {
      await exportCarnetPng(
        archivo,
        carnetRef.current.front,
        carnetRef.current.back,
      )
    } catch (err) {
      toast.error(userMessageFromError(err))
    } finally {
      setExportando(null)
    }
  }

  function onSvg() {
    if (!carnetRef.current?.front) return
    try {
      exportCarnetSvg(archivo, carnetRef.current.front, carnetRef.current.back)
    } catch (err) {
      toast.error(userMessageFromError(err))
    }
  }

  return (
    <RequirePermission permission="carnets:get">
      <h1 className="page-title">Carnets estudiantiles</h1>

      <div className="carnets-page">
        <div className="carnets-toolbar">
          <div className="carnets-buscador">
            <label
              className="panel-toolbar__filter-label"
              htmlFor="carnets-alumno"
            >
              Alumno
            </label>
            <Combobox
              id="carnets-alumno"
              value={codigo}
              onChange={setCodigo}
              options={opciones}
              data-testid="carnets-buscador"
            />
            {alumnos.isPending ? (
              <p className="texto-muted">Cargando alumnos…</p>
            ) : null}
            {alumnos.isError ? (
              <p className="texto-muted">
                No se pudieron cargar los alumnos.{' '}
                {userMessageFromError(alumnos.error)}
              </p>
            ) : null}
          </div>

          <details className="export-menu">
            <summary
              className="btn btn--primary"
              data-testid="carnets-descargar"
            >
              <Download size={16} aria-hidden />{' '}
              {exportando ? 'Generando…' : 'Descargar'}
              <ChevronDown size={14} />
            </summary>
            <div className="export-menu__list" role="menu">
              <button
                type="button"
                className="ctx-menu__item"
                role="menuitem"
                data-testid="carnets-pdf"
                disabled={!listo || exportando !== null}
                onClick={(e) => {
                  e.currentTarget.closest('details')?.removeAttribute('open')
                  void onPdf()
                }}
              >
                PDF
              </button>
              <button
                type="button"
                className="ctx-menu__item"
                role="menuitem"
                data-testid="carnets-png"
                disabled={!listo || exportando !== null}
                onClick={(e) => {
                  e.currentTarget.closest('details')?.removeAttribute('open')
                  void onPng()
                }}
              >
                PNG
              </button>
              <button
                type="button"
                className="ctx-menu__item"
                role="menuitem"
                data-testid="carnets-svg"
                disabled={!listo || exportando !== null}
                onClick={(e) => {
                  e.currentTarget.closest('details')?.removeAttribute('open')
                  onSvg()
                }}
              >
                SVG
              </button>
            </div>
          </details>
        </div>

        <div className="carnets-preview">
          {codigo && ficha.isPending ? (
            <p className="texto-muted">Cargando ficha…</p>
          ) : null}
          <CarnetEstudiantil
            ref={carnetRef}
            alumno={alumno}
            institucion={institucion.data?.nombre_institucion}
          />
        </div>
      </div>
    </RequirePermission>
  )
}
