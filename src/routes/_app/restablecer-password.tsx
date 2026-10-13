import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { RequirePermission, Can } from '#/components/gates/Can'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { Field } from '#/components/ui/Field'
import { userMessageFromError } from '#/lib/api'
import { roleLabel } from '#/helpers/permissions'
import { getCredencial, resetPassword } from '#/services/users'
import type { CredencialInfo } from '#/services/users'

export const Route = createFileRoute('/_app/restablecer-password')({
  component: RestablecerPasswordPage,
})

function RestablecerPasswordPage() {
  const [code, setCode] = useState('')
  const [info, setInfo] = useState<CredencialInfo | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const buscarMut = useMutation({
    mutationFn: (c: string) => getCredencial(c),
    onSuccess: (data) => setInfo(data),
    onError: (e) => {
      setInfo(null)
      toast.error(userMessageFromError(e))
    },
  })

  const resetMut = useMutation({
    mutationFn: (c: string) => resetPassword(c),
    onSuccess: (blob, c) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `credenciales-${c}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setConfirmOpen(false)
      toast.success(
        'Contraseña restablecida. Entregue el PDF al usuario y pídale cambiarla al entrar.',
      )
    },
    onError: (e) => {
      setConfirmOpen(false)
      toast.error(userMessageFromError(e))
    },
  })

  const onBuscar = (e: FormEvent) => {
    e.preventDefault()
    const c = code.trim()
    if (!c) {
      toast.error('Escribe el código de usuario')
      return
    }
    buscarMut.mutate(c)
  }

  return (
    <RequirePermission permission="credenciales:get">
      <h1 className="page-title">Restablecer credenciales</h1>

      <div
        style={{
          maxWidth: 640,
          background: 'var(--sasha-bg-muted)',
          borderRadius: '8px',
          padding: '1.25rem',
        }}
      >
        <form onSubmit={onBuscar}>
          <Field label="Código de usuario" htmlFor="reset-code">
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="reset-code"
                className="field__input"
                data-testid="reset-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej. 1002026501"
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn btn--primary"
                data-testid="reset-buscar"
                disabled={buscarMut.isPending}
              >
                {buscarMut.isPending ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          </Field>
        </form>

        {info ? (
          <div data-testid="reset-ficha" style={{ marginTop: '1.25rem' }}>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: '150px 1fr',
                rowGap: '0.4rem',
                margin: '0 0 1rem',
              }}
            >
              <dt className="texto-muted">Nombre</dt>
              <dd style={{ margin: 0 }} data-testid="reset-nombre">
                {info.nombre_completo}
              </dd>
              <dt className="texto-muted">Código</dt>
              <dd style={{ margin: 0 }}>{info.code}</dd>
              <dt className="texto-muted">Username</dt>
              <dd style={{ margin: 0 }}>{info.username}</dd>
              <dt className="texto-muted">Rol</dt>
              <dd style={{ margin: 0 }}>
                {info.roles.map((r) => roleLabel(r)).join(', ') || '—'}
              </dd>
              <dt className="texto-muted">Estado</dt>
              <dd style={{ margin: 0 }}>
                <span className="badge">{info.statususer}</span>
              </dd>
            </dl>

            <Can permission="credenciales:post">
              <button
                type="button"
                className="btn btn--primary"
                data-testid="reset-generar"
                disabled={resetMut.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                {resetMut.isPending ? 'Generando…' : 'Generar nueva contraseña'}
              </button>
            </Can>
            <p className="texto-muted" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
              Se descargará un PDF con el mismo código y la contraseña nueva. Recomienda al usuario
              entrar y cambiarla.
            </p>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Generar nueva contraseña"
        message={`¿Restablecer la contraseña de ${info?.nombre_completo ?? code.trim()}? La contraseña anterior dejará de funcionar.`}
        confirmLabel="Generar y descargar"
        confirmDisabled={resetMut.isPending}
        onConfirm={() => resetMut.mutate(info?.code ?? code.trim())}
        onCancel={() => setConfirmOpen(false)}
      />
    </RequirePermission>
  )
}
