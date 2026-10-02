import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { HorarioSemanaGrid } from '#/components/horarios/HorarioSemanaGrid'
import type { SemanaSlot } from '#/components/horarios/HorarioSemanaGrid'
import { Modal } from '#/components/ui/Modal'
import { useBovedaImage } from '#/hooks/use-boveda-image'
import { userMessageFromError } from '#/lib/api'
import { downloadFichaPdf } from '#/lib/fichaPdf'
import { useCan } from '#/components/gates/Can'
import { getRendimientoAlumno } from '#/services/consejeria'
import { fechaLarga, listFichasAlumno, ordinal } from '#/services/disciplina'
import type { AsistenciaResumen, RendimientoAlumno } from '#/services/consejeria'
import { getFicha, localConsulta } from '#/services/personas'
import type { UserFicha } from '#/services/personas'

const yn = (v: boolean) => (v ? 'Sí' : 'No')
const dash = (v?: string | number | null) => (v === undefined || v === null || v === '' ? '—' : String(v))
const nota = (v?: number | null) => (v === undefined || v === null ? '—' : v.toFixed(1))

function joinName(p?: UserFicha['perfil']) {
  if (!p) return ''
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ')
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ficha__item">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Chips({ values, empty = 'Ninguna' }: { values?: string[]; empty?: string }) {
  if (!values?.length) return <span className="texto-muted">{empty}</span>
  return (
    <span className="ficha__chips">
      {values.map((v) => (
        <span key={v} className="badge">
          {v}
        </span>
      ))}
    </span>
  )
}

function Seccion({ title, testId, children }: { title: string; testId?: string; children: ReactNode }) {
  return (
    <section className="expediente__seccion" data-testid={testId}>
      <h3 className="expediente__titulo">{title}</h3>
      {children}
    </section>
  )
}

function Tabla({ testId, children }: { testId?: string; children: ReactNode }) {
  return (
    <div className="expediente__tabla">
      <table className="ficha-table" data-testid={testId}>
        {children}
      </table>
    </div>
  )
}

function porcentaje(a: AsistenciaResumen) {
  return a.porcentaje === undefined ? '—' : `${a.porcentaje.toFixed(1)} %`
}

function Estado({ cargando, error, que }: { cargando: boolean; error: unknown; que: string }) {
  if (cargando) return <p className="texto-muted">Cargando {que}…</p>
  if (error)
    return (
      <p className="texto-muted" role="alert">
        No se pudo cargar {que}: {userMessageFromError(error)}
      </p>
    )
  return null
}

export function ExpedienteAlumnoModal({ code, onClose }: { code: string | null; onClose: () => void }) {
  const { can } = useCan()
  const consulta = useMemo(() => localConsulta(), [code])
  const ficha = useQuery({
    queryKey: ['user-ficha', code, consulta.fecha, consulta.hora],
    queryFn: () => getFicha(code!, consulta),
    enabled: Boolean(code),
  })
  const rend = useQuery({
    queryKey: ['consejeria-rendimiento', code],
    queryFn: () => getRendimientoAlumno(code!),
    enabled: Boolean(code),
  })
  const photo = useBovedaImage(ficha.data?.perfil?.path_imagen)
  const nombre = joinName(ficha.data?.perfil) || rend.data?.alumno_nombre || code || ''

  return (
    <Modal
      open={Boolean(code)}
      title={nombre ? `Expediente · ${nombre}` : 'Expediente del alumno'}
      onClose={onClose}
      xl
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!ficha.data}
            onClick={() => ficha.data && downloadFichaPdf(ficha.data)}
          >
            Descargar ficha PDF
          </button>
        </>
      }
    >
      <div className="expediente" data-testid="expediente-alumno">
        <div className="ficha__hero">
          {photo ? (
            <img className="ficha__photo" src={photo} alt={`Foto de ${nombre}`} />
          ) : (
            <div className="ficha__photo ficha__photo--placeholder">{nombre.slice(0, 1)}</div>
          )}
          <div>
            <p className="ficha__name">{nombre}</p>
            <p className="texto-muted" style={{ margin: '0.2rem 0 0' }}>
              {code}
              {rend.data?.grado ? ` · ${rend.data.grado} sec ${rend.data.seccion} · ${rend.data.modalidad}` : ''}
            </p>
            {rend.data?.periodo_nombre ? (
              <p className="texto-muted" style={{ margin: '0.1rem 0 0' }}>
                {rend.data.periodo_nombre}
              </p>
            ) : null}
          </div>
        </div>

        {ficha.data ? (
          <FichaSecciones ficha={ficha.data} />
        ) : (
          <Seccion title="Datos personales">
            <Estado cargando={ficha.isLoading} error={ficha.error} que="la ficha" />
          </Seccion>
        )}

        {rend.data ? (
          <RendimientoSecciones rend={rend.data} />
        ) : (
          <Seccion title="Materias y notas">
            <Estado cargando={rend.isLoading} error={rend.error} que="el rendimiento" />
          </Seccion>
        )}

        {code && can('fichas:get') ? <FichasSeccion code={code} /> : null}

        {ficha.data?.alumno ? <MatriculasSeccion alumno={ficha.data.alumno} /> : null}
      </div>
    </Modal>
  )
}

