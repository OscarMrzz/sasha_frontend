import { z } from 'zod'

export const apiErrorSchema = z.object({
  message: z.string().optional(),
  code: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
})

export class ApiError extends Error {
  status: number
  code?: string | number
  body?: unknown

  constructor(message: string, status: number, code?: string | number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.body = body
  }
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || '/api'
}

type RequestOptions = {
  method?: string
  body?: unknown
  /** Roles a enviar en X-Active-Role (coma-separados). null = no header (login/health). */
  activeRoles?: string[] | null
  headers?: Record<string, string>
  raw?: boolean
  signal?: AbortSignal
}

let sessionRolesGetter: () => string[] = () => []

export function setSessionRolesGetter(fn: () => string[]) {
  sessionRolesGetter = fn
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, activeRoles, headers = {}, raw = false, signal } = options
  const roles =
    activeRoles === null ? [] : activeRoles !== undefined ? activeRoles : sessionRolesGetter()
  const finalHeaders: Record<string, string> = { ...headers }

  if (roles.length > 0) {
    finalHeaders['X-Active-Role'] = roles.join(',')
  }

  let payload: BodyInit | undefined
  if (body !== undefined) {
    if (body instanceof FormData) {
      payload = body
    } else {
      finalHeaders['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    headers: finalHeaders,
    body: payload,
    signal,
  })

  if (raw) {
    if (!res.ok) {
      const text = await res.text()
      let message = text || res.statusText
      try {
        const parsed = apiErrorSchema.safeParse(JSON.parse(text))
        if (parsed.success && parsed.data.message) message = parsed.data.message
      } catch {
        /* keep text */
      }
      throw new ApiError(message, res.status, undefined, text)
    }
    return res as unknown as T
  }

  if (res.status === 204) {
    return undefined as T
  }

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(data)
    const message =
      (parsed.success && parsed.data.message) ||
      (typeof data === 'string' && data) ||
      `Error HTTP ${res.status}`
    throw new ApiError(message, res.status, parsed.success ? parsed.data.code : undefined, data)
  }

  return data as T
}

export function userMessageFromError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Sesión expirada o no autenticado. Vuelve a iniciar sesión.'
    if (err.status === 403) return err.message || 'No tienes permiso para esta acción.'
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Error inesperado'
}
