import { expect, loginAs, test } from './fixtures/auth'

for (const { rol, code } of [
  { rol: 'Admin', code: '1002026100' },
  { rol: 'Director', code: '1002026601' },
  { rol: 'Consejería', code: '1002026602' },
  { rol: 'Coordinador', code: '1002026604' },
]) {
  test(`${rol} entra y sale del modo examen desde la navegación`, async ({
    page,
  }) => {
    await loginAs(page, { code })
    await page.route('**/api/examenes/supervision/semana**', (route) =>
      route.fulfill({
        json: {
          periodo_id: 'periodo',
          periodo_nombre: '2026',
          todas: true,
          horarios: [],
        },
      }),
    )
    await page.route('**/api/examenes/supervision/ahora**', (route) =>
      route.fulfill({
        json: {
          fecha: '2026-11-11',
          hora: '10:00',
          periodo_id: 'periodo',
          periodo_nombre: '2026',
          examenes: [],
        },
      }),
    )
    await page.getByTestId('user-panel').click()
    await page.getByTestId('user-menu-modo-examenes').click()
    await expect(page).toHaveURL(/\/modo-examen$/)
    await expect(page.getByTestId('supervision-examenes-page')).toBeVisible()
    await expect(page.getByTestId('examen-semana-ver-todo')).toHaveCount(0)
    await page.getByTestId('supervision-examenes-ahora').click()
    await expect(page).toHaveURL(/\/modo-examen\/ahora$/)
    await expect(page.getByTestId('examen-ahora-vacio')).toBeVisible()
    await page.getByTestId('user-panel').click()
    await page.getByTestId('user-menu-modo-examenes').click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })
}

test('admin consulta Ahora en solo lectura y mantiene las alertas locales @critical', async ({
  page,
}) => {
  await loginAs(page, { code: '1002026100' })
  const offset = await page.evaluate(() => new Date().getTimezoneOffset())
  await page.clock.install({
    time: new Date(Date.UTC(2026, 10, 11, 10, 0) + offset * 60_000),
  })
  let consultas = 0
  let ultimaHora = ''
  await page.route('**/api/examenes/supervision/ahora**', async (route) => {
    consultas += 1
    ultimaHora = new URL(route.request().url()).searchParams.get('hora') ?? ''
    await route.fulfill({
      json: {
        fecha: '2026-11-11',
        hora: ultimaHora,
        periodo_id: 'periodo',
        periodo_nombre: '2026',
        examenes:
          consultas === 1
            ? ['1', '2'].map((seccion) => ({
                examen_asignacion_id: `examen-${seccion}`,
                examen_horario_id: 'horario',
                es_final: false,
                fecha: '2026-11-11',
                bloque_orden: 1,
                hora_inicio: '09:00',
                hora_fin: '10:05',
                seccion_id: seccion,
                seccion_nombre: seccion,
                grado_nombre: 'Séptimo',
                curso_id: 'espanol',
                curso_nombre: 'Español',
                alumnos_pagos_pendientes: [],
                supervisores: [
                  {
                    id: `supervisor-${seccion}`,
                    maestro_id: 'pedro',
                    maestro_nombre: 'Pedro Ramírez',
                    seccion_id: seccion,
                  },
                ],
              }))
            : [],
      },
    })
  })
  await page.goto('/modo-examen/ahora')
  await expect(page.getByTestId('examen-supervision-grupo')).toHaveCount(1)
  await expect(page.getByTestId(/^examen-ahora-pasar-/)).toHaveCount(0)
  await expect(page.getByTestId(/^examen-ahora-reportar-/)).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Pedro Ramírez', exact: true }),
  ).toBeVisible()
  await expect(page.getByTestId('examen-tiempo-modal')).toBeVisible()
  await page.getByTestId('examen-tiempo-aceptar').click()
  await page.clock.runFor(120_000)
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))
  })
  await page.clock.runFor(181_000)
  await expect(
    page.getByRole('heading', { name: 'Se acabó el tiempo' }),
  ).toBeVisible()
  expect(consultas).toBe(1)
  await page.getByTestId('examen-tiempo-aceptar').click()
  await page.getByTestId('supervision-ahora-boton').click()
  await expect.poll(() => consultas).toBe(2)
  expect(ultimaHora).toBe('10:05')
  await expect(page.getByTestId('examen-ahora-vacio')).toBeVisible()
})
