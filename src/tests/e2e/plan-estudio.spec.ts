import { test, expect, loginAs } from './fixtures/auth'

test.describe('plan de estudio @critical', () => {
  test('admin ve tabla sin boton crear y puede abrir ver', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Plan de estudio' }).click()
    await expect(
      page.getByRole('heading', { name: /Plan de estudio/i }),
    ).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId('data-table-add-button')).toHaveCount(0)
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click()
    await expect(page.getByRole('heading', { name: 'Ver plan' })).toHaveCount(0)
    await row.dblclick()
    await expect(page.getByRole('heading', { name: 'Ver plan' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId('plan-download-pdf')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).click()
  })

  test('admin audita con click derecho', async ({ page }) => {
    await loginAs(page)
    await page.getByRole('link', { name: 'Plan de estudio' }).click()
    await expect(
      page.getByRole('heading', { name: /Plan de estudio/i }),
    ).toBeVisible({
      timeout: 15_000,
    })
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click({ button: 'right' })
    await expect(page.getByTestId('plan-ctx-menu')).toBeVisible()
    await page.getByTestId('plan-auditar').click()
    await expect(
      page.getByRole('heading', { name: 'Auditar plan' }),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('plan-aprobacion-select')).toBeVisible()
  })

  test('maestro ve sus planes y puede crear', async ({ page }) => {
    await loginAs(page, { code: '1002026501', password: 'Admin123!' })
    await page.goto('/plan-estudio')
    await expect(
      page.getByRole('heading', { name: /Mis planes/i }),
    ).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId('data-table-add-button')).toBeVisible()
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click({ button: 'right' })
    await expect(page.getByRole('button', { name: 'Ver' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Auditoría' })).toBeVisible()

    await page.keyboard.press('Escape')
    await page.getByTestId('data-table-add-button').click()
    await expect(page.getByTestId('plan-create-wizard')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/Institución:/i)).toBeVisible()
    await expect(page.getByText(/Maestro:/i)).toBeVisible()
    const cursoSelect = page.getByTestId('plan-create-curso')
    await expect(cursoSelect).toBeVisible()
    await expect
      .poll(async () => cursoSelect.locator('option').count())
      .toBeGreaterThan(1)
    await cursoSelect.selectOption({ index: 1 })
    await expect(page.getByTestId('plan-create-meta')).toBeVisible({
      timeout: 5_000,
    })
  })

  test('consejeria puede auditar', async ({ page }) => {
    await loginAs(page, { code: '1002026602', password: 'Admin123!' })
    await page.getByRole('link', { name: 'Plan de estudio' }).click()
    await expect(
      page.getByRole('heading', { name: /Plan de estudio/i }),
    ).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId('data-table-add-button')).toHaveCount(0)
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click({ button: 'right' })
    await expect(page.getByTestId('plan-auditar')).toBeVisible()
  })

  test('consejeria ve periodos con nombre y audita desde ver con items en cards', async ({
    page,
  }) => {
    await loginAs(page, { code: '1002026602', password: 'Admin123!' })
    await page.goto('/plan-estudio')
    const row = page.locator('table.data-table tbody tr').first()
    await expect(row).toBeVisible({ timeout: 15_000 })

    const periodo = page.getByLabel('Filtrar por Periodo')
    await expect(periodo.locator('option').nth(1)).not.toHaveText(
      /^[0-9a-f]{8}-/,
    )

    // Solo Español trae objetivo general en el fixture; otras suites crean planes que quedan primero.
    await page.getByTestId('data-table-search').fill('Español')
    const espanol = page
      .locator('table.data-table tbody tr')
      .filter({ hasText: /Español(?! Test)/ })
      .first()
    await expect(espanol).toBeVisible({ timeout: 15_000 })
    await espanol.dblclick()
    await expect(page.getByRole('heading', { name: 'Ver plan' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId('plan-ver-pensum')).toContainText(
      'Objetivo general',
    )
    await expect(
      page.getByTestId('plan-ver-cards').locator('.neon-card-row').first(),
    ).toBeVisible()
    await expect(page.locator('[data-testid^="plan-item-check-"]')).toHaveCount(
      0,
    )
    await page.getByTestId('plan-ver-auditar').click()
    await expect(
      page.getByRole('heading', { name: 'Auditar plan' }),
    ).toBeVisible({ timeout: 10_000 })
    const cards = page.getByTestId('plan-audit-cards')
    await expect(cards.locator('.plan-audit__card').first()).toBeVisible()
    await expect(page.locator('.modal table')).toHaveCount(0)
  })
})
