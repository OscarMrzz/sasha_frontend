import { test, expect, loginAs } from './fixtures/auth'

test.describe('monitores @critical', () => {
  test('admin ve Monitores con su estado (grid, recreo o sin clase)', async ({ page }) => {
    await loginAs(page)
    await page.goto('/monitores')

    await expect(page.getByRole('heading', { name: 'Monitores' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('monitor-buscar')).toBeVisible()

    const estado = page.locator(
      '[data-testid="monitor-grid"], [data-testid="monitor-recreo"], [data-testid="monitor-sin-clase"], [data-testid="monitor-vacio"]',
    )
    await expect(estado.first()).toBeVisible({ timeout: 15_000 })
  })

  test('maestro no tiene permiso para Monitores', async ({ page }) => {
    await loginAs(page, { code: '1002026501' })
    await page.goto('/monitores')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })
})
