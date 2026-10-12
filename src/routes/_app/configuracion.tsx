import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { useBovedaImage } from '#/hooks/use-boveda-image'
import { userMessageFromError } from '#/lib/api'
import { upload, type BovedaTipo } from '#/services/boveda'
import {
  getConfiguracion,
  updateConfiguracion,
  type Configuracion,
  type ConfiguracionUpdate,
} from '#/services/configuracion'

export const Route = createFileRoute('/_app/configuracion')({ component: ConfiguracionPage })

const emptyForm: ConfiguracionUpdate = {
  nombre_institucion: '',
  codigo_sace: '',
  mensaje_login: '',
  logo_institucion_key: '',
  login_fondo_key: '',
}

function configToForm(c: Configuracion): ConfiguracionUpdate {
  return {
    nombre_institucion: c.nombre_institucion,
    codigo_sace: c.codigo_sace ?? '',
    mensaje_login: c.mensaje_login ?? '',
    logo_app_key: c.logo_app_key,
    logo_institucion_key: c.logo_institucion_key ?? '',
    login_fondo_key: c.login_fondo_key ?? '',
  }
}

/** Sube una imagen a la bóveda y devuelve su object_key. */
function ImagenField({
  label,
  tipo,
  value,
  onChange,
  testid,
  altura,
}: {
  label: string
  tipo: BovedaTipo
  value: string
  onChange: (key: string) => void
  testid: string
  altura?: number
}) {
  const src = useBovedaImage(value || undefined)
  const [busy, setBusy] = useState(false)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const r = await upload(file, tipo)
      onChange(r.object_key)
      toast.success('Imagen subida')
    } catch (err) {
      toast.error(userMessageFromError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="imagen-field" data-testid={testid}>
      <span className="field__label">{label}</span>
      <div className="imagen-field__preview" style={{ height: altura ?? 120 }}>
        {src ? (
          <img src={src} alt="" />
        ) : (
          <span className="imagen-field__vacio">Sin imagen</span>
        )}
      </div>
      <div className="imagen-field__acciones">
        <label className="btn btn--ghost btn--sm">
          {busy ? 'Subiendo…' : value ? 'Cambiar' : 'Subir'}
          <input type="file" accept="image/*" hidden onChange={onFile} disabled={busy} data-testid={`${testid}-input`} />
        </label>
        {value ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onChange('')}
            data-testid={`${testid}-quitar`}
          >
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  )
}

function ConfiguracionPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['configuracion'], queryFn: getConfiguracion })
  const [form, setForm] = useState<ConfiguracionUpdate>(emptyForm)
  const [dirty, setDirty] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  useEffect(() => {
    if (data) {
      setForm(configToForm(data))
      setDirty(false)
    }
  }, [data])

  const saveMut = useMutation({
    mutationFn: (body: ConfiguracionUpdate) => updateConfiguracion(body),
    onSuccess: () => {
      toast.success('Configuración guardada')
      qc.invalidateQueries({ queryKey: ['configuracion'] })
      setDirty(false)
      setConfirmSave(false)
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const setStr = (key: keyof ConfiguracionUpdate, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }

  const handleCancel = () => {
    if (data) setForm(configToForm(data))
    setDirty(false)
    setConfirmCancel(false)
  }

  if (isLoading) return <div className="empty-state">Cargando configuración…</div>

  return (
    <RequirePermission permission="configuracion:get">
      <h1 className="page-title">Configuración institucional</h1>
      <p className="texto-muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem', maxWidth: 720 }}>
        Datos de la institución. Los umbrales de calificación (mínima aprobación, honor al mérito y excelencia) se
        definen en cada <strong>periodo</strong> y el programa académico SACE en cada <strong>grado</strong> del
        catálogo.
      </p>
      <form
        className="panel-form"
        style={{ maxWidth: 720 }}
        onSubmit={(e) => {
          e.preventDefault()
          setConfirmSave(true)
        }}
      >
        <Field label="Nombre de la institución" htmlFor="cfg-nombre">
          <input
            id="cfg-nombre"
            className="field__input"
            data-testid="config-nombre-input"
            value={form.nombre_institucion ?? ''}
            onChange={(e) => setStr('nombre_institucion', e.target.value)}
          />
        </Field>
        <Field label="Código SACE institucional" htmlFor="cfg-sace">
          <input
            id="cfg-sace"
            className="field__input"
            value={form.codigo_sace ?? ''}
            onChange={(e) => setStr('codigo_sace', e.target.value)}
          />
        </Field>
        <Field label="Mensaje de bienvenida (pantalla de login)" htmlFor="cfg-mensaje">
          <textarea
            id="cfg-mensaje"
            className="field__textarea"
            rows={3}
            data-testid="config-mensaje-login"
            placeholder="Ej. ¡Bienvenido a nuestra institución!"
            value={form.mensaje_login ?? ''}
            onChange={(e) => setStr('mensaje_login', e.target.value)}
          />
        </Field>
        <fieldset className="periodo-reglas" data-testid="config-imagenes">
          <legend className="periodo-reglas__titulo">Imágenes</legend>
          <div className="imagen-field-grid">
            <ImagenField
              label="Logo de la institución"
              tipo="logo_institucion"
              value={form.logo_institucion_key ?? ''}
              onChange={(v) => {
                setForm((f) => ({ ...f, logo_institucion_key: v }))
                setDirty(true)
              }}
              testid="config-logo"
              altura={140}
            />
            <ImagenField
              label="Fondo de la pantalla de login"
              tipo="login_fondo"
              value={form.login_fondo_key ?? ''}
              onChange={(v) => {
                setForm((f) => ({ ...f, login_fondo_key: v }))
                setDirty(true)
              }}
              testid="config-fondo"
              altura={140}
            />
          </div>
          <p className="texto-muted" style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            El logo se muestra centrado en el login; el fondo es la imagen de la tarjeta del login. Los cambios se
            guardan con «Guardar cambios».
          </p>
        </fieldset>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!dirty}
            onClick={() => (dirty ? setConfirmCancel(true) : handleCancel())}
          >
            Cancelar
          </button>
          <Can permission="configuracion:put">
            <button type="submit" className="btn btn--primary" data-testid="config-save-button" disabled={!dirty}>
              Guardar cambios
            </button>
          </Can>
        </div>
      </form>

      <ConfirmDialog
        open={confirmSave}
        title="Guardar configuración"
        message="¿Confirmas guardar los cambios en la configuración institucional?"
        onConfirm={() => saveMut.mutate(form)}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        open={confirmCancel}
        title="Descartar cambios"
        message="¿Descartar los cambios sin guardar?"
        danger
        confirmLabel="Descartar"
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </RequirePermission>
  )
}
