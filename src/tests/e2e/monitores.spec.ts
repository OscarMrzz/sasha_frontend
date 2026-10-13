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

  test('navega entre bloques con Anterior / Ahora / Siguiente', async ({ page }) => {
    await loginAs(page)
    await page.goto('/monitores')

    const anterior = page.getByTestId('monitor-nav-anterior')
    const ahora = page.getByTestId('monitor-nav-ahora')
    const siguiente = page.getByTestId('monitor-nav-siguiente')

    await expect(anterior).toBeVisible({ timeout: 15_000 })
    await expect(ahora).toBeVisible()
    await expect(siguiente).toBeVisible()

    const consulta = page.getByTestId('monitor-consulta')
    await expect(consulta).toBeVisible({ timeout: 15_000 })
    const inicial = (await consulta.textContent()) ?? ''
    await expect(ahora).toHaveAttribute('aria-pressed', 'true')

    // Al menos un sentido está disponible (el fixture tiene horario activo).
    if (await siguiente.isEnabled()) {
      await siguiente.click()
    } else {
      await anterior.click()
    }

    // La vista deja de ser «ahora» y la fecha/hora consultada cambia.
    await expect(ahora).toHaveAttribute('aria-pressed', 'false')
    await expect(consulta).not.toHaveText(inicial)

    // «Ahora» vuelve al reloj en vivo.
    await ahora.click()
    await expect(ahora).toHaveAttribute('aria-pressed', 'true')
  })

  test('maestro no tiene permiso para Monitores', async ({ page }) => {
    await loginAs(page, { code: '1002026501' })
    await page.goto('/monitores')
    await expect(page.getByText('No tienes permiso')).toBeVisible({ timeout: 15_000 })
  })
})
