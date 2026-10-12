import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { userMessageFromError } from '#/lib/api'
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
}

function configToForm(c: Configuracion): ConfiguracionUpdate {
  return {
    nombre_institucion: c.nombre_institucion,
    codigo_sace: c.codigo_sace ?? '',
    logo_app_key: c.logo_app_key,
    logo_institucion_key: c.logo_institucion_key,
  }
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
