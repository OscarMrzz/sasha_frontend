import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { Modal } from '#/components/ui/Modal'
import { FichaClaseActual } from '#/components/usuarios/FichaClaseActual'
import { FichaHorarioSemanaModal } from '#/components/usuarios/FichaHorarioSemanaModal'
import { FichaPlanPeriodoModal } from '#/components/usuarios/FichaPlanPeriodoModal'
import { FichaTareasModal } from '#/components/usuarios/FichaTareasModal'
import { roleLabel } from '#/helpers/permissions'
import { useBovedaImage } from '#/hooks/use-boveda-image'
import { userMessageFromError } from '#/lib/api'
import { downloadFichaPdf } from '#/lib/fichaPdf'
import {
  getFicha,
  labelAsistencia,
  localConsulta,
  type FichaOperativo,
  type UserFicha,
} from '#/services/personas'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const yn = (v: boolean) => (v ? 'Sí' : 'No')
const dash = (v?: string | number | null) => (v === undefined || v === null || v === '' ? '—' : String(v))

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ficha__section">
      <h3 className="ficha__section-title">{title}</h3>
      {children}
    </section>
  )
}

type Props = {
  code: string | null
  onClose: () => void
}

export function UserFichaModal({ code, onClose }: Props) {
  const consulta = useMemo(() => localConsulta(), [code])
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['user-ficha', code, consulta.fecha, consulta.hora],
    queryFn: () => getFicha(code!, consulta),
    enabled: Boolean(code),
  })
  const photo = useBovedaImage(data?.perfil?.path_imagen)
  const nombre = joinName(data?.perfil) || data?.user.username || code || ''

  return (
    <Modal
      open={Boolean(code)}
      title={nombre ? `Ficha · ${nombre}` : 'Ficha de usuario'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="ficha-download-pdf"
            disabled={!data}
            onClick={() => data && downloadFichaPdf(data)}
          >
            Descargar PDF
          </button>
        </>
      }
    >
      {isLoading ? <div className="empty-state">Cargando ficha…</div> : null}
      {isError ? (
        <div className="empty-state" role="alert">
          No se pudo cargar la ficha: {userMessageFromError(error)}
        </div>
      ) : null}
      {data ? <FichaBody ficha={data} photo={photo} /> : null}
    </Modal>
  )
}

