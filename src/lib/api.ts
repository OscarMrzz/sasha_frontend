import { toast } from 'sonner'
import { z } from 'zod'
import { clearPersistedSession, parseStoredSession, readStoredSessionRaw } from '#/lib/session-storage'

export const apiErrorSchema = z.object({
  message: z.string().optional(),
  code: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
  request_id: z.union([z.string(), z.number()]).optional(),
})

/** Datos de la petición que se conservan para poder reportar un error. */
export type ApiErrorMeta = {
  requestId?: string
  method?: string
  path?: string
}

export class ApiError extends Error {
  status: number
  code?: string | number
  body?: unknown
  /** Cabecera `X-Request-Id` (o `request_id` del JSON de error si el backend lo envía). */
  requestId?: string
  method?: string
  path?: string

  constructor(
    message: string,
    status: number,
    code?: string | number,
    body?: unknown,
    meta: ApiErrorMeta = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.body = body
    this.requestId = meta.requestId
    this.method = meta.method
    this.path = meta.path
  }
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || '/api'
}

type RequestOptions = {
  method?: string
  body?: unknown
  /** Roles a enviar en X-Active-Role. null = no header (login/health). Un usuario = un rol. */
  activeRoles?: string[] | null
  headers?: Record<string, string>
  raw?: boolean
  signal?: AbortSignal
}

let sessionRolesGetter: () => string[] = () => []

export function setSessionRolesGetter(fn: () => string[]) {
  sessionRolesGetter = fn
}

/** Evita bucles si varias peticiones fallan 401 a la vez. */
let redirectingToLogin = false

function handleUnauthorized(path: string) {
  // Credenciales inválidas en login no son “sesión expirada”.
  if (path.startsWith('/login')) return
  if (typeof window === 'undefined') return
  if (window.location.pathname.startsWith('/login')) {
    clearPersistedSession()
    return
  }
  if (redirectingToLogin) return
  redirectingToLogin = true
  clearPersistedSession()
  window.location.assign('/login')
}

/** Evita bucles si varias peticiones reciben 503 de mantenimiento a la vez. */
let redirectingToMaintenance = false

/** El rol `developer` no se redirige: es quien puede apagar el mantenimiento desde la web. */
function isDeveloperStored(): boolean {
  try {
    const parsed = parseStoredSession(readStoredSessionRaw())
    return Boolean(parsed && parsed.knownRoles.includes('developer'))
  } catch {
    return false
  }
}

/** Espejo de `handleUnauthorized` para el 503 de mantenimiento (`code=MANTENIMIENTO`). */
function handleMaintenance() {
  if (typeof window === 'undefined') return
  // El `developer` autenticado nunca se redirige (es quien puede apagarlo desde la web).
  if (isDeveloperStored()) return
  const path = window.location.pathname.replace(/\/$/, '')
  // `/login` queda exento para que el developer pueda iniciar sesión; `/mantenimiento` ya es la pantalla.
  if (path === '/login' || path === '/mantenimiento') return
  if (redirectingToMaintenance) return
  redirectingToMaintenance = true
  window.location.assign('/mantenimiento')
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
    finalHeaders['X-Active-Role'] = roles[0]
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

  if (res.status === 401) {
    handleUnauthorized(path)
  }

  if (raw) {
    if (!res.ok) {
      const text = await res.text()
      let cuerpo: unknown = text
      try {
        cuerpo = JSON.parse(text)
      } catch {
        /* la respuesta no es JSON: se guarda el texto tal cual */
      }
      const parsed = apiErrorSchema.safeParse(cuerpo)
      const code = parsed.success ? parsed.data.code : undefined
      const message = (parsed.success && parsed.data.message) || mensajePorEstado(res.status)
      const requestId = requestIdDeRespuesta(res, cuerpo)
      // 503 de mantenimiento (no confundir con STORAGE_* de la bóveda).
      if (res.status === 503 && code === 'MANTENIMIENTO') {
        handleMaintenance()
      }
      logApiFailure(method, path, res.status, code, message, cuerpo, requestId)
      throw new ApiError(message, res.status, code, cuerpo, { requestId, method, path })
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
    const code = parsed.success ? parsed.data.code : undefined
    const message = (parsed.success && parsed.data.message) || mensajePorEstado(res.status)
    const requestId = requestIdDeRespuesta(res, data)
    // 503 de mantenimiento (no confundir con STORAGE_* de la bóveda).
    if (res.status === 503 && code === 'MANTENIMIENTO') {
      handleMaintenance()
    }
    logApiFailure(method, path, res.status, code, message, data, requestId)
    throw new ApiError(message, res.status, code, data, { requestId, method, path })
  }

  return data as T
}

/** Lee el identificador de la petición de la cabecera o, si no viene, del JSON de error. */
function requestIdDeRespuesta(res: Response, body: unknown): string | undefined {
  const header = res.headers.get('X-Request-Id')
  if (header) return header
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const value = (body as Record<string, unknown>).request_id
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return undefined
}

/**
 * Detalle en consola de cada respuesta fallida del API. Sirve para saber de un
 * vistazo si el problema es del front, del backend (status/code) o de la red
 * (cuando no llega a haber respuesta, lo que lanza un TypeError aparte).
 */
function logApiFailure(
  method: string,
  path: string,
  status: number,
  code: string | number | undefined,
  message: string,
  body: unknown,
  requestId?: string,
) {
  const etiqueta = `[api] ${method} ${getApiBaseUrl()}${path} → ${status}${code ? ` ${code}` : ''}`
  console.error(`${etiqueta} · ${message}`, { status, code, requestId, body })
}

/** Para endpoints de lista: garantiza un array aunque el backend devuelva null. */
export async function apiRequestList<T>(path: string, options: RequestOptions = {}): Promise<T[]> {
  const data = await apiRequest<T[] | null>(path, options)
  return Array.isArray(data) ? data : []
}

/** Los mensajes del backend vienen en español en el JSON; las respuestas en texto plano (las del router de Go) traen inglés. */
function mensajePorEstado(status: number): string {
  if (status === 400) return 'La solicitud no es válida.'
  if (status === 403) return 'No tienes permiso para esta acción.'
  if (status === 404) return 'No se encontró lo que buscas.'
  if (status === 405) return 'El servidor no reconoce esta acción. Puede que el backend esté desactualizado: reinícialo.'
  if (status === 413) return 'El archivo es demasiado grande.'
  if (status === 415) return 'Tipo de archivo no permitido.'
  if (status >= 500) return 'El servidor tuvo un problema. Intenta de nuevo en un momento.'
  return `Error del servidor (${status}).`
}

export function userMessageFromError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Sesión expirada o no autenticado. Vuelve a iniciar sesión.'
    if (err.status === 403) return err.message || 'No tienes permiso para esta acción.'
    return err.message
  }
  if (err instanceof TypeError) return 'No se pudo conectar con el servidor.'
  if (err instanceof Error) return err.message
  return 'Error inesperado'
}

