import { test, expect, loginAs } from './fixtures/auth'

test.describe('modulos @critical', () => {
  test('configuracion carga para admin', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Configuración' }).click()
    await expect(page).toHaveURL(/configuracion/)
    await expect(page.getByText(/Configuraci|instituci/i).first()).toBeVisible()
  })

  test('usuarios muestra formulario de alta', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Usuarios' }).click()
    await expect(page.getByLabel(/Primer nombre/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('matricula, horarios, pagos, sace navegables', async ({ page }) => {
    await loginAs(page)
    for (const name of ['Matrícula', 'Horarios', 'Pagos', 'Export SACE', 'Estadísticas']) {
      await page.getByRole('link', { name }).click()
      await expect(page.getByRole('heading', { level: 1 }).or(page.locator('.page-title'))).toBeVisible()
    }
  })

  test('auditoria accesible con admin', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Auditoría' }).click()
    await expect(page).toHaveURL(/auditoria/)
  })
})
