import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Camera, KeyRound, Star, User } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { CoordinasAviso } from '#/components/coordinaciones/CoordinasAviso'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { roleLabel } from '#/helpers/permissions'
import { useBovedaImage } from '#/hooks/use-boveda-image'
import { useSession } from '#/hooks/use-session'
import { userMessageFromError } from '#/lib/api'
import { changeOwnPassword } from '#/services/auth'
import { upload } from '#/services/boveda'
import { getMiFicha } from '#/services/personas'
import type { UserFicha } from '#/services/personas'

export const Route = createFileRoute('/_app/mi-perfil')({
  component: MiPerfilPage,
})

type Perfil = NonNullable<UserFicha['perfil']>
type Alumno = NonNullable<UserFicha['alumno']>
type Maestro = NonNullable<UserFicha['maestro']>
type Responsable = NonNullable<UserFicha['responsable']>

const DIAS_CORTO = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const SEXO: Record<string, string> = { M: 'Masculino', F: 'Femenino' }

function nombreCompleto(p: Perfil) {
  return [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ')
}

function fechaLarga(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function edad(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const hoy = new Date()
  let anios = hoy.getFullYear() - y
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) anios--
  return anios
}

function minutos(hhmm: string) {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function MiPerfilPage() {
  const { session, setSession } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [cambiarPwd, setCambiarPwd] = useState(false)
  const fotoSrc = useBovedaImage(session?.fotoKey)
  const ficha = useQuery({ queryKey: ['mi-ficha'], queryFn: getMiFicha })

  const f = ficha.data
  const rol = session?.knownRoles[0]
  const nombre = f?.perfil ? nombreCompleto(f.perfil) : session?.username || session?.code

  async function onPickPhoto(file: File | undefined) {
    if (!file || !session) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5 MB')
      return
    }
    setUploading(true)
    try {
      const res = await upload(file, 'perfil_foto')
      setSession({ ...session, fotoKey: res.object_key })
      toast.success('Foto de perfil actualizada')
    } catch (err) {
      toast.error(userMessageFromError(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="perfil-page" data-testid="mi-perfil-page">
      <aside className="perfil-carnet">
        <div className="perfil-carnet__franja" aria-hidden>
          <span>Sasha</span>
          <span>{rol ? roleLabel(rol) : ''}</span>
        </div>
        <button
          type="button"
          className="perfil-carnet__foto"
          disabled={uploading}
          title={fotoSrc ? 'Cambiar foto (JPG o PNG, máx. 5 MB)' : 'Subir foto (JPG o PNG, máx. 5 MB)'}
          data-testid="perfil-foto-btn"
          onClick={() => fileRef.current?.click()}
        >
          {fotoSrc ? <img src={fotoSrc} alt="Foto de perfil" /> : <User size={44} aria-hidden />}
          <span className="perfil-carnet__foto-accion">
            <Camera size={14} aria-hidden /> {uploading ? 'Subiendo…' : fotoSrc ? 'Cambiar' : 'Subir foto'}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          data-testid="perfil-foto-input"
          onChange={(e) => void onPickPhoto(e.target.files?.[0])}
        />
        <h1 className="perfil-carnet__nombre" data-testid="perfil-nombre">
          {nombre}
        </h1>
        <p className="perfil-carnet__codigo">{session?.code}</p>

        <dl className="perfil-carnet__cuenta">
          <div>
            <dt>Usuario</dt>
            <dd>{session?.username || '—'}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>{rol ? roleLabel(rol) : '—'}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="btn btn--primary perfil-carnet__pwd"
          data-testid="perfil-pwd-abrir"
          onClick={() => setCambiarPwd(true)}
        >
          <KeyRound size={16} aria-hidden /> Cambiar contraseña
        </button>
      </aside>

      <div className="perfil-expediente" data-testid="perfil-expediente">
        {ficha.isPending ? (
          <div className="perfil-bloque perfil-bloque--cargando" aria-busy>
            Cargando sus datos…
          </div>
        ) : ficha.isError ? (
          <div className="perfil-bloque">
            <p className="texto-muted" style={{ margin: 0 }}>
              No se pudieron cargar sus datos. {userMessageFromError(ficha.error)}
            </p>
          </div>
        ) : (
          <>
            <CoordinasAviso />
            <Expediente ficha={f!} />
          </>
        )}
      </div>

      {cambiarPwd ? <CambiarPasswordModal onClose={() => setCambiarPwd(false)} /> : null}
    </div>
  )
}

function Expediente({ ficha }: { ficha: UserFicha }) {
  const bloques: ReactNode[] = []
  if (ficha.perfil) bloques.push(<DatosPersonales key="personal" perfil={ficha.perfil} />)
  if (ficha.alumno) bloques.push(...BloquesAlumno(ficha.alumno))
  if (ficha.maestro) bloques.push(<BloqueMaestro key="maestro" maestro={ficha.maestro} />)
  if (ficha.responsable) bloques.push(...BloquesResponsable(ficha.responsable))

  if (bloques.length === 0) {
    return (
      <div className="perfil-bloque">
        <p className="texto-muted" style={{ margin: 0 }}>
          Su cuenta no tiene datos personales registrados.
        </p>
      </div>
    )
  }
  return (
    <>
      {bloques.map((b, i) => (
        <div key={i} className="perfil-expediente__item" style={{ animationDelay: `${i * 60}ms` }}>
          {b}
        </div>
      ))}
    </>
  )
}

function Bloque({
  titulo,
  testId,
  children,
}: {
  titulo: string
  testId: string
  children: ReactNode
}) {
  return (
    <section className="perfil-bloque" data-testid={testId}>
      <h2 className="perfil-bloque__titulo">{titulo}</h2>
      {children}
    </section>
  )
}

function Dato({ label, children, ancho }: { label: string; children: ReactNode; ancho?: boolean }) {
  return (
    <div className={`perfil-dato${ancho ? ' perfil-dato--ancho' : ''}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Etiquetas({ items, tono }: { items: string[]; tono?: 'alerta' }) {
  return (
    <ul className="perfil-etiquetas">
      {items.map((t) => (
        <li key={t} className={tono ? `perfil-etiqueta perfil-etiqueta--${tono}` : 'perfil-etiqueta'}>
          {t}
        </li>
      ))}
    </ul>
  )
}

function DatosPersonales({ perfil }: { perfil: Perfil }) {
  return (
    <Bloque titulo="Datos personales" testId="perfil-datos-personales">
      <dl className="perfil-datos">
        <Dato label="Nombre completo" ancho>
          {nombreCompleto(perfil)}
        </Dato>
        <Dato label="Identidad">
          {perfil.numero_identidad
            ? `${perfil.tipo_documento_identidad ? `${perfil.tipo_documento_identidad} · ` : ''}${perfil.numero_identidad}`
            : '—'}
        </Dato>
        <Dato label="Fecha de nacimiento">
          {perfil.fecha_nacimiento ? (
            <>
              {fechaLarga(perfil.fecha_nacimiento)}
              <span className="perfil-dato__extra">{edad(perfil.fecha_nacimiento)} años</span>
            </>
          ) : (
            '—'
          )}
        </Dato>
        <Dato label="Sexo">{perfil.sexo ? (SEXO[perfil.sexo] ?? perfil.sexo) : '—'}</Dato>
        <Dato label="Teléfono">{perfil.telefono_contacto || '—'}</Dato>
      </dl>
    </Bloque>
  )
}

function BloquesAlumno(alumno: Alumno): ReactNode[] {
  const actual = alumno.matriculas.find((m) => m.status === 'ACTIVE') ?? alumno.matriculas.at(0)
  const salud = [
    { label: 'Alergias', items: alumno.alergias, tono: 'alerta' as const },
    { label: 'Condiciones de aprendizaje', items: alumno.condiciones_aprendizaje, tono: 'alerta' as const },
    { label: 'Deportes y pasatiempos', items: alumno.deportes_pasatiempos },
    { label: 'Vive con', items: alumno.convivencia },
    { label: 'Dispositivos', items: alumno.dispositivos_moviles },
  ].filter((s) => s.items.length > 0)

  return [
    <Bloque key="matricula" titulo="Matrícula" testId="perfil-matricula">
      {actual ? (
        <>
          <div className="perfil-grado">
            <span className="perfil-grado__valor">{actual.grado}</span>
            <span className="perfil-grado__seccion">Sección {actual.seccion}</span>
          </div>
          <dl className="perfil-datos">
            <Dato label="Jornada">{actual.modalidad || '—'}</Dato>
            <Dato label="Periodo">
              {actual.periodo} · {actual.anio_lectivo}
            </Dato>
            <Dato label="Ingreso">{actual.es_reingreso ? 'Reingreso' : 'Nuevo ingreso'}</Dato>
            {alumno.procede_otra_institucion ? (
              <Dato label="Institución anterior">{alumno.nombre_institucion_origen || '—'}</Dato>
            ) : null}
            {alumno.religion ? <Dato label="Religión">{alumno.religion}</Dato> : null}
          </dl>
        </>
      ) : (
        <p className="texto-muted" style={{ margin: 0 }}>
          Sin matrícula registrada.
        </p>
      )}
    </Bloque>,
    <Bloque key="responsables" titulo="Responsables" testId="perfil-responsables">
      {alumno.responsables.length === 0 ? (
        <p className="texto-muted" style={{ margin: 0 }}>
          Sin responsables registrados.
        </p>
      ) : (
        <ul className="perfil-personas">
          {alumno.responsables.map((r) => (
            <li key={r.user_code ?? r.nombre} className="perfil-persona">
              <span className="perfil-persona__inicial" aria-hidden>
                {r.nombre.charAt(0)}
              </span>
              <div className="perfil-persona__datos">
                <p className="perfil-persona__nombre">
                  {r.nombre}
                  {r.es_principal ? (
                    <span className="perfil-persona__principal">
                      <Star size={11} aria-hidden /> Principal
                    </span>
                  ) : null}
                </p>
                <p className="perfil-persona__meta">
                  {[r.parentesco, r.profesion, r.telefono].filter(Boolean).join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Bloque>,
    ...(salud.length > 0
      ? [
          <Bloque key="salud" titulo="Salud e intereses" testId="perfil-salud">
            <dl className="perfil-datos perfil-datos--lista">
              {salud.map((s) => (
                <Dato key={s.label} label={s.label} ancho>
                  <Etiquetas items={s.items} tono={s.tono} />
                </Dato>
              ))}
            </dl>
          </Bloque>,
        ]
      : []),
  ]
}

function BloqueMaestro({ maestro }: { maestro: Maestro }) {
  const activas = maestro.asignaciones.filter((a) => a.status === 'ACTIVE')
  const porCurso = new Map<string, { grupos: Set<string>; minutos: number; dias: Set<number> }>()
  for (const a of activas) {
    const c = porCurso.get(a.curso) ?? { grupos: new Set<string>(), minutos: 0, dias: new Set<number>() }
    c.grupos.add([a.grado, a.seccion].filter(Boolean).join(' · '))
    for (const h of a.horarios ?? []) {
      c.minutos += minutos(h.hora_fin) - minutos(h.hora_inicio)
      c.dias.add(h.dia_semana)
    }
    porCurso.set(a.curso, c)
  }
  const cursos = [...porCurso.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))
  const totalMin = cursos.reduce((s, [, c]) => s + c.minutos, 0)
  const grupos = cursos.reduce((s, [, c]) => s + c.grupos.size, 0)
  const horas = Math.round((totalMin / 60) * 10) / 10

  return (
    <Bloque titulo="Carga académica" testId="perfil-carga">
      <div className="perfil-cifras">
        <div>
          <span className="perfil-cifras__n">{cursos.length}</span>
          <span className="perfil-cifras__l">{cursos.length === 1 ? 'materia' : 'materias'}</span>
        </div>
        <div>
          <span className="perfil-cifras__n">{grupos}</span>
          <span className="perfil-cifras__l">{grupos === 1 ? 'grupo' : 'grupos'}</span>
        </div>
        <div>
          <span className="perfil-cifras__n">{horas}</span>
          <span className="perfil-cifras__l">horas por semana</span>
        </div>
      </div>
      {cursos.length === 0 ? (
        <p className="texto-muted" style={{ margin: 0 }}>
          Sin materias asignadas en el periodo.
        </p>
      ) : (
        <ul className="perfil-materias">
          {cursos.map(([curso, c]) => (
            <li key={curso} className="perfil-materia">
              <div className="perfil-materia__cabeza">
                <span className="perfil-materia__nombre">{curso}</span>
                {c.dias.size > 0 ? (
                  <span className="perfil-materia__dias">
                    {[...c.dias]
                      .sort((a, b) => a - b)
                      .map((d) => DIAS_CORTO[d] ?? d)
                      .join(' · ')}
                  </span>
                ) : null}
              </div>
              <Etiquetas items={[...c.grupos]} />
            </li>
          ))}
        </ul>
      )}
    </Bloque>
  )
}

function BloquesResponsable(resp: Responsable): ReactNode[] {
  return [
    <Bloque key="hogar" titulo="Hogar y trabajo" testId="perfil-hogar">
      <dl className="perfil-datos">
        <Dato label="Profesión u oficio">{resp.profesion || '—'}</Dato>
        <Dato label="Domicilio" ancho>
          {resp.direccion_domicilio || '—'}
        </Dato>
        {resp.direcciones_trabajo.map((d, i) => (
          <Dato key={i} label={resp.direcciones_trabajo.length > 1 ? `Trabajo ${i + 1}` : 'Trabajo'} ancho>
            {d.direccion}
            {d.telefono_trabajo ? <span className="perfil-dato__extra">Tel. {d.telefono_trabajo}</span> : null}
          </Dato>
        ))}
      </dl>
    </Bloque>,
    <Bloque key="a-cargo" titulo="Alumnos a cargo" testId="perfil-a-cargo">
      {resp.alumnos_a_cargo.length === 0 ? (
        <p className="texto-muted" style={{ margin: 0 }}>
          Sin alumnos vinculados.
        </p>
      ) : (
        <ul className="perfil-personas">
          {resp.alumnos_a_cargo.map((a) => (
            <li key={a.user_code ?? a.nombre} className="perfil-persona">
              <span className="perfil-persona__inicial" aria-hidden>
                {a.nombre.charAt(0)}
              </span>
              <div className="perfil-persona__datos">
                <p className="perfil-persona__nombre">{a.nombre}</p>
                <p className="perfil-persona__meta">
                  {[a.parentesco, a.user_code ? `Código ${a.user_code}` : null].filter(Boolean).join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Bloque>,
  ]
}

function CambiarPasswordModal({ onClose }: { onClose: () => void }) {
  const { open, dismiss } = useDismiss(onClose)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function onSave() {
    const next: Record<string, string> = {}
    if (!currentPassword) next.current = 'Obligatoria'
    if (!newPassword) next.next = 'Obligatoria'
    else if (newPassword.length < 8) next.next = 'Mínimo 8 caracteres'
    if (newPassword !== confirmPassword) next.confirm = 'No coincide'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      await changeOwnPassword(currentPassword, newPassword)
      toast.success('Contraseña actualizada')
      dismiss()
    } catch (err) {
      toast.error(userMessageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Cambiar contraseña"
      onClose={dismiss}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            data-testid="perfil-pwd-save"
            onClick={() => void onSave()}
          >
            {saving ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </>
      }
    >
      <form
        className="perfil-form"
        onSubmit={(e) => {
          e.preventDefault()
          void onSave()
        }}
      >
        <Field label="Contraseña actual" error={errors.current} htmlFor="pwd-current">
          <input
            id="pwd-current"
            type="password"
            className="field__input"
            autoComplete="current-password"
            autoFocus
            data-testid="perfil-pwd-current"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field label="Nueva contraseña" error={errors.next} htmlFor="pwd-new">
          <input
            id="pwd-new"
            type="password"
            className="field__input"
            autoComplete="new-password"
            data-testid="perfil-pwd-new"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirmar nueva" error={errors.confirm} htmlFor="pwd-confirm">
          <input
            id="pwd-confirm"
            type="password"
            className="field__input"
            autoComplete="new-password"
            data-testid="perfil-pwd-confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
