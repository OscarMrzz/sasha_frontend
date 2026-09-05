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
  modalidad_sace: '',
  calificacion_minima_aprobacion: 60,
  calificacion_honor_merito: 90,
  calificacion_excelencia: 95,
  calificacion_rango_bajo: 50,
  duracion_hora_clase_minutos: 45,
  duracion_periodo_meses: 4,
  cantidad_parciales_por_periodo: 4,
  duracion_parcial_dias: 30,
  duracion_recreo_minutos: 15,
  cantidad_recreos_por_modalidad: 1,
}

function configToForm(c: Configuracion): ConfiguracionUpdate {
  return {
    nombre_institucion: c.nombre_institucion,
    codigo_sace: c.codigo_sace ?? '',
    modalidad_sace: c.modalidad_sace ?? '',
    calificacion_minima_aprobacion: c.calificacion_minima_aprobacion,
    calificacion_honor_merito: c.calificacion_honor_merito,
    calificacion_excelencia: c.calificacion_excelencia,
    calificacion_rango_bajo: c.calificacion_rango_bajo,
    duracion_hora_clase_minutos: c.duracion_hora_clase_minutos,
    duracion_periodo_meses: c.duracion_periodo_meses,
    cantidad_parciales_por_periodo: c.cantidad_parciales_por_periodo,
    duracion_parcial_dias: c.duracion_parcial_dias,
    duracion_recreo_minutos: c.duracion_recreo_minutos,
    cantidad_recreos_por_modalidad: c.cantidad_recreos_por_modalidad,
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

  const setNum = (key: keyof ConfiguracionUpdate, value: string) => {
    setForm((f) => ({ ...f, [key]: value === '' ? undefined : Number(value) }))
    setDirty(true)
  }

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Código SACE" htmlFor="cfg-sace">
            <input
              id="cfg-sace"
              className="field__input"
              value={form.codigo_sace ?? ''}
              onChange={(e) => setStr('codigo_sace', e.target.value)}
            />
          </Field>
          <Field label="Modalidad SACE" htmlFor="cfg-modalidad">
            <input
              id="cfg-modalidad"
              className="field__input"
              value={form.modalidad_sace ?? ''}
              onChange={(e) => setStr('modalidad_sace', e.target.value)}
            />
          </Field>
        </div>
        <h3 className="texto-muted" style={{ fontSize: '0.9rem' }}>
          Calificaciones
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {(
            [
              ['calificacion_minima_aprobacion', 'Mínima aprobación'],
              ['calificacion_honor_merito', 'Honor al mérito'],
              ['calificacion_excelencia', 'Excelencia'],
              ['calificacion_rango_bajo', 'Rango bajo'],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                className="field__input"
                value={form[key] ?? ''}
                onChange={(e) => setNum(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <h3 className="texto-muted" style={{ fontSize: '0.9rem' }}>
          Horarios y periodos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {(
            [
              ['duracion_hora_clase_minutos', 'Duración hora (min)'],
              ['duracion_periodo_meses', 'Duración periodo (meses)'],
              ['cantidad_parciales_por_periodo', 'Parciales por periodo'],
              ['duracion_parcial_dias', 'Duración parcial (días)'],
              ['duracion_recreo_minutos', 'Recreo (min)'],
              ['cantidad_recreos_por_modalidad', 'Recreos por modalidad'],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                className="field__input"
                value={form[key] ?? ''}
                onChange={(e) => setNum(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
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
