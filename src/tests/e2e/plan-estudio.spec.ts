import { test, expect, loginAs } from './fixtures/auth'

test.describe('plan de estudio @critical', () => {
  test('admin ve tabla sin boton crear y puede abrir ver', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Plan de estudio' }).click()
    await expect(page.getByRole('heading', { name: /Plan de estudio/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId('data-table-add-button')).toHaveCount(0)
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click()
    await expect(page.getByRole('heading', { name: 'Ver plan' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('plan-download-pdf')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()
  })

  test('admin audita con click derecho', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Plan de estudio' }).click()
    await expect(page.getByRole('heading', { name: /Plan de estudio/i })).toBeVisible({
      timeout: 15_000,
    })
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click({ button: 'right' })
    await expect(page.getByTestId('plan-ctx-menu')).toBeVisible()
    await page.getByTestId('plan-auditar').click()
    await expect(page.getByRole('heading', { name: 'Auditar plan' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('plan-aprobacion-select')).toBeVisible()
  })

  test('maestro ve sus planes y puede crear', async ({ page }) => {
    await loginAs(page, { code: '1002026501', password: 'Admin123!' })
    await page.getByRole('link', { name: 'Plan de estudio' }).click()
    await expect(page.getByRole('heading', { name: /Mis planes/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId('data-table-add-button')).toBeVisible()
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click({ button: 'right' })
    await expect(page.getByRole('button', { name: 'Ver' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Auditoría' })).toBeVisible()
  })

  test('consejeria puede auditar', async ({ page }) => {
    await loginAs(page, { code: '1002026602', password: 'Admin123!' })
    await page.getByRole('link', { name: 'Plan de estudio' }).click()
    await expect(page.getByRole('heading', { name: /Plan de estudio/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId('data-table-add-button')).toHaveCount(0)
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click({ button: 'right' })
    await expect(page.getByTestId('plan-auditar')).toBeVisible()
  })
})
