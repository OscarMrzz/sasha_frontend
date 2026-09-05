import { z } from 'zod'
import { apiRequest } from '#/lib/api'

export const loginSchema = z.object({
  user: z.string().min(1, 'El código es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export const loginResponseSchema = z.object({
  message: z.string(),
  status: z.string(),
  code: z.string(),
  username: z.string(),
  roles: z.array(z.string()).min(1),
})

export type LoginInput = z.infer<typeof loginSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>

export async function login(input: LoginInput): Promise<LoginResponse> {
  const body = loginSchema.parse(input)
  const data = await apiRequest<LoginResponse>('/login/', {
    method: 'POST',
    body,
    activeRoles: null,
  })
  return loginResponseSchema.parse(data)
}

export async function logout() {
  return apiRequest('/logout/', { method: 'POST', activeRoles: null })
}

export async function healthCheck() {
  return apiRequest<{ status: string }>('/health', { activeRoles: null })
}
