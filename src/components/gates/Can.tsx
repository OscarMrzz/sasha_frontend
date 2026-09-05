import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { rolesHavePermission, type Permission } from '#/helpers/permissions'
import { useSession } from '#/hooks/use-session'

const PermContext = createContext<{
  can: (permission: Permission) => boolean
  roles: string[]
}>({ can: () => false, roles: [] })

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const value = useMemo(
    () => ({
      roles: session?.knownRoles ?? [],
      can: (permission: Permission) => rolesHavePermission(session?.knownRoles, permission),
    }),
    [session?.knownRoles],
  )
  return <PermContext.Provider value={value}>{children}</PermContext.Provider>
}

export function useCan() {
  return useContext(PermContext)
}

/** Oculta hijos si ningún rol de la sesión tiene el permiso. */
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
        No tienes permiso <code>{permission}</code>.
      </div>
    )
  }
  return <>{children}</>
}
