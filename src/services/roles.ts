import { apiRequest } from '#/lib/api'

export type RoleStatus = 'ACTIVE' | 'INACTIVE'

export interface RoleItem {
  name: string
  status: RoleStatus | string
}

export async function listRoles() {
  return apiRequest<RoleItem[]>('/roles/')
}

export async function updateRoleStatus(name: string, status: RoleStatus) {
  return apiRequest<RoleItem>(`/roles/${encodeURIComponent(name)}/status`, {
    method: 'PUT',
    body: { status },
  })
}
