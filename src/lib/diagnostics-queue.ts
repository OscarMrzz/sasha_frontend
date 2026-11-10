export type DiagnosticEvent = {
  event_id: string
  occurred_at: string
  method: string
  path: string
  status?: number
  code?: string
  request_id?: string
  duration_ms?: number
  retry_after_seconds?: number
  app_version?: string
}

type DiagnosticInput = {
  method: string
  path: string
  status?: number
  code?: string | number
  requestId?: string
  durationMs?: number
  retryAfter?: string | null
  appVersion?: string
}

export const DIAGNOSTICS_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
export const DIAGNOSTICS_MAX_EVENTS = 500
export const DIAGNOSTICS_MAX_BYTES = 2 * 1024 * 1024
const MAX_BATCH = 20
const MAX_BATCH_BYTES = 64 * 1024
const MAX_RETRY_MS = 5 * 60 * 1000
const METHOD = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const IDENTIFIER = /^[A-Za-z0-9_.:-]+$/
const CODE = /^[A-Z][A-Z0-9_]{0,79}$/
const STATIC_SEGMENTS = new Set(
  'api login logout users roles username password auditoria configuracion catalogos personas matricula asignacion horarios maestro monitor portal notas planestudio asistencia tareas calificaciones pagos notificaciones estadisticas sace consejeria disciplina excusas examenes actualizaciones permisos comentarios contratos recuperaciones coordinaciones dispositivos boveda diagnosticos eventos health mantenimiento mi-ficha hijos inicio ahora mensualidades recibos object upload archivo adjuntos materias clases clase plan opciones mios fichas stream logo fondo crear publicar activar versiones reportes reportar validar anular estado status credencial reset-password chequear-duplicado hard entrega entregas revision revisiones puntos lectura leidas banner resumen analisis alumnos responsables maestros grados modalidades secciones cursos periodos parciales tipos-pago descuentos becas documentos generar generar-pendientes asistencia-clase horarios-clase materias-clase'.split(
    ' ',
  ),
)

