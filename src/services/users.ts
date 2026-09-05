import { apiRequest } from '#/lib/api'

export interface CreateUserRequest {
  username?: string
  password?: string
  roles: string[]
  statususer: string
  primer_nombre: string
  segundo_nombre?: string
  primer_apellido: string
  segundo_apellido?: string
}

export interface CreateUserResult {
  code: string
  pdfBlob: Blob
}

export interface ResponseUser {
  code: string
  username: string
  roles: string[]
  statususer: string
  statusrol: string
  message?: string
}

export interface PermisoUsuario {
  id?: string
  resource: string
  action: string
  permitido: boolean
}

export async function createUser(body: CreateUserRequest): Promise<CreateUserResult> {
  const res = await apiRequest<Response>('/users/', { method: 'POST', body, raw: true })
  const code = res.headers.get('X-User-Code') ?? ''
  const pdfBlob = await res.blob()
  return { code, pdfBlob }
}

export async function updateRoles(code: string, roles: string[]) {
  return apiRequest<ResponseUser>(`/users/${code}/roles`, {
    method: 'PUT',
    body: { roles },
  })
}

export async function updateStatus(code: string, statususer: string) {
  return apiRequest<ResponseUser>(`/users/${code}/status`, {
    method: 'PUT',
    body: { statususer },
  })
}

export async function setPassword(code: string, newPassword: string) {
  return apiRequest<{ message: string; status: string }>(`/users/${code}/password`, {
    method: 'PUT',
    body: { new_password: newPassword },
  })
}

export async function listPermisos(code: string) {
  return apiRequest<PermisoUsuario[]>(`/users/${code}/permisos`)
}

export async function upsertPermisos(code: string, permisos: PermisoUsuario[]) {
  return apiRequest<PermisoUsuario[]>(`/users/${code}/permisos`, {
    method: 'PUT',
    body: { permisos },
  })
}

export async function softDelete(code: string) {
  return apiRequest<{ message: string; status: string }>(`/users/${code}`, { method: 'DELETE' })
}
