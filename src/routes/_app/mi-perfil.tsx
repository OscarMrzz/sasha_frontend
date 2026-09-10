import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Field } from '#/components/ui/Field'
import { useSession } from '#/hooks/use-session'
import { userMessageFromError } from '#/lib/api'
import { changeOwnPassword } from '#/services/auth'
import { upload } from '#/services/boveda'
import { useBovedaImage } from '#/hooks/use-boveda-image'

export const Route = createFileRoute('/_app/mi-perfil')({
  component: MiPerfilPage,
})

function MiPerfilPage() {
  const { session, setSession } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({})
  const [savingPwd, setSavingPwd] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fotoSrc = useBovedaImage(session?.fotoKey)

  async function onSavePassword() {
    const next: Record<string, string> = {}
    if (!currentPassword) next.current = 'Obligatoria'
    if (!newPassword) next.next = 'Obligatoria'
    else if (newPassword.length < 8) next.next = 'Mínimo 8 caracteres'
    if (newPassword !== confirmPassword) next.confirm = 'No coincide'
    setPwdErrors(next)
    if (Object.keys(next).length) return

    setSavingPwd(true)
    try {
      await changeOwnPassword(currentPassword, newPassword)
      toast.success('Contraseña actualizada')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwdErrors({})
    } catch (err) {
      toast.error(userMessageFromError(err))
    } finally {
      setSavingPwd(false)
    }
  }

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
      <h1 className="page-title">Mi perfil</h1>
      <p className="texto-muted" style={{ marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
        Código {session?.code}
        {session?.username ? ` · ${session.username}` : ''}
      </p>

      <section className="perfil-section">
        <h2 className="perfil-section__title">Foto de perfil</h2>
        <div className="perfil-foto">
          <div className="perfil-foto__preview" aria-hidden>
            {fotoSrc ? (
              <img src={fotoSrc} alt="" className="perfil-foto__img" />
            ) : (
              <span className="perfil-foto__placeholder">Sin foto</span>
            )}
          </div>
          <div className="perfil-foto__actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              data-testid="perfil-foto-input"
              onChange={(e) => void onPickPhoto(e.target.files?.[0])}
            />
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={uploading}
              data-testid="perfil-foto-btn"
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Subiendo…' : fotoSrc ? 'Cambiar foto' : 'Subir foto'}
            </button>
            <p className="texto-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
              JPG o PNG, máximo 5 MB.
            </p>
          </div>
        </div>
      </section>

      <section className="perfil-section">
        <h2 className="perfil-section__title">Cambiar contraseña</h2>
        <div className="perfil-form">
          <Field label="Contraseña actual" error={pwdErrors.current} htmlFor="pwd-current">
            <input
              id="pwd-current"
              type="password"
              className="field__input"
              autoComplete="current-password"
              data-testid="perfil-pwd-current"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="Nueva contraseña" error={pwdErrors.next} htmlFor="pwd-new">
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
          <Field label="Confirmar nueva" error={pwdErrors.confirm} htmlFor="pwd-confirm">
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
          <button
            type="button"
            className="btn btn--primary"
            disabled={savingPwd}
            data-testid="perfil-pwd-save"
            onClick={() => void onSavePassword()}
          >
            {savingPwd ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </div>
      </section>
    </div>
  )
}
