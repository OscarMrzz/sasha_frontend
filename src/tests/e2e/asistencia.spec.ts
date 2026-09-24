import { test, expect, loginAs } from './fixtures/auth'

function todayLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function openAsistenciaMaestro(page: import('@playwright/test').Page) {
  await loginAs(page, { code: '1002026501', password: 'Admin123!' })
  await page.getByRole('link', { name: 'Asistencia' }).click()
  await expect(page.getByRole('heading', { name: /Asistencia/i })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByTestId('data-table-add-button')).toHaveCount(0)
  await expect(page.getByTestId('data-table-filter-periodo')).toHaveCount(0)
  await expect(page.getByText('Sin resultados')).toHaveCount(0, { timeout: 15_000 })
  const rows = page.locator('table.data-table tbody tr')
  await expect(rows).toHaveCount(1, { timeout: 15_000 })
  const row = rows.first()
  await expect(row).toContainText(/Español/i)
  return row
}

test.describe('asistencia @smoke', () => {
  test('maestro ve 1 materia del horario y abre Asistencia con grilla', async ({ page }) => {
    const row = await openAsistenciaMaestro(page)
    await row.click({ button: 'right' })
    await expect(page.getByTestId('asistencia-ctx-menu')).toBeVisible()
    await expect(page.getByTestId('asistencia-ctx-pasar')).toBeVisible()
    await expect(page.getByTestId('asistencia-ctx-pasar')).toHaveText(/Asistencia/i)
    await page.getByTestId('asistencia-ctx-pasar').click()
    await expect(page.getByTestId('asistencia-grid-modal')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('asistencia-leyenda')).toBeVisible()

    const filas = page.locator('[data-testid="asistencia-semana-table"] tbody tr')
    await expect(filas).toHaveCount(12, { timeout: 10_000 })

    const hoy = todayLocalISO()
    const celdaHoy = page.getByTestId(`asistencia-celda-1002026701-${hoy}`)
    await expect(celdaHoy).toBeVisible()
    await expect(celdaHoy).toHaveAttribute('data-dia', 'hoy')
    const before = await celdaHoy.getAttribute('data-letra')
    await celdaHoy.click()
    await expect.poll(async () => celdaHoy.getAttribute('data-letra')).not.toBe(before)
  })

  test('doble clic en materia abre Asistencia', async ({ page }) => {
    const row = await openAsistenciaMaestro(page)
    await row.dblclick()
    await expect(page.getByTestId('asistencia-grid-modal')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="asistencia-semana-table"] tbody tr')).toHaveCount(12, {
      timeout: 10_000,
    })
  })

  test('días futuros no son editables', async ({ page }) => {
    const row = await openAsistenciaMaestro(page)
    await row.dblclick()
    await expect(page.getByTestId('asistencia-grid-modal')).toBeVisible({ timeout: 10_000 })

    const futuros = page.locator(
      '[data-testid="asistencia-semana-table"] button.asistencia-celda[data-dia="futuro"]',
    )
    await expect(futuros).toHaveCount(0)

    const futuroRo = page
      .locator(
        '[data-testid="asistencia-semana-table"] .asistencia-celda--futuro[data-dia="futuro"]',
      )
      .first()
    const countFuturo = await page
      .locator(
        '[data-testid="asistencia-semana-table"] .asistencia-celda[data-dia="futuro"]',
      )
      .count()
    if (countFuturo > 0) {
      await expect(futuroRo).toBeVisible()
      await expect(futuroRo).toHaveClass(/asistencia-celda--futuro/)
    }
  })

  test('maestro abre modal Inasistencias', async ({ page }) => {
    const row = await openAsistenciaMaestro(page)
    await row.click({ button: 'right' })
    await page.getByTestId('asistencia-ctx-inasistencias').click()
    await expect(page.getByTestId('asistencia-inasistencias-modal')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="asistencia-inasistencias-modal"] tbody tr')).toHaveCount(
      12,
      { timeout: 10_000 },
    )
  })

  test('consejeria solo Ver e Inasistencias sin Asistencia ni Editar', async ({ page }) => {
    await loginAs(page, { code: '1002026602', password: 'Admin123!' })
    await page.getByRole('link', { name: 'Asistencia' }).click()
    await expect(page.getByRole('heading', { name: /Asistencia/i })).toBeVisible({
      timeout: 15_000,
    })
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click({ button: 'right' })
    await expect(page.getByTestId('asistencia-ctx-ver')).toBeVisible()
    await expect(page.getByTestId('asistencia-ctx-inasistencias')).toBeVisible()
    await expect(page.getByTestId('asistencia-ctx-pasar')).toHaveCount(0)
    await expect(page.getByTestId('asistencia-ctx-editar')).toHaveCount(0)
  })
})