/** Contexto extra para un reporte de error (lo que el `ApiError` no siempre sabe). */
export type ErrorReportContext = {
  method?: string
  path?: string
  /** Qué estaba haciendo el usuario, p. ej. «Descargar adjunto "foto.png"». */
  contexto?: string
}

/** Convierte el body del error en texto legible sin romper con objetos circulares. */
function bodyParaReporte(body: unknown): string | undefined {
  if (body === undefined || body === null || body === '') return undefined
  const texto =
    typeof body === 'string'
      ? body
      : (() => {
          try {
            return JSON.stringify(body, null, 2)
          } catch {
            return String(body)
          }
        })()
  return texto.length > 8000 ? `${texto.slice(0, 8000)}…` : texto
}

/**
 * Texto listo para pegar en un reporte: fecha, petición, status, código,
 * mensaje, `request_id` y body. Si el error no es del API igualmente deja la
 * información básica para diagnosticar.
 */
export function errorReportText(err: unknown, ctx: ErrorReportContext = {}): string {
  const lineas = ['Reporte de error', `Fecha: ${new Date().toISOString()}`]
  if (ctx.contexto) lineas.push(`Contexto: ${ctx.contexto}`)

  if (err instanceof ApiError) {
    const method = err.method ?? ctx.method ?? 'GET'
    const path = err.path ?? ctx.path
    lineas.push(`Método: ${method}`)
    if (path) lineas.push(`URL: ${getApiBaseUrl()}${path}`)
    lineas.push(`Status: ${err.status}`)
    if (err.code !== undefined) lineas.push(`Code: ${String(err.code)}`)
    lineas.push(`Mensaje: ${err.message}`)
    lineas.push(`Request ID: ${err.requestId ?? '(no disponible)'}`)
    const body = bodyParaReporte(err.body)
    if (body) lineas.push('Body:', body)
  } else {
    if (ctx.method) lineas.push(`Método: ${ctx.method}`)
    if (ctx.path) lineas.push(`URL: ${getApiBaseUrl()}${ctx.path}`)
    lineas.push(`Tipo: ${err instanceof Error ? err.name : typeof err}`)
    lineas.push(`Mensaje: ${err instanceof Error ? err.message : String(err)}`)
    if (err instanceof Error && err.stack) lineas.push('Stack:', err.stack)
  }

  return lineas.join('\n')
}

/** Copia texto al portapapeles y avisa con un toast si funcionó o falló. */
export async function copyText(
  text: string,
  mensajeExito = 'Detalle copiado al portapapeles',
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(mensajeExito)
    return true
  } catch {
    toast.error('No se pudo copiar al portapapeles')
    return false
  }
}

/** Copia el reporte completo de un error para que el usuario lo pueda enviar. */
export function copyErrorReport(
  err: unknown,
  ctx?: ErrorReportContext,
): Promise<boolean> {
  return copyText(errorReportText(err, ctx), 'Detalle del error copiado')
}

/** Muestra el mensaje entendible del error y ofrece copiar el detalle técnico. */
export function toastApiError(err: unknown, ctx?: ErrorReportContext): void {
  toast.error(userMessageFromError(err), {
    action: {
      label: 'Copiar',
      onClick: () => void copyErrorReport(err, ctx),
    },
  })
}