function OperativoSections({
  operativo,
  isMaestro,
  isAlumno,
}: {
  operativo: FichaOperativo
  isMaestro: boolean
  isAlumno: boolean
}) {
  const [semanaOpen, setSemanaOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [tareasOpen, setTareasOpen] = useState(false)

  return (
    <>
      <FichaClaseActual
        hora={operativo.consulta.hora}
        slots={operativo.clase_actual}
        mensaje={operativo.mensaje}
      />

      {(isMaestro || isAlumno) && (
        <Section title={`Horario de hoy · ${DIAS[operativo.consulta.dia_semana] ?? ''}`}>
          {operativo.horario_dia.length === 0 ? (
            <p className="texto-muted">{operativo.mensaje || 'Sin clases programadas para hoy.'}</p>
          ) : (
            <table className="ficha-table" data-testid="ficha-horario-dia">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Curso</th>
                  <th>Grado / sección</th>
                  {isAlumno ? <th>Maestro</th> : null}
                  {isAlumno ? <th>Asistencia</th> : null}
                </tr>
              </thead>
              <tbody>
                {operativo.horario_dia.map((s) => (
                  <tr key={`${s.asignacion_docente_id}-${s.hora_inicio}`}>
                    <td>
                      {s.hora_inicio}–{s.hora_fin}
                    </td>
                    <td>{s.curso_nombre}</td>
                    <td>
                      {s.grado_nombre} sec {s.seccion_nombre}
                    </td>
                    {isAlumno ? <td>{s.maestro_nombre}</td> : null}
                    {isAlumno ? (
                      <td>
                        <span className="badge">
                          {s.asistencia_nombre || labelAsistencia(s.asistencia_codigo)}
                        </span>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ marginTop: '0.65rem' }}
            data-testid="ficha-ver-horario-semana"
            onClick={() => setSemanaOpen(true)}
          >
            Ver todo
          </button>
        </Section>
      )}

      {isMaestro ? (
        <Section title="Plan de estudio · hoy">
          {(operativo.plan_dia ?? []).length === 0 ? (
            <p className="texto-muted">Nada programado en el plan para hoy.</p>
          ) : (
            <table className="ficha-table" data-testid="ficha-plan-dia">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Curso</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(operativo.plan_dia ?? []).map((it) => (
                  <tr key={it.id}>
                    <td>{it.titulo}</td>
                    <td>{it.curso_nombre || '—'}</td>
                    <td>{it.tipo_item}</td>
                    <td>
                      <span className="badge">{it.estado_cumplimiento}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ marginTop: '0.65rem' }}
            data-testid="ficha-ver-plan-periodo"
            onClick={() => setPlanOpen(true)}
          >
            Ver todo
          </button>
        </Section>
      ) : null}

      {isAlumno ? (
        <Section title="Tareas · hoy">
          {(operativo.tareas_hoy ?? []).length === 0 ? (
            <p className="texto-muted">No hay tareas con entrega hoy.</p>
          ) : (
            <table className="ficha-table" data-testid="ficha-tareas-hoy">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Curso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(operativo.tareas_hoy ?? []).map((t) => (
                  <tr key={t.tarea_id}>
                    <td>{t.titulo}</td>
                    <td>{t.curso_nombre || '—'}</td>
                    <td>
                      <span className="badge">{t.entregado ? 'Entregada' : 'Pendiente'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ marginTop: '0.65rem' }}
            data-testid="ficha-ver-tareas"
            onClick={() => setTareasOpen(true)}
          >
            Ver todo
          </button>
        </Section>
      ) : null}

      <FichaHorarioSemanaModal
        open={semanaOpen}
        title="Horario de la semana"
        slots={operativo.horario_semana}
        mode={isMaestro ? 'maestro' : 'alumno'}
        onClose={() => setSemanaOpen(false)}
      />
      <FichaPlanPeriodoModal
        open={planOpen}
        parciales={operativo.plan_periodo ?? []}
        onClose={() => setPlanOpen(false)}
      />
      <FichaTareasModal
        open={tareasOpen}
        tareas={operativo.tareas_proximas ?? []}
        fechaHoy={operativo.consulta.fecha}
        onClose={() => setTareasOpen(false)}
      />
    </>
  )
}

function FichaBody({ ficha, photo }: { ficha: UserFicha; photo: string | null }) {
  const { user, perfil, alumno, maestro, responsable, operativo } = ficha
  return (
    <div className="ficha" data-testid="user-ficha">
      <div className="ficha__hero">
        {photo ? (
          <img className="ficha__photo" src={photo} alt={`Foto de ${joinName(perfil) || user.username}`} />
        ) : perfil?.path_imagen ? (
          <div className="ficha__photo ficha__photo--placeholder">Sin foto</div>
        ) : (
          <div className="ficha__photo ficha__photo--placeholder">
            {(joinName(perfil) || user.username).slice(0, 1)}
          </div>
        )}
        <div>
          <p className="ficha__name">{joinName(perfil) || user.username}</p>
          <p className="texto-muted" style={{ margin: '0.2rem 0 0.6rem' }}>
            {user.code} · {user.username}
          </p>
          <span className="ficha__chips">
            {user.roles.map((r) => (
              <span key={r} className="badge">
                {roleLabel(r)}
              </span>
            ))}
            <span className="badge">{user.statususer}</span>
          </span>
        </div>
      </div>

      {operativo ? (
        <OperativoSections
          operativo={operativo}
          isMaestro={Boolean(maestro)}
          isAlumno={Boolean(alumno)}
        />
      ) : null}

      {perfil ? (
        <Section title="Datos personales">
          <dl className="ficha__grid">
            <Item label="Nombre completo">{joinName(perfil)}</Item>
            <Item label="Sexo">{dash(perfil.sexo)}</Item>
            <Item label="Fecha de nacimiento">{dash(perfil.fecha_nacimiento?.slice(0, 10))}</Item>
            <Item label="Teléfono">{dash(perfil.telefono_contacto)}</Item>
            <Item label="Número de identidad">{dash(perfil.numero_identidad)}</Item>
            <Item label="Tipo de documento">{dash(perfil.tipo_documento_identidad)}</Item>
          </dl>
        </Section>
      ) : (
        <p className="texto-muted">Este usuario no tiene perfil de persona.</p>
      )}

      {alumno ? (
        <>
          <Section title="Alumno · historial de matrícula">
            <dl className="ficha__grid">
              <Item label="Procede de otra institución">{yn(alumno.procede_otra_institucion)}</Item>
              <Item label="Institución de origen">{dash(alumno.nombre_institucion_origen)}</Item>
              <Item label="Religión">{dash(alumno.religion)}</Item>
              <Item label="Condición de aprendizaje">{yn(alumno.presenta_condicion_aprendizaje)}</Item>
              <Item label="Cuenta con dispositivo móvil">{yn(alumno.cuenta_dispositivo_movil)}</Item>
              <Item label="Ha repetido grado">{yn(alumno.ha_repetido_grado)}</Item>
              <Item label="Alergias">
                <Chips values={alumno.alergias} />
              </Item>
              <Item label="Condiciones de aprendizaje">
                <Chips values={alumno.condiciones_aprendizaje} />
              </Item>
              <Item label="Deportes / pasatiempos">
                <Chips values={alumno.deportes_pasatiempos} empty="—" />
              </Item>
              <Item label="Dispositivos móviles">
                <Chips values={alumno.dispositivos_moviles} empty="—" />
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
          </Section>

          <Section title="Matrículas">
            {alumno.matriculas.length === 0 ? (
              <p className="texto-muted">Sin matrículas registradas.</p>
            ) : (
              <table className="ficha-table">
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
              </table>
            )}
          </Section>

          <Section title="Responsables">
            {alumno.responsables.length === 0 ? (
              <p className="texto-muted">Sin responsables vinculados.</p>
            ) : (
              <table className="ficha-table">
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
              </table>
            )}
          </Section>

          {alumno.documentos.length ? (
            <Section title="Documentos de matrícula">
              <table className="ficha-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Observaciones</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {alumno.documentos.map((d, i) => (
                    <tr key={`${d.tipo}-${i}`}>
                      <td>{d.tipo}</td>
                      <td>{dash(d.observaciones)}</td>
                      <td>
                        <span className="badge">{d.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          ) : null}
        </>
      ) : null}

      {maestro ? (
        <>
          <Section title="Maestro · asignaciones">
            {maestro.asignaciones.length === 0 ? (
              <p className="texto-muted">Sin asignaciones docentes.</p>
            ) : (
              <table className="ficha-table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Sección</th>
                    <th>Periodo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {maestro.asignaciones.map((as, i) => (
                    <tr key={`${as.curso}-${as.seccion}-${as.periodo}-${i}`}>
                      <td>{as.curso}</td>
                      <td>{as.seccion}</td>
                      <td>{as.periodo}</td>
                      <td>
                        <span className="badge">{as.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
          {maestro.disponibilidad.length ? (
            <Section title="Disponibilidad">
              <table className="ficha-table">
                <thead>
                  <tr>
                    <th>Modalidad</th>
                    <th>Día</th>
                    <th>Horario</th>
                    <th>Disponible</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {maestro.disponibilidad.map((d, i) => (
                    <tr key={i}>
                      <td>{dash(d.modalidad)}</td>
                      <td>{d.dia_semana ? DIAS[d.dia_semana] ?? d.dia_semana : '—'}</td>
                      <td>
                        {d.hora_inicio || d.hora_fin
                          ? `${dash(d.hora_inicio?.slice(0, 5))} – ${dash(d.hora_fin?.slice(0, 5))}`
                          : '—'}
                      </td>
                      <td>{yn(d.es_disponible)}</td>
                      <td>{dash(d.motivo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          ) : null}
        </>
      ) : null}

      {responsable ? (
        <>
          <Section title="Responsable">
            <dl className="ficha__grid">
              <Item label="Profesión">{dash(responsable.profesion)}</Item>
              <Item label="Domicilio">{dash(responsable.direccion_domicilio)}</Item>
            </dl>
            {responsable.direcciones_trabajo.length ? (
              <table className="ficha-table" style={{ marginTop: '0.75rem' }}>
                <thead>
                  <tr>
                    <th>Dirección de trabajo</th>
                    <th>Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {responsable.direcciones_trabajo.map((d, i) => (
                    <tr key={i}>
                      <td>{d.direccion}</td>
                      <td>{dash(d.telefono_trabajo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Section>
          <Section title="Alumnos a cargo">
            {responsable.alumnos_a_cargo.length === 0 ? (
              <p className="texto-muted">Sin alumnos vinculados.</p>
            ) : (
              <table className="ficha-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Parentesco</th>
                  </tr>
                </thead>
                <tbody>
                  {responsable.alumnos_a_cargo.map((al) => (
                    <tr key={al.user_code ?? al.nombre}>
                      <td>{al.nombre}</td>
                      <td>{dash(al.user_code)}</td>
                      <td>{dash(al.parentesco)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </>
      ) : null}
    </div>
  )
}
