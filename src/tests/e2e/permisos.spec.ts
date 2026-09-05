import { test, expect, loginAs } from './fixtures/auth'

test.describe('permisos UI @critical', () => {
  test('admin seed: rol activo solo admin desde API', async ({ page }) => {
    await loginAs(page)
    const select = page.getByTestId('active-role-select')
    await expect(select).toHaveValue('admin')
    await expect(select.locator('option')).toHaveCount(1)
  })

  test('sace visible para admin', async ({ page }) => {
    await loginAs(page)
    await expect(page.getByRole('link', { name: 'Export SACE' })).toBeVisible()
  })

  test('auditoría visible para admin (permiso seed)', async ({ page }) => {
    await loginAs(page)
    await expect(page.getByRole('link', { name: 'Auditoría' })).toBeVisible()
  })
})