export function normalizeDiagnosticPath(path: string): string {
  if (!path.startsWith('/') || path.length > 4096) return '/:id'
  const clean = path.split(/[?#]/, 1)[0]
  const normalized =
    '/' +
    clean
      .split('/')
      .filter(Boolean)
      .map((part) => (STATIC_SEGMENTS.has(part) ? part : ':id'))
      .join('/')
  return normalized.length <= 240 ? normalized : '/:id'
}

export function shouldCaptureHttp(status: number): boolean {
  return (
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599 &&
    status !== 401 &&
    status !== 403
  )
}

export function retryAfterSeconds(
  value: string | null | undefined,
  now = Date.now(),
): number | undefined {
  if (!value) return undefined
  const seconds = /^\d+$/.test(value.trim())
    ? Number(value.trim())
    : Math.ceil((Date.parse(value) - now) / 1000)
  return Number.isFinite(seconds) && seconds >= 0
    ? Math.min(seconds, 86400)
    : undefined
}

function identifier(
  value: string | undefined,
  max: number,
): string | undefined {
  return value && value.length <= max && IDENTIFIER.test(value)
    ? value
    : undefined
}

export function createDiagnosticEvent(
  input: DiagnosticInput,
  eventId: string,
  now = Date.now(),
): DiagnosticEvent | undefined {
  const method = input.method.toUpperCase()
  if (
    !METHOD.test(method) ||
    !UUID.test(eventId) ||
    (input.status !== undefined && !shouldCaptureHttp(input.status))
  )
    return undefined
  const event: DiagnosticEvent = {
    event_id: eventId,
    occurred_at: new Date(now).toISOString(),
    method,
    path: normalizeDiagnosticPath(input.path),
  }
  if (input.status !== undefined) event.status = input.status
  const code = input.code === undefined ? undefined : String(input.code)
  if (code && CODE.test(code)) event.code = code
  const requestId =
    input.requestId && UUID.test(input.requestId) ? input.requestId : undefined
  if (requestId) event.request_id = requestId
  const appVersion = identifier(input.appVersion, 80)
  if (appVersion) event.app_version = appVersion
  if (
    input.durationMs !== undefined &&
    Number.isFinite(input.durationMs) &&
    input.durationMs >= 0
  )
    event.duration_ms = Math.min(Math.round(input.durationMs), 3600000)
  const retry = retryAfterSeconds(input.retryAfter, now)
  if (retry !== undefined) event.retry_after_seconds = retry
  return event
}

function eventBytes(event: DiagnosticEvent): number {
  return new TextEncoder().encode(JSON.stringify(event)).length
}

function validStoredEvent(value: DiagnosticEvent, now: number): boolean {
  if (
    !value ||
    typeof value.event_id !== 'string' ||
    typeof value.method !== 'string' ||
    typeof value.path !== 'string' ||
    typeof value.occurred_at !== 'string' ||
    !UUID.test(value.event_id) ||
    !METHOD.test(value.method)
  )
    return false
  const occurred = Date.parse(value.occurred_at)
  if (
    !Number.isFinite(occurred) ||
    occurred < now - DIAGNOSTICS_RETENTION_MS ||
    occurred > now + 5 * 60 * 1000
  )
    return false
  // Rebuild the allowlist before any stored data is sent, including data from an older build.
  return (
    value.path === normalizeDiagnosticPath(value.path) &&
    (value.status === undefined || shouldCaptureHttp(value.status))
  )
}

export function pruneDiagnosticEvents(
  events: DiagnosticEvent[],
  now = Date.now(),
): DiagnosticEvent[] {
  const unique = new Map<string, DiagnosticEvent>()
  for (const stored of events) {
    if (!validStoredEvent(stored, now)) continue
    const event = createDiagnosticEvent(
      {
        method: stored.method,
        path: stored.path,
        status: stored.status,
        code: stored.code,
        requestId: stored.request_id,
        durationMs: stored.duration_ms,
        retryAfter: stored.retry_after_seconds?.toString(),
        appVersion: stored.app_version,
      },
      stored.event_id,
      Date.parse(stored.occurred_at),
    )
    if (event) unique.set(event.event_id, event)
  }
  const sorted = [...unique.values()].sort((a, b) =>
    a.occurred_at.localeCompare(b.occurred_at),
  )
  let bytes = sorted.reduce((sum, event) => sum + eventBytes(event), 0)
  while (
    sorted.length > DIAGNOSTICS_MAX_EVENTS ||
    bytes > DIAGNOSTICS_MAX_BYTES
  )
    bytes -= eventBytes(sorted.shift()!)
  return sorted
}

export interface DiagnosticStore {
  append(event: DiagnosticEvent, now: number): Promise<void>
  list(now: number): Promise<DiagnosticEvent[]>
  remove(ids: string[]): Promise<void>
}

export class IndexedDiagnosticStore implements DiagnosticStore {
  private database: Promise<IDBDatabase> | undefined

  private open(): Promise<IDBDatabase> {
    this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('sasha.diagnostics', 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore('events', { keyPath: 'event_id' })
      }
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close()
          this.database = undefined
        }
        resolve(request.result)
      }
      request.onerror = () => {
        this.database = undefined
        reject(request.error)
      }
      request.onblocked = () => {
        this.database = undefined
        reject(new Error('diagnostic storage blocked'))
      }
    })
    return this.database
  }

  private async update(
    transform: (events: DiagnosticEvent[]) => DiagnosticEvent[],
  ): Promise<DiagnosticEvent[]> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite')
      const store = tx.objectStore('events')
      const read = store.getAll()
      let result: DiagnosticEvent[] = []
      read.onsuccess = () => {
        result = transform(read.result as DiagnosticEvent[])
        store.clear()
        for (const event of result) store.put(event)
      }
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }

  async append(event: DiagnosticEvent, now: number): Promise<void> {
    await this.update((events) =>
      pruneDiagnosticEvents([...events, event], now),
    )
  }
  list(now: number): Promise<DiagnosticEvent[]> {
    return this.update((events) => pruneDiagnosticEvents(events, now))
  }
  async remove(ids: string[]): Promise<void> {
    const removed = new Set(ids)
    await this.update((events) =>
      events.filter((event) => !removed.has(event.event_id)),
    )
  }
}

type QueueOptions = {
  store: DiagnosticStore
  endpoint: string
  fetch: typeof fetch
  now?: () => number
  random?: () => number
  schedule?: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setTimeout>
}

