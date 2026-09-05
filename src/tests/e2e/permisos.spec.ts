import { test, expect, loginAs } from './fixtures/auth'

test.describe('permisos UI @critical', () => {
  test('sace visible para admin', async ({ page }) => {
    await loginAs(page)
    await expect(page.getByRole('link', { name: 'Export SACE' })).toBeVisible()
  })

  test('auditoría visible para admin (permiso seed)', async ({ page }) => {
    await loginAs(page)
    await expect(page.getByRole('link', { name: 'Auditoría' })).toBeVisible()
  })

  test('shell no pide elegir rol', async ({ page }) => {
    await loginAs(page)
    await expect(page.getByLabel(/Rol activo/i)).toHaveCount(0)
  })
})
