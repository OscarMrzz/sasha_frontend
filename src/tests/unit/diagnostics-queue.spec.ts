import { expect, test } from '@playwright/test'
import {
  createDiagnosticEvent,
  DiagnosticQueue,
  DIAGNOSTICS_MAX_EVENTS,
  DIAGNOSTICS_RETENTION_MS,
  normalizeDiagnosticPath,
  pruneDiagnosticEvents,
  retryAfterSeconds,
  shouldCaptureHttp,
} from '../../lib/diagnostics-queue'
import type {
  DiagnosticEvent,
  DiagnosticStore,
} from '../../lib/diagnostics-queue'

const NOW = Date.UTC(2026, 10, 10, 14, 0)
const ID = '00000000-0000-4000-8000-000000000001'
const REQUEST_ID = '12345678-abcd-4000-8000-123456789012'

function event(id = ID, now = NOW) {
  return createDiagnosticEvent(
    { method: 'POST', path: '/login/', status: 429 },
    id,
    now,
  )!
}

class MemoryStore implements DiagnosticStore {
  events: DiagnosticEvent[] = []
  async append(value: DiagnosticEvent, now: number) {
    this.events = pruneDiagnosticEvents([...this.events, value], now)
  }
  async list(now: number) {
    this.events = pruneDiagnosticEvents(this.events, now)
    return [...this.events]
  }
  async remove(ids: string[]) {
    this.events = this.events.filter((value) => !ids.includes(value.event_id))
  }
}

test('429 de login conserva correlación y reintento sin datos libres', () => {
  const value = createDiagnosticEvent(
    {
      method: 'POST',
      path: '/login/?password=secret',
      status: 429,
      code: 'TOO_MANY_REQUESTS',
      requestId: REQUEST_ID,
      retryAfter: '30',
      durationMs: 80,
    },
    ID,
    NOW,
  )!
  expect(value).toEqual({
    event_id: ID,
    occurred_at: new Date(NOW).toISOString(),
    method: 'POST',
    path: '/login',
    status: 429,
    code: 'TOO_MANY_REQUESTS',
    request_id: REQUEST_ID,
    retry_after_seconds: 30,
    duration_ms: 80,
  })
  expect(JSON.stringify(value)).not.toContain('secret')
})

test('normaliza valores de ruta y rechaza code/request_id libres', () => {
  expect(
    normalizeDiagnosticPath('/users/1002026100/credencial?token=secret'),
  ).toBe('/users/:id/credencial')
  expect(
    normalizeDiagnosticPath(
      '/tareas/12345678-abcd-4000-8000-123456789012/adjuntos/Juan%20Perez/archivo',
    ),
  ).toBe('/tareas/:id/adjuntos/:id/archivo')
  const value = createDiagnosticEvent(
    {
      method: 'GET',
      path: '/personas/JuanPerez',
      status: 500,
      code: 'JuanPerez',
      requestId: 'JuanPerez',
    },
    ID,
    NOW,
  )!
  expect(value).not.toHaveProperty('code')
  expect(value).not.toHaveProperty('request_id')
})

test('distingue red sin status y excluye 401/403 esperados', () => {
  expect(shouldCaptureHttp(429)).toBe(true)
  expect(shouldCaptureHttp(500)).toBe(true)
  expect(shouldCaptureHttp(401)).toBe(false)
  expect(shouldCaptureHttp(403)).toBe(false)
  expect(
    createDiagnosticEvent(
      { method: 'POST', path: '/login', status: 401 },
      ID,
      NOW,
    ),
  ).toBeUndefined()
  expect(
    createDiagnosticEvent(
      { method: 'GET', path: '/portal/inicio', code: 'NETWORK_ERROR' },
      ID,
      NOW,
    ),
  ).not.toHaveProperty('status')
})

test('interpreta Retry-After numérico/fecha y limita valores', () => {
  expect(retryAfterSeconds('10', NOW)).toBe(10)
  expect(retryAfterSeconds(new Date(NOW + 120000).toUTCString(), NOW)).toBe(120)
  expect(retryAfterSeconds('99999999', NOW)).toBe(86400)
  expect(retryAfterSeconds('invalid', NOW)).toBeUndefined()
  expect(retryAfterSeconds('-1', NOW)).toBeUndefined()
})

