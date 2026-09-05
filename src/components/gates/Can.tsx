import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { roleHasPermission, type Permission } from '#/helpers/permissions'
import { useSession } from '#/hooks/use-session'

const PermContext = createContext<{
  can: (permission: Permission) => boolean
  activeRole: string | null
}>({ can: () => false, activeRole: null })

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const value = useMemo(
    () => ({
      activeRole: session?.activeRole ?? null,
      can: (permission: Permission) => roleHasPermission(session?.activeRole, permission),
    }),
    [session?.activeRole],
  )
  return <PermContext.Provider value={value}>{children}</PermContext.Provider>
}

export function useCan() {
  return useContext(PermContext)
}

/** Oculta hijos si el rol activo no tiene el permiso. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}) {
  const { can } = useCan()
  if (!can(permission)) return <>{fallback}</>
  return <>{children}</>
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: ReactNode
}) {
  const { can } = useCan()
  if (!can(permission)) {
    return (
      <div className="empty-state" role="alert">
        No tienes permiso <code>{permission}</code> con el rol activo.
      </div>
    )
  }
  return <>{children}</>
}
