import { expect, loginAs, test } from './fixtures/auth'

const FECHA = '2026-11-09'

function examen(id: string, curso: string) {
  return {
    examen_asignacion_id: id,
    examen_horario_id: `horario-${id}`,
    es_final: false,
    fecha: FECHA,
    bloque_orden: 1,
    hora_inicio: '09:00:00',
    hora_fin: '10:05:00',
    seccion_id: `seccion-${id}`,
    seccion_nombre: id === 'a' ? 'A' : 'B',
    grado_id: `grado-${id}`,
    grado_nombre: 'Décimo',
    curso_id: `curso-${id}`,
    curso_nombre: curso,
    supervisores: [],
    alumnos_pagos_pendientes: [],
  }
}

function cuentaEnSegundos(valor: string | null) {
  const [minutos, segundos] = (valor ?? '00:00').split(':').map(Number)
  return minutos * 60 + segundos
}

test.describe('alertas de tiempo para exámenes del maestro @critical', () => {
  test('agrupa exámenes, deja el contador al aceptar y avisa al terminar aunque la consulta los retire', async ({
    page,
  }) => {
    await loginAs(page, { code: '1002026501' })

    const offsetMinutos = await page.evaluate(() =>
      new Date().getTimezoneOffset(),
    )
    const instanteLocal = new Date(
      Date.UTC(2026, 10, 9, 10, 0, 0) + offsetMinutos * 60_000,
    )
    await page.clock.install({ time: instanteLocal })
    await page.addInitScript(() => {
      ;(window as Window & { __alarmasExamen?: number }).__alarmasExamen = 0
      class AudioContextPrueba {
        state: AudioContextState = 'running'
        currentTime = 0
        destination = {}

        createOscillator() {
          return {
            type: 'sine',
            frequency: { setValueAtTime: () => undefined },
            connect: () => undefined,
            start: () => {
              const w = window as Window & { __alarmasExamen?: number }
              w.__alarmasExamen = (w.__alarmasExamen ?? 0) + 1
            },
            stop: () => undefined,
          }
        }

        createGain() {
          return {
            gain: {
              setValueAtTime: () => undefined,
              exponentialRampToValueAtTime: () => undefined,
            },
            connect: () => undefined,
          }
        }

        close() {
          this.state = 'closed'
          return Promise.resolve()
        }

        resume() {
          this.state = 'running'
          return Promise.resolve()
        }
      }
      Object.defineProperty(window, 'AudioContext', {
        configurable: true,
        value: AudioContextPrueba,
      })
    })

    let consultas = 0
    await page.route('**/api/examenes/ahora**', async (route) => {
      consultas += 1
      await route.fulfill({
        json: {
          fecha: FECHA,
          hora: '10:00:00',
          periodo_id: 'periodo-prueba',
          periodo_nombre: '2026',
          examenes:
            consultas === 1
              ? [examen('a', 'Matemáticas'), examen('b', 'Español')]
              : [],
        },
      })
    })

    await page.goto('/maestro/examenes/ahora')
    await expect(page.getByTestId('examen-tiempo-modal')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Quedan 5 minutos' }),
    ).toBeVisible()
    await expect(
      page.getByTestId('examen-tiempo-modal').getByText('Matemáticas'),
    ).toBeVisible()
    await expect(
      page.getByTestId('examen-tiempo-modal').getByText('Español'),
    ).toBeVisible()
    const contadorInicialA = await page
      .getByTestId('examen-tiempo-contador-a')
      .locator('time')
      .textContent()
    const contadorInicialB = await page
      .getByTestId('examen-tiempo-contador-b')
      .locator('time')
      .textContent()
    expect(contadorInicialA).toMatch(/^(04|05):\d{2}$/)
    expect(contadorInicialB).toMatch(/^(04|05):\d{2}$/)

    await page.clock.runFor(3600)
    const alarmasAntesDeAceptar = await page.evaluate(
      () =>
        (window as Window & { __alarmasExamen?: number }).__alarmasExamen ?? 0,
    )
    expect(alarmasAntesDeAceptar).toBeGreaterThanOrEqual(2)

    await page.getByTestId('examen-tiempo-aceptar').click()
    await page.clock.runFor(300)
    await expect(page.getByTestId('examen-tiempo-modal')).toBeHidden()
    const contadorTrasAceptar = await page
      .getByTestId('examen-tiempo-contador-a')
      .locator('time')
      .textContent()
    expect(cuentaEnSegundos(contadorTrasAceptar)).toBeLessThan(
      cuentaEnSegundos(contadorInicialA),
    )
    expect(cuentaEnSegundos(contadorTrasAceptar)).toBeGreaterThan(0)

    const alarmasTrasAceptar = await page.evaluate(
      () =>
        (window as Window & { __alarmasExamen?: number }).__alarmasExamen ?? 0,
    )
    await page.clock.runFor(3600)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __alarmasExamen?: number }).__alarmasExamen ??
            0,
        ),
      )
      .toBe(alarmasTrasAceptar)

    await page.clock.runFor(300_000)
    await expect(page.getByTestId('examen-tiempo-modal')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Se acabó el tiempo' }),
    ).toBeVisible()
    await expect(
      page
        .getByTestId('examen-tiempo-modal')
        .getByText('Se acabó el tiempo del examen.'),
    ).toHaveCount(2)
    await expect(page.getByTestId('examen-tiempo-contador-a')).toContainText(
      '00:00',
    )
    expect(consultas).toBe(1)

    const alarmasFinales = await page.evaluate(
      () =>
        (window as Window & { __alarmasExamen?: number }).__alarmasExamen ?? 0,
    )
    await page.clock.runFor(3600)
    const alarmasFinalesRepetidas = await page.evaluate(
      () =>
        (window as Window & { __alarmasExamen?: number }).__alarmasExamen ?? 0,
    )
    expect(alarmasFinalesRepetidas).toBeGreaterThan(alarmasFinales)

    await page.getByTestId('examen-tiempo-aceptar').click()
    await page.clock.runFor(300)
    await expect(page.getByTestId('examen-tiempo-modal')).toBeHidden()
    const alarmasFinalesAceptadas = await page.evaluate(
      () =>
        (window as Window & { __alarmasExamen?: number }).__alarmasExamen ?? 0,
    )
    await page.clock.runFor(3600)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __alarmasExamen?: number }).__alarmasExamen ??
            0,
        ),
      )
      .toBe(alarmasFinalesAceptadas)
    await expect(page.getByTestId('examen-tiempo-contador-a')).toContainText(
      '00:00',
    )
  })
})
