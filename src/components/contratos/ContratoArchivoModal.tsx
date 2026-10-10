import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Combobox } from '#/components/ui/Combobox'
import { Field } from '#/components/ui/Field'
import { Modal, useDismiss } from '#/components/ui/Modal'
import { userMessageFromError } from '#/lib/api'
import {
  CONTRATO_ACCEPT,
  CONTRATO_MAX_BYTES,
  TIPOS_CONTRATO,
  VISIBILIDADES_CONTRATO,
  buildContratoFormData,
  createContrato,
  tipoContratoLabel,
  updateContrato,
  validarArchivoContrato,
  visibilidadLabel,
} from '#/services/contratos'
import type {
  Contrato,
  TipoContrato,
  VisibilidadContrato,
} from '#/services/contratos'

const TIPO_OPTIONS = TIPOS_CONTRATO.map((t) => ({ value: t, label: tipoContratoLabel(t) }))
const VISIBILIDAD_OPTIONS = VISIBILIDADES_CONTRATO.map((v) => ({
  value: v,
  label: visibilidadLabel(v),
}))

interface Props {
  /** Si viene, es edición de metadatos (con reemplazo de archivo opcional). */
  contrato?: Contrato | null
  onClose: () => void
}

/**
 * Modal de alta/edición de un contrato como archivo (`.docx`/`.pdf`).
 * El archivo es obligatorio al crear y opcional al editar (reemplazo).
 */
export function ContratoArchivoModal({ contrato, onClose }: Props) {
  const qc = useQueryClient()
  const { open, dismiss } = useDismiss(onClose)
  const fileRef = useRef<HTMLInputElement>(null)
  const esEdicion = Boolean(contrato)

  const [titulo, setTitulo] = useState(contrato?.titulo ?? '')
  const [tipo, setTipo] = useState<TipoContrato>(contrato?.tipo ?? 'otros')
  const [visibilidad, setVisibilidad] = useState<VisibilidadContrato>(
    contrato?.visibilidad ?? 'privado',
  )
  const [archivo, setArchivo] = useState<File | null>(null)
  const [archivoError, setArchivoError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => {
      const form = buildContratoFormData({ titulo, tipo, visibilidad, archivo })
      return contrato ? updateContrato(contrato.id, form) : createContrato(form)
    },
    onSuccess: () => {
      toast.success(esEdicion ? 'Contrato actualizado' : 'Contrato creado')
      qc.invalidateQueries({ queryKey: ['contratos'] })
      dismiss()
    },
    onError: (e) => toast.error(userMessageFromError(e)),
  })

  const onPickFile = (file: File | null) => {
    if (!file) {
      setArchivo(null)
      setArchivoError(null)
      return
    }
    const error = validarArchivoContrato(file)
    setArchivoError(error)
    setArchivo(error ? null : file)
    if (error) toast.error(error)
  }

  const guardar = () => {
    if (!titulo.trim()) return
    if (!esEdicion && !archivo) {
      const error = 'Selecciona un archivo .docx o .pdf.'
      setArchivoError(error)
      toast.error(error)
      return
    }
    if (archivo) {
      const error = validarArchivoContrato(archivo)
      if (error) {
        setArchivoError(error)
        toast.error(error)
        return
      }
    }
    mut.mutate()
  }

  const archivoLabel = archivo?.name ?? contrato?.archivo_nombre ?? ''

  return (
    <Modal
      open={open}
      title={esEdicion ? 'Editar contrato' : 'Nuevo contrato'}
      onClose={dismiss}
      wide
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={dismiss} disabled={mut.isPending}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="contrato-guardar"
            disabled={!titulo.trim() || mut.isPending}
            onClick={guardar}
          >
            {mut.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="contrato-modal" data-testid="contrato-add">
        <Field label="Archivo (.docx o .pdf)" htmlFor="contrato-archivo" error={archivoError ?? undefined}>
          <input
            ref={fileRef}
            id="contrato-archivo"
            type="file"
            accept={CONTRATO_ACCEPT}
            className="contrato-modal__file"
            data-testid="contrato-archivo-input"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn btn--ghost btn--sm contrato-modal__file-btn"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={16} aria-hidden />
            {esEdicion ? 'Reemplazar archivo (opcional)' : 'Elegir archivo'}
          </button>
          {archivoLabel ? (
            <span className="contrato-modal__file-name">
              <FileText size={14} aria-hidden />
              {archivoLabel}
            </span>
          ) : null}
          <span className="contrato-modal__hint">
            Word (.docx) o PDF (.pdf), hasta {Math.round(CONTRATO_MAX_BYTES / (1024 * 1024))} MB.
          </span>
        </Field>

        <Field label="Título" htmlFor="contrato-titulo">
          <input
            id="contrato-titulo"
            className="field__input"
            placeholder="Título del contrato"
            value={titulo}
            data-testid="contrato-titulo"
            onChange={(e) => setTitulo(e.target.value)}
          />
        </Field>

        <Field label="Tipo" htmlFor="contrato-tipo">
          <Combobox
            id="contrato-tipo"
            value={tipo}
            onChange={(v) => setTipo(v as TipoContrato)}
            options={TIPO_OPTIONS}
            placeholder="Buscar…"
            data-testid="contrato-tipo"
          />
        </Field>

        <Field label="Visibilidad" htmlFor="contrato-visibilidad">
          <Combobox
            id="contrato-visibilidad"
            value={visibilidad}
            onChange={(v) => setVisibilidad(v as VisibilidadContrato)}
            options={VISIBILIDAD_OPTIONS}
            placeholder="Buscar…"
            data-testid="contrato-visibilidad"
          />
        </Field>
      </div>
    </Modal>
  )
}