export class DiagnosticQueue {
  private running = false
  private pending = false
  private failures = 0
  private retryAt = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly now: () => number
  private readonly random: () => number
  private readonly schedule: NonNullable<QueueOptions['schedule']>

  constructor(private readonly options: QueueOptions) {
    this.now = options.now ?? Date.now
    this.random = options.random ?? Math.random
    this.schedule = options.schedule ?? setTimeout
  }

  async record(event: DiagnosticEvent): Promise<void> {
    try {
      await this.options.store.append(event, this.now())
      void this.flush()
    } catch {
      /* Telemetry storage is best effort. */
    }
  }

  private retry(delay: number): void {
    this.retryAt = this.now() + delay
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = this.schedule(() => {
      this.timer = undefined
      void this.flush()
    }, delay)
  }

  async flush(): Promise<void> {
    if (this.running) {
      this.pending = true
      return
    }
    if (this.now() < this.retryAt) return
    this.running = true
    this.pending = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const events = await this.options.store.list(this.now())
      const batch: DiagnosticEvent[] = []
      let bytes = 14
      for (const event of events) {
        const size = eventBytes(event) + 1
        if (batch.length >= MAX_BATCH || bytes + size > MAX_BATCH_BYTES) break
        batch.push(event)
        bytes += size
      }
      if (!batch.length) return
      const controller = new AbortController()
      timeout = setTimeout(() => controller.abort(), 10000)
      const response = await this.options.fetch(this.options.endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventos: batch }),
        signal: controller.signal,
      })
      if (response.status === 202) {
        const acknowledgement: unknown = await response.json()
        if (
          !acknowledgement ||
          typeof acknowledgement !== 'object' ||
          (acknowledgement as { accepted?: unknown }).accepted !== batch.length
        )
          throw new Error('invalid diagnostic acknowledgement')
        await this.options.store.remove(batch.map((event) => event.event_id))
        this.failures = 0
        this.retryAt = 0
        if (events.length > batch.length) this.retry(1000)
      } else {
        const requested = retryAfterSeconds(
          response.headers.get('Retry-After'),
          this.now(),
        )
        this.failures++
        this.retry(
          Math.min(
            MAX_RETRY_MS,
            Math.max(
              requested === undefined ? 0 : requested * 1000,
              1000 *
                2 ** Math.min(this.failures, 8) *
                (0.75 + this.random() * 0.5),
            ),
          ),
        )
      }
    } catch {
      this.failures++
      this.retry(
        Math.min(
          MAX_RETRY_MS,
          1000 * 2 ** Math.min(this.failures, 8) * (0.75 + this.random() * 0.5),
        ),
      )
    } finally {
      if (timeout !== undefined) clearTimeout(timeout)
      this.running = false
      if (this.pending && this.now() >= this.retryAt) this.retry(0)
    }
  }
}

let browserQueue: DiagnosticQueue | undefined

function queue(endpoint: string): DiagnosticQueue | undefined {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined')
    return undefined
  if (!browserQueue) {
    browserQueue = new DiagnosticQueue({
      store: new IndexedDiagnosticStore(),
      endpoint,
      fetch: window.fetch.bind(window),
    })
    window.addEventListener('online', () => {
      void browserQueue?.flush()
    })
  }
  return browserQueue
}

export function flushDiagnostics(apiBase: string): void {
  try {
    void queue(`${apiBase}/diagnosticos/eventos`)?.flush()
  } catch {
    /* Diagnostics never alter API behavior. */
  }
}

export function recordDiagnostic(
  input: DiagnosticInput,
  apiBase: string,
): void {
  try {
    const path = normalizeDiagnosticPath(input.path)
    if (
      path === '/diagnosticos/eventos' ||
      path === '/api/diagnosticos/eventos'
    )
      return
    const target = queue(`${apiBase}/diagnosticos/eventos`)
    if (
      !target ||
      typeof crypto === 'undefined' ||
      typeof crypto.randomUUID !== 'function'
    )
      return
    const event = createDiagnosticEvent(input, crypto.randomUUID())
    if (event) void target.record(event)
  } catch {
    /* Diagnostics never alter API behavior. */
  }
}
