import { test, expect, loginAs } from './fixtures/auth'
import type { Page } from '@playwright/test'

// DEC-024. Pedro configura los puntos de asistencia del I parcial de Español 7-1; las notas los suman y el
// plan de estudio pide 100 menos esos puntos en ese parcial. Al final se dejan en 0 (el fixture no trae).
const PEDRO = '1002026501'
const ROL = { headers: { 'X-Active-Role': 'maestro' } }

test.describe.configure({ mode: 'serial' })

interface ClaseNotas {
  parciales: { id: string; max: number }[]
  filas: { codigo: string; puntos_parcial: (number | null)[] }[]
}

async function asignacion(page: Page) {
  const res = await page.request.get('/api/asistencia/materias', ROL)
  expect(res.ok()).toBeTruthy()
  const materias = (await res.json()) as { asignacion_docente_id: string }[]
  return materias[0].asignacion_docente_id
}

async function notas(page: Page, asig: string) {
  const res = await page.request.get(`/api/calificaciones/clase?asignacion_docente_id=${asig}`, ROL)
  expect(res.ok()).toBeTruthy()
  return (await res.json()) as ClaseNotas
}

async function abrirModal(page: Page) {
  await page.goto('/asistencia')
  await expect(page.getByTestId('asistencia-inline')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('asistencia-puntos').click()
  await expect(page.getByTestId('puntos-asistencia-modal')).toBeVisible()
  await expect(page.getByTestId('puntos-asistencia-fila-1')).toBeVisible({ timeout: 15_000 })
}

async function guardarPuntos(page: Page, puntos: string) {
  await page.getByTestId('puntos-asistencia-input-1').fill(puntos)
  await page.getByTestId('puntos-asistencia-guardar').click()
  await page
    .getByRole('dialog', { name: 'Guardar puntos de asistencia' })
    .getByRole('button', { name: 'Guardar', exact: true })
    .click()
  await expect(page.getByText('Puntos de asistencia guardados').last()).toBeVisible({ timeout: 15_000 })
}

test.describe('puntos de asistencia por parcial', () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAs(page, { code: PEDRO })
    const asig = await asignacion(page)
    const res = await page.request.get(`/api/asistencia/puntos?asignacion_docente_id=${asig}`, ROL)
    const pars = (await res.json()) as { parcial_id: string }[]
    await page.request.put('/api/asistencia/puntos', {
      ...ROL,
      data: { asignacion_docente_id: asig, items: pars.map((p) => ({ parcial_id: p.parcial_id, puntos: 0 })) },
    })
    await page.close()
  })

  test('el maestro pone 30 puntos al I parcial y la nota del parcial los suma', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    const asig = await asignacion(page)
    const antes = await notas(page, asig)

    await abrirModal(page)
    await expect(page.getByTestId('puntos-asistencia-fila-1')).toContainText('I parcial')
    await expect(page.getByTestId('puntos-asistencia-detalle-1')).toHaveText('Sin puntos')
    await page.getByTestId('puntos-asistencia-input-1').fill('30')
    await expect(page.getByTestId('puntos-asistencia-detalle-1')).toContainText(
      'Se pierden todos con 30 faltas o 120 tardes',
    )
    // El plan de Pedro ya suma 100 en el I parcial: con 30 de asistencia no cuadra y se avisa.
    await expect(page.getByTestId('puntos-asistencia-aviso-1')).toHaveText(
      'El plan suma 100; con asistencia da 130.00 de 100',
    )
    await guardarPuntos(page, '30')
    await expect(page.getByTestId('puntos-asistencia-modal')).toHaveCount(0)

    const despues = await notas(page, asig)
    expect(despues.parciales[0].max - antes.parciales[0].max).toBeCloseTo(30, 5)
    for (const f of despues.filas) {
      const previo = antes.filas.find((a) => a.codigo === f.codigo)?.puntos_parcial[0] ?? 0
      const ahora = f.puntos_parcial[0] ?? 0
      const asistencia = ahora - previo
      expect(asistencia).toBeGreaterThanOrEqual(0)
      expect(asistencia).toBeLessThanOrEqual(30.05)
      // F quita 1 y T 0.25: lo que queda siempre va en bloques de 0.25.
      expect(Math.abs(asistencia * 4 - Math.round(asistencia * 4))).toBeLessThan(0.21)
    }

    // Al volver a abrir el modal se ven los 30 guardados.
    await abrirModal(page)
    await expect(page.getByTestId('puntos-asistencia-input-1')).toHaveValue('30')
  })

  test('el plan de estudio pide 70 en el I parcial', async ({ page }) => {
    await loginAs(page, { code: PEDRO })
    const asig = await asignacion(page)
    await page.goto('/plan-estudio')
    await expect(page.getByTestId('data-table-add-button')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('data-table-add-button').click()
    await expect(page.getByTestId('plan-create-wizard')).toBeVisible({ timeout: 10_000 })
    const curso = page.getByTestId('plan-create-curso')
    await expect.poll(async () => curso.locator('option').count()).toBeGreaterThan(1)
    await curso.selectOption(asig)
    await expect(page.getByTestId('plan-parcial-suma-0')).toHaveText('70 / 70 pts (30 de asistencia)', {
      timeout: 10_000,
    })
  })
})