test('expira, deduplica y aplica cupo sin conservar propiedades ajenas', () => {
  const rows = Array.from({ length: DIAGNOSTICS_MAX_EVENTS + 2 }, (_, index) =>
    event(
      `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
      NOW - 1000 + index,
    ),
  )
  const dirty = {
    ...rows.at(-1)!,
    body: { password: 'secret' },
    headers: { Cookie: 'secret' },
    stack: 'secret',
  }
  const result = pruneDiagnosticEvents(
    [
      ...rows,
      dirty,
      event(
        '00000000-0000-4000-8000-999999999999',
        NOW - DIAGNOSTICS_RETENTION_MS - 1,
      ),
    ],
    NOW,
  )
  expect(result).toHaveLength(DIAGNOSTICS_MAX_EVENTS)
  expect(new Set(result.map((row) => row.event_id)).size).toBe(result.length)
  expect(JSON.stringify(result)).not.toContain('secret')
  expect(result[0].event_id).toBe(rows[2].event_id)
})

test('solo elimina lote al recibir ACK válido', async () => {
  const store = new MemoryStore()
  store.events = [event()]
  const sent: string[] = []
  const queue = new DiagnosticQueue({
    store,
    endpoint: '/api/diagnosticos/eventos',
    now: () => NOW,
    fetch: async (url, options) => {
      sent.push(String(url))
      expect(options?.body).toBe(JSON.stringify({ eventos: store.events }))
      return Response.json({ accepted: 1 }, { status: 202 })
    },
  })
  await queue.flush()
  expect(sent).toEqual(['/api/diagnosticos/eventos'])
  expect(store.events).toHaveLength(0)
})

test('429 de ingesta retiene IDs y respeta cooldown antes de reenviar', async () => {
  const store = new MemoryStore()
  store.events = [event()]
  let now = NOW
  let attempts = 0
  let delay = 0
  const bodies: string[] = []
  const queue = new DiagnosticQueue({
    store,
    endpoint: '/api/diagnosticos/eventos',
    now: () => now,
    random: () => 0,
    schedule: (_callback, milliseconds) => {
      delay = milliseconds
      return 0 as unknown as ReturnType<typeof setTimeout>
    },
    fetch: async (_url, options) => {
      bodies.push(String(options?.body))
      attempts++
      return attempts === 1
        ? new Response('', { status: 429, headers: { 'Retry-After': '30' } })
        : Response.json({ accepted: 1 }, { status: 202 })
    },
  })
  await queue.flush()
  expect(delay).toBe(30000)
  expect(store.events).toHaveLength(1)
  await queue.flush()
  expect(attempts).toBe(1)
  now += delay
  await queue.flush()
  expect(bodies[0]).toBe(bodies[1])
  expect(store.events).toHaveLength(0)
})

test('fallo de red o ACK incompleto conserva eventos y programa backoff', async () => {
  for (const fetcher of [
    async () => {
      throw new TypeError('offline')
    },
    async () => Response.json({ accepted: 0 }, { status: 202 }),
  ]) {
    const store = new MemoryStore()
    store.events = [event()]
    let delay = 0
    const queue = new DiagnosticQueue({
      store,
      endpoint: '/api/diagnosticos/eventos',
      now: () => NOW,
      random: () => 0,
      fetch: fetcher,
      schedule: (_callback, milliseconds) => {
        delay = milliseconds
        return 0 as unknown as ReturnType<typeof setTimeout>
      },
    })
    await queue.flush()
    expect(store.events).toHaveLength(1)
    expect(delay).toBeGreaterThan(0)
  }
})

test('storage no disponible no propaga errores al flujo funcional', async () => {
  const unavailable: DiagnosticStore = {
    append: async () => {
      throw new Error('unavailable')
    },
    list: async () => [],
    remove: async () => undefined,
  }
  const queue = new DiagnosticQueue({
    store: unavailable,
    endpoint: '/api/diagnosticos/eventos',
    fetch,
  })
  await expect(queue.record(event())).resolves.toBeUndefined()
})