function FichaSecciones({ ficha }: { ficha: UserFicha }) {
  const { perfil, alumno } = ficha
  return (
    <>
      <Seccion title="Datos personales">
        {perfil ? (
          <dl className="ficha__grid">
            <Item label="Nombre completo">{joinName(perfil)}</Item>
            <Item label="Sexo">{dash(perfil.sexo)}</Item>
            <Item label="Fecha de nacimiento">{dash(perfil.fecha_nacimiento?.slice(0, 10))}</Item>
            <Item label="Teléfono">{dash(perfil.telefono_contacto)}</Item>
            <Item label="Número de identidad">{dash(perfil.numero_identidad)}</Item>
            <Item label="Tipo de documento">{dash(perfil.tipo_documento_identidad)}</Item>
          </dl>
        ) : (
          <p className="texto-muted">Este usuario no tiene perfil de persona.</p>
        )}
      </Seccion>

      {alumno ? (
        <>
          <Seccion title="Salud e historial">
            <dl className="ficha__grid">
              <Item label="Procede de otra institución">{yn(alumno.procede_otra_institucion)}</Item>
              <Item label="Institución de origen">{dash(alumno.nombre_institucion_origen)}</Item>
              <Item label="Religión">{dash(alumno.religion)}</Item>
              <Item label="Cuenta con dispositivo móvil">{yn(alumno.cuenta_dispositivo_movil)}</Item>
              <Item label="Alergias">
                <Chips values={alumno.alergias} />
              </Item>
              <Item label="Condiciones de aprendizaje">
                <Chips values={alumno.condiciones_aprendizaje} />
              </Item>
              <Item label="Deportes / pasatiempos">
                <Chips values={alumno.deportes_pasatiempos} empty="—" />
              </Item>
              <Item label="Convivencia">
                <Chips values={alumno.convivencia} empty="—" />
              </Item>
              <Item label="Grados repetidos">
                {alumno.grados_repetidos.length ? (
                  alumno.grados_repetidos
                    .map((g) => `${g.grado_nombre}${g.anio ? ` (${g.anio})` : ''}`)
                    .join(', ')
                ) : (
                  <span className="texto-muted">Ninguno</span>
                )}
              </Item>
            </dl>
          </Seccion>

          <Seccion title="Responsables">
            {alumno.responsables.length === 0 ? (
              <p className="texto-muted">Sin responsables vinculados.</p>
            ) : (
              <Tabla testId="expediente-responsables">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Parentesco</th>
                    <th>Principal</th>
                    <th>Teléfono</th>
                    <th>Profesión</th>
                  </tr>
                </thead>
                <tbody>
                  {alumno.responsables.map((r) => (
                    <tr key={`${r.user_code}-${r.parentesco}`}>
                      <td>{r.nombre}</td>
                      <td>{dash(r.user_code)}</td>
                      <td>{dash(r.parentesco)}</td>
                      <td>{yn(r.es_principal)}</td>
                      <td>{dash(r.telefono)}</td>
                      <td>{dash(r.profesion)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            )}
          </Seccion>
        </>
      ) : null}
    </>
  )
}

function FichasSeccion({ code }: { code: string }) {
  const fichas = useQuery({
    queryKey: ['disciplina-fichas', code],
    queryFn: () => listFichasAlumno(code),
  })
  return (
    <Seccion title="Fichas disciplinarias" testId="expediente-fichas">
      {fichas.data ? (
        fichas.data.length === 0 ? (
          <p className="texto-muted">Sin fichas disciplinarias.</p>
        ) : (
          <Tabla testId="expediente-fichas-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Nivel</th>
                <th>Castigo</th>
              </tr>
            </thead>
            <tbody>
              {fichas.data.map((f) => (
                <tr key={f.id}>
                  <td>{fechaLarga(f.fecha)}</td>
                  <td>{f.titulo}</td>
                  <td>
                    <span className={`nivel-badge${f.nivel > 1 ? ' nivel-badge--alto' : ''}`}>
                      {ordinal(f.nivel)} nivel
                    </span>
                  </td>
                  <td>{f.castigo}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )
      ) : (
        <Estado cargando={fichas.isLoading} error={fichas.error} que="las fichas" />
      )}
    </Seccion>
  )
}

function MatriculasSeccion({ alumno }: { alumno: NonNullable<UserFicha['alumno']> }) {
  return (
    <Seccion title="Historial de matrícula">
      {alumno.matriculas.length === 0 ? (
        <p className="texto-muted">Sin matrículas registradas.</p>
      ) : (
        <Tabla testId="expediente-matriculas">
          <thead>
            <tr>
              <th>Periodo</th>
              <th>Grado</th>
              <th>Sección</th>
              <th>Modalidad</th>
              <th>Reingreso</th>
              <th>Cursos retrasados</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {alumno.matriculas.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.periodo} ({m.anio_lectivo})
                </td>
                <td>{m.grado}</td>
                <td>{m.seccion}</td>
                <td>{m.modalidad}</td>
                <td>{yn(m.es_reingreso)}</td>
                <td>{(m.cursos_retrasados ?? []).join(', ') || '—'}</td>
                <td>
                  <span className="badge">{m.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Seccion>
  )
}

function RendimientoSecciones({ rend }: { rend: RendimientoAlumno }) {
  const slots = useMemo<SemanaSlot[]>(
    () =>
      rend.materias.flatMap((m) =>
        m.horario.map((b) => ({
          key: `${m.asignacion_id}-${b.dia_semana}-${b.hora_inicio}`,
          dia_semana: b.dia_semana,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
          lines: [m.curso, m.maestro],
        })),
      ),
    [rend.materias],
  )

  if (rend.mensaje)
    return (
      <Seccion title="Materias y notas">
        <p className="texto-muted">{rend.mensaje}</p>
      </Seccion>
    )

  return (
    <>
      <Seccion title="Materias">
        <Tabla testId="expediente-materias">
          <thead>
            <tr>
              <th>Materia</th>
              <th>Maestro</th>
            </tr>
          </thead>
          <tbody>
            {rend.materias.map((m) => (
              <tr key={m.asignacion_id}>
                <td>{m.curso}</td>
                <td>
                  {m.maestro}
                  <span className="texto-muted" style={{ display: 'block', fontSize: '0.78rem' }}>
                    {m.maestro_codigo}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Seccion>

      <Seccion title="Horario de la semana">
        <div className="expediente__tabla">
          <HorarioSemanaGrid
            slots={slots}
            testId="expediente-horario-semana"
            emptyText="Sin horario publicado para esta sección."
          />
        </div>
      </Seccion>

      <Seccion title="Notas por parcial">
        <Tabla testId="expediente-notas">
          <thead>
            <tr>
              <th>Materia</th>
              {rend.parciales.map((p) => (
                <th key={p.numero}>{p.etiqueta}</th>
              ))}
              <th>Promedio</th>
              <th>Nivel</th>
            </tr>
          </thead>
          <tbody>
            {rend.materias.map((m) => (
              <tr key={m.asignacion_id}>
                <td>{m.curso}</td>
                {rend.parciales.map((p, i) => (
                  <td key={p.numero}>{nota(m.notas[i])}</td>
                ))}
                <td>
                  <strong>{nota(m.promedio)}</strong>
                </td>
                <td>
                  <span className="badge">{m.etiqueta}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Seccion>

      <Seccion title="Asistencia del periodo">
        <div className="expediente__cifras">
          <div className="expediente__cifra">
            <span className="expediente__cifra-valor">{porcentaje(rend.asistencia)}</span>
            <span className="expediente__cifra-label">Asistencia</span>
          </div>
          <div className="expediente__cifra">
            <span className="expediente__cifra-valor">{rend.asistencia.total}</span>
            <span className="expediente__cifra-label">Registros</span>
          </div>
          <div className="expediente__cifra">
            <span className="expediente__cifra-valor">{rend.asistencia.tardes}</span>
            <span className="expediente__cifra-label">Llegadas tarde</span>
          </div>
          <div className="expediente__cifra">
            <span className="expediente__cifra-valor">{rend.asistencia.justificadas}</span>
            <span className="expediente__cifra-label">Justificadas</span>
          </div>
          <div className="expediente__cifra">
            <span className="expediente__cifra-valor">{rend.asistencia.injustificadas}</span>
            <span className="expediente__cifra-label">Injustificadas</span>
          </div>
        </div>
        <Tabla testId="expediente-asistencia">
          <thead>
            <tr>
              <th>Materia</th>
              <th>Asistió</th>
              <th>Tarde</th>
              <th>Justificadas</th>
              <th>Injustificadas</th>
              <th>% asistencia</th>
            </tr>
          </thead>
          <tbody>
            {rend.materias.map((m) => (
              <tr key={m.asignacion_id}>
                <td>{m.curso}</td>
                <td>{m.asistencia.presentes}</td>
                <td>{m.asistencia.tardes}</td>
                <td>{m.asistencia.justificadas}</td>
                <td>{m.asistencia.injustificadas}</td>
                <td>{porcentaje(m.asistencia)}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Seccion>
    </>
  )
}
